"""MI-grounded interview phase definitions using Pipecat Flows.

Each phase is generated dynamically at transition time by a factory function
that queries the DB for current profile state. This ensures the LLM always
has accurate context about what's already known and what's still missing.
"""
from __future__ import annotations

import logging
from typing import Any

from pipecat_flows import FlowArgs, FlowManager, FlowResult, FlowsFunctionSchema, NodeConfig

from threshold.db.database import get_db
from threshold.services.interview_context import InterviewCache, build_interview_prompt_context

from .interview_tools import (
    ALL_INTERVIEW_TOOLS,
    DEFAULT_USER_ID,
    crisis_schema,
    get_cache,
    log_observation_schema,
    save_field_schema,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Phase registry
# ---------------------------------------------------------------------------

PHASE_ORDER = [
    "welcome",
    "identity_situation",
    "employment_education",
    "health_benefits",
    "goals_wrap_up",
    "complete",
]


def _get_next_phase(current: str) -> str | None:
    try:
        idx = PHASE_ORDER.index(current)
        return PHASE_ORDER[idx + 1] if idx + 1 < len(PHASE_ORDER) else None
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Shared MI role message
# ---------------------------------------------------------------------------

MI_ROLE_MESSAGE = """\
You are Alex — a warm, experienced re-entry case worker at a program \
called Threshold. You're having a voice conversation with someone who \
recently came home from incarceration. This is their intake — you're \
getting to know them so the program can help with housing, jobs, \
benefits, legal stuff, whatever they need.

You've been doing this work for years. You genuinely care about the \
people you talk to. You're not reading from a script — you're having \
a real conversation. You sound like a person: relaxed, direct, warm. \
You use natural filler sometimes. You respond to what people actually \
say, not just what's on your list.

The person you're talking to might be nervous, exhausted, guarded, \
or totally matter-of-fact. Some people haven't had anyone sit down \
and actually listen to them in a long time. Don't assume how they \
feel — just be present and pay attention.

YOUR CONVERSATION STYLE:
- Keep your responses SHORT. One to three sentences, max. This is \
a voice conversation — long paragraphs are exhausting to listen to.
- After acknowledging what someone says, ask your next question \
naturally. Don't recap what they just told you at length.
- Sound like a real person talking. Use contractions. Say "yeah" and \
"got it" and "okay cool." Don't sound like a formal letter.
- Match their energy. If they're giving short answers, keep your \
questions simple. If they open up, lean in a little.

WHAT YOU'RE DOING:
You're moving through a few topics to build their profile:
1. Getting their name and saying hi
2. Their living situation and any supervision requirements
3. Work history and skills
4. Health and benefits
5. Their goals and what matters to them — this is the heart of it

For topics 1 through 4, keep things moving. Ask a question, \
acknowledge the answer briefly, save it, move on. Don't linger. \
For topic 5, slow down and really listen.

TOOLS YOU HAVE (use them silently — never mention them out loud):
- save_field(section, field, value) — save what they tell you. Call \
this as soon as you hear useful info. You can make multiple calls at once. \
If they say "no" to a yes/no question, save it as 'false'. \
If they say "none," save it as 'none'. Every answer is worth saving.
- mark_needs_help(section, field, reason) — ONLY use this when the \
person genuinely doesn't know and wants help finding out. "No" or \
"I don't have that" is NOT needs-help — that's a save_field(value='false').
- log_observation(category, content) — note anything about who they \
are beyond the checkbox data: how they react, what they care about, \
personality, attitude, family dynamics, frustrations, humor. Use this \
throughout the conversation, not just at the end. Categories: goals, \
strengths, values, concerns, personality, attitude, family, trauma, \
substance_use, general.
- advance_phase() — move to the next topic when you've covered what \
the current phase asks for. Just call it — don't announce that you're \
"moving on." Don't skip this — it refreshes your instructions.

CRITICAL RULES:
- Your text becomes speech. Never use markdown, bullet points, \
numbered lists, asterisks, or special formatting. Just talk naturally.
- NEVER say tool or function names out loud. The person should never \
hear "save field" or "advance phase" or anything like that. Tools \
are invisible to them.
- If someone expresses suicidal thoughts, self-harm, or immediate \
danger, call crisis_response() right away. Nothing else matters.
- Never lecture, condescend, or give unsolicited advice. You're here \
to listen and help, not to teach.\
"""


# ---------------------------------------------------------------------------
# advance_phase — the transition function
# ---------------------------------------------------------------------------

async def handle_advance_phase(
    args: FlowArgs, flow_manager: FlowManager
) -> tuple[FlowResult, NodeConfig]:
    """Transition to the next interview phase."""
    current = flow_manager.state.get("current_phase", "welcome")
    requested = args.get("next_phase")
    engagement = flow_manager.state.get("engagement_score", 0.7)

    if requested and requested in PHASE_ORDER:
        next_phase = requested
    else:
        next_phase = _get_next_phase(current)

    from .shared_state import set_phase as _set_shared_phase

    if next_phase is None or next_phase == "complete":
        _set_shared_phase("complete")
        return {"status": "interview_complete"}, create_complete_phase()

    flow_manager.state["current_phase"] = next_phase
    _set_shared_phase(next_phase)
    node = PHASE_FACTORIES[next_phase](engagement)

    logger.warning("[interview] PHASE TRANSITION: %s -> %s (engagement=%.2f)",
                   current, next_phase, engagement)

    from .interview_tools import _broadcast
    import asyncio
    asyncio.ensure_future(_broadcast("phase_changed", {"phase": next_phase}))

    return {"status": "advanced", "phase": next_phase}, node


advance_phase_schema = FlowsFunctionSchema(
    name="advance_phase",
    description=(
        "Move to the next topic. Call this when you've covered the key "
        "points for the current phase. No need to summarize — just "
        "transition naturally. You can optionally specify a phase to "
        "skip to if something isn't relevant."
    ),
    properties={
        "next_phase": {
            "type": "string",
            "enum": PHASE_ORDER,
            "description": "Phase to advance to. Omit to go to the next in sequence.",
        },
    },
    required=[],
    handler=handle_advance_phase,
)


def _all_tools():
    return ALL_INTERVIEW_TOOLS + [advance_phase_schema]


# ---------------------------------------------------------------------------
# Context helper
# ---------------------------------------------------------------------------

def _get_interview_context() -> str:
    cache = get_cache()
    db = get_db()
    try:
        return build_interview_prompt_context(db, DEFAULT_USER_ID, cache=cache)
    finally:
        db.close()


def _missing_fields(section: str, fields: list[str]) -> list[str]:
    """Return only the field names from *fields* that are not yet populated."""
    cache = get_cache()
    if not cache or not cache.loaded:
        return fields
    section_data = cache._profile.get(section, {})
    missing = []
    for f in fields:
        val = section_data.get(f)
        if val is None or val == "" or val == "[]" or val == "__needs_help":
            missing.append(f)
        elif isinstance(val, list) and len(val) == 0:
            missing.append(f)
    return missing


def _pace_instruction(engagement: float) -> str:
    if engagement < 0.4:
        return (
            "\n\nENGAGEMENT IS LOW. The person may be shutting down. "
            "Slow way down. Acknowledge that this is a lot. Offer a break: "
            "'We've covered a lot — want to take a minute, or keep going?' "
            "Affirm something genuine before asking anything else. Consider "
            "calling adjust_voice(speed=0.8, warmth=1.0) to speak more gently."
        )
    if engagement < 0.6:
        return (
            "\n\nEngagement is dipping. Keep questions lighter. Affirm more. "
            "If they gave short answers on the last few questions, try a "
            "different angle or offer to skip."
        )
    return ""


# ---------------------------------------------------------------------------
# Phase factories
# ---------------------------------------------------------------------------

def create_welcome_phase(engagement: float = 0.7) -> NodeConfig:
    ctx = _get_interview_context()

    # Check if we already have a name from OCR / seed data
    cache = get_cache()
    known_name = None
    if cache and cache.loaded:
        profile = cache._profile
        identity = profile.get("identity", {})
        known_name = identity.get("first_name")
        if not known_name:
            legal = identity.get("legal_name")
            if legal:
                known_name = legal.split()[0]

    if known_name:
        task = (
            "CURRENT PHASE: Welcome.\n\n"
            f"{ctx}\n\n"
            f"We already know their name is {known_name}. Greet them by "
            "first name — introduce yourself as Alex, say you'll be "
            "walking through a quick intake to figure out how to help, "
            "about ten minutes, they can skip anything. Keep it to 2-3 "
            "sentences. Then wait for their response. Once they confirm, "
            "call advance_phase()."
        )
    else:
        task = (
            "CURRENT PHASE: Welcome.\n\n"
            f"{ctx}\n\n"
            "Introduce yourself as Alex. Say you'll be walking through "
            "a quick intake, about ten minutes, they can skip anything. "
            "Then ask what they'd like to be called. When they give you "
            "their name, save it:\n"
            "  save_field(section='identity', field='first_name', value='...')\n"
            "Then acknowledge it warmly in one sentence and call "
            "advance_phase().\n\n"
            "Keep it to 2-3 turns max. Be natural and friendly."
        )

    return {
        "name": "welcome",
        "role_message": MI_ROLE_MESSAGE,
        "task_messages": [{"role": "system", "content": task}],
        "functions": _all_tools(),
        "respond_immediately": True,
    }


_HOUSING_FIELDS = {
    "housing_status": ("housing_status", "shelter|stable|unhoused|transitional|family|friends"),
}
_SUPERVISION_FIELDS = {
    "supervision_type": ("supervision_type", "parole|probation|supervised_release|none"),
    "supervision_end_date": ("supervision_end_date", "YYYY-MM-DD"),
    "po_name": ("po_name", "officer's name"),
    "next_reporting_date": ("next_reporting_date", "YYYY-MM-DD"),
    "reporting_frequency": ("reporting_frequency", "weekly|biweekly|monthly"),
    "curfew_start": ("curfew_start", "HH:MM"),
    "curfew_end": ("curfew_end", "HH:MM"),
    "drug_testing_required": ("drug_testing_required", "true|false"),
    "electronic_monitoring": ("electronic_monitoring", "true|false"),
}


def create_identity_situation_phase(engagement: float = 0.7) -> NodeConfig:
    ctx = _get_interview_context()

    housing_missing = _missing_fields("housing", list(_HOUSING_FIELDS.keys()))
    sup_missing = _missing_fields("supervision", list(_SUPERVISION_FIELDS.keys()))

    lines = []
    if housing_missing:
        lines.append("Housing (still needed):")
        for f in housing_missing:
            col, hint = _HOUSING_FIELDS[f]
            lines.append(f"  save_field(section='housing', field='{col}', value='{hint}')")
    if sup_missing:
        lines.append("\nSupervision (still needed):")
        for f in sup_missing:
            col, hint = _SUPERVISION_FIELDS[f]
            lines.append(f"  save_field(section='supervision', field='{col}', value='{hint}')")

    if not housing_missing and not sup_missing:
        field_block = (
            "All housing and supervision fields are already filled. "
            "Confirm nothing needs correcting, then call advance_phase()."
        )
    else:
        field_block = "\n".join(lines)

    return {
        "name": "identity_situation",
        "role_message": MI_ROLE_MESSAGE,
        "task_messages": [{
            "role": "system",
            "content": (
                "CURRENT PHASE: Living situation and supervision.\n\n"
                f"{ctx}\n\n"
                f"{field_block}\n\n"
                "Ask one thing at a time, save what they tell you, keep "
                "it conversational. Use log_observation() for anything "
                "interesting that doesn't fit a field — their mood, "
                "frustrations, how they talk about their situation.\n\n"
                "IMPORTANT: When you've covered the fields listed above, "
                "call advance_phase() IMMEDIATELY. Do not keep asking "
                "questions from other topics — the next phase will handle "
                "those."
                f"{_pace_instruction(engagement)}"
            ),
        }],
        "functions": _all_tools(),
    }


_EMPLOYMENT_FIELDS = {
    "employment_status": ("employment_status", "employed|actively_looking|not_looking|unable"),
    "trade_skills": ("trade_skills", "carpentry,welding,..."),
    "certifications": ("certifications", "CDL,HVAC,..."),
    "has_ged_or_diploma": ("has_ged_or_diploma", "true|false"),
    "has_valid_drivers_license": ("has_valid_drivers_license", "true|false"),
}


def create_employment_education_phase(engagement: float = 0.7) -> NodeConfig:
    ctx = _get_interview_context()

    emp_missing = _missing_fields("employment", list(_EMPLOYMENT_FIELDS.keys()))

    if not emp_missing:
        field_block = (
            "All employment fields are already filled. Confirm nothing "
            "needs correcting, then call advance_phase()."
        )
    else:
        lines = ["Employment (still needed):"]
        for f in emp_missing:
            col, hint = _EMPLOYMENT_FIELDS[f]
            lines.append(f"  save_field(section='employment', field='{col}', value='{hint}')")
        field_block = "\n".join(lines)

    return {
        "name": "employment_education",
        "role_message": MI_ROLE_MESSAGE,
        "task_messages": [{
            "role": "system",
            "content": (
                "CURRENT PHASE: Work and skills.\n\n"
                f"{ctx}\n\n"
                f"{field_block}\n\n"
                "Keep it moving — one question, brief response, next "
                "question. Use log_observation() for anything notable — "
                "frustrations with job search, confidence level, skills "
                "they're proud of.\n\n"
                "IMPORTANT: When you've covered the fields above, call "
                "advance_phase() IMMEDIATELY. Don't drift into health or "
                "benefits questions — the next phase handles those."
                f"{_pace_instruction(engagement)}"
            ),
        }],
        "functions": _all_tools(),
    }


_HEALTH_FIELDS = {
    "current_medications": ("current_medications", "med1,med2,... or 'none'"),
    "has_active_medicaid": ("has_active_medicaid", "true|false"),
    "insurance_gap": ("insurance_gap", "true|false"),
}
_BENEFITS_FIELDS = {
    "benefits_enrolled": ("benefits_enrolled", "SNAP,SSI,... or 'none'"),
}


def create_health_benefits_phase(engagement: float = 0.7) -> NodeConfig:
    ctx = _get_interview_context()

    health_missing = _missing_fields("health", list(_HEALTH_FIELDS.keys()))
    ben_missing = _missing_fields("benefits", list(_BENEFITS_FIELDS.keys()))

    lines = []
    if health_missing:
        lines.append("Health (still needed):")
        for f in health_missing:
            col, hint = _HEALTH_FIELDS[f]
            lines.append(f"  save_field(section='health', field='{col}', value='{hint}')")
    if ben_missing:
        lines.append("\nBenefits (still needed):")
        for f in ben_missing:
            col, hint = _BENEFITS_FIELDS[f]
            lines.append(f"  save_field(section='benefits', field='{col}', value='{hint}')")

    if not health_missing and not ben_missing:
        field_block = (
            "All health and benefits fields are already filled. "
            "Confirm nothing needs correcting, then call advance_phase()."
        )
    else:
        field_block = "\n".join(lines)

    return {
        "name": "health_benefits",
        "role_message": MI_ROLE_MESSAGE,
        "task_messages": [{
            "role": "system",
            "content": (
                "CURRENT PHASE: Health and benefits.\n\n"
                f"{ctx}\n\n"
                f"{field_block}\n\n"
                "This can be sensitive territory. If they seem "
                "uncomfortable with anything — mental health, substance "
                "use, disability — just say 'totally fine to skip that' "
                "and move on. No pressure. Use log_observation() to note "
                "reactions — e.g. 'Got quiet when medications came up.'\n\n"
                "IMPORTANT: When you've covered the fields above, call "
                "advance_phase() IMMEDIATELY."
                f"{_pace_instruction(engagement)}"
            ),
        }],
        "functions": _all_tools(),
    }


_GOALS_FIELDS = {
    "short_term_goals": ("short_term_goals", "housing,job,..."),
    "long_term_goals": ("long_term_goals", "own business,..."),
    "values": ("values", "family,independence,..."),
    "strengths": ("strengths", "persistence,mechanical skills,..."),
    "concerns": ("concerns", "housing deadline,money,..."),
}
_SUPPORT_FIELDS = {
    "trusted_people": ("trusted_people", "sister Maria,friend James,..."),
    "has_case_worker": ("has_case_worker", "true|false"),
    "case_worker_name": ("case_worker_name", "name"),
}


def create_goals_wrapup_phase(engagement: float = 0.7) -> NodeConfig:
    ctx = _get_interview_context()

    goals_missing = _missing_fields("goals", list(_GOALS_FIELDS.keys()))
    support_missing = _missing_fields("support", list(_SUPPORT_FIELDS.keys()))

    lines = []
    if goals_missing:
        lines.append("Goals (still needed):")
        for f in goals_missing:
            col, hint = _GOALS_FIELDS[f]
            lines.append(f"  save_field(section='goals', field='{col}', value='{hint}')")
    if support_missing:
        lines.append("\nSupport network (still needed):")
        for f in support_missing:
            col, hint = _SUPPORT_FIELDS[f]
            lines.append(f"  save_field(section='support', field='{col}', value='{hint}')")

    if goals_missing or support_missing:
        field_block = "\n".join(lines)
    else:
        field_block = "All goals and support fields are already filled."

    return {
        "name": "goals_wrap_up",
        "role_message": MI_ROLE_MESSAGE,
        "task_messages": [{
            "role": "system",
            "content": (
                "CURRENT PHASE: Goals and what matters to them.\n\n"
                f"{ctx}\n\n"
                "The checkbox stuff is done. This is the part that "
                "actually matters — understanding who this person is, "
                "not just their situation.\n\n"
                "Slow down. Your responses can be a little longer here. "
                "Reflect back what they say — not just the facts, but "
                "what it seems like it means to them. \n\n"
                "Ask 3-4 of these (pick what feels right based on the "
                "conversation so far):\n"
                "- What does a good day look like for you six months from now?\n"
                "- What's weighing on you the most right now?\n"
                "- Is there someone in your life who's been in your corner?\n"
                "- What's something you're good at that people might not know?\n"
                "- What kept you going when things were hardest?\n"
                "- If you could change one thing tomorrow, what would it be?\n\n"
                f"SAVE STRUCTURED DATA as you go:\n\n{field_block}\n\n"
                "ALSO use log_observation() for deeper qualitative notes — "
                "tag things as goals, strengths, values, personality, family, "
                "or concerns. These build the long-term memory.\n\n"
                "When you've had a real conversation and it feels like a "
                "natural close, call advance_phase()."
                f"{_pace_instruction(engagement)}"
            ),
        }],
        "functions": _all_tools(),
    }


def create_complete_phase() -> NodeConfig:
    ctx = _get_interview_context()

    return {
        "name": "complete",
        "role_message": MI_ROLE_MESSAGE,
        "task_messages": [{
            "role": "system",
            "content": (
                "CURRENT PHASE: Wrapping up.\n\n"
                f"{ctx}\n\n"
                "You're wrapping up. In 3-4 sentences:\n"
                "- Reference something specific they told you — a goal, "
                "a strength, something that stuck with you. Be genuine.\n"
                "- Let them know their profile is set up and you'll be "
                "working on their priorities.\n"
                "- Tell them they can come back anytime.\n\n"
                "Sound like you mean it. Don't be generic.\n\n"
                "If they share anything meaningful in this closing moment, "
                "save it with save_field() or log_observation() before "
                "the conversation ends."
            ),
        }],
        "functions": [save_field_schema, log_observation_schema, crisis_schema],
        "post_actions": [{"type": "end_conversation"}],
    }


# ---------------------------------------------------------------------------
# Factory registry
# ---------------------------------------------------------------------------

PHASE_FACTORIES: dict[str, Any] = {
    "welcome": create_welcome_phase,
    "identity_situation": create_identity_situation_phase,
    "employment_education": create_employment_education_phase,
    "health_benefits": create_health_benefits_phase,
    "goals_wrap_up": create_goals_wrapup_phase,
    "complete": lambda _eng=0.7: create_complete_phase(),
}
