"""Function tools for the voice interview agent.

These are Pipecat Flows function handlers — each receives FlowArgs and a
FlowManager, performs a side-effect (DB write, observation log, etc.), and
returns (result, next_node_or_none).
"""
from __future__ import annotations

import json
import logging
from typing import Any

from pipecat_flows import FlowArgs, FlowManager, FlowResult, FlowsFunctionSchema

from threshold.db.crud import (
    TABLE_MAP,
    get_completion_summary,
    upsert_fields,
)
from threshold.db.database import get_db
from threshold.memory.observation_stream import log_observation as _log_obs
from threshold.services.interview_context import (
    InterviewCache,
    build_interview_prompt_context,
)

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = "default-user"

# Maps LLM-guessed field names to actual DB column names.
# The LLM often abbreviates or rephrases column names — this ensures saves
# land on the correct column regardless of minor naming variation.
FIELD_ALIASES: dict[str, dict[str, str]] = {
    "identity": {
        "name": "first_name",
        "full_name": "legal_name",
        "dob": "date_of_birth",
        "birthday": "date_of_birth",
        "address": "current_address",
        "phone": "phone_number",
        "language": "preferred_language",
        "state": "state_of_release",
        "release_state": "state_of_release",
        "gender": "gender_identity",
    },
    "supervision": {
        "type": "supervision_type",
        "parole_type": "supervision_type",
        "end_date": "supervision_end_date",
        "when_supervision_ends": "supervision_end_date",
        "supervision_ends": "supervision_end_date",
        "parole_end_date": "supervision_end_date",
        "officer_name": "po_name",
        "parole_officer": "po_name",
        "parole_officer_name": "po_name",
        "officer_phone": "po_phone",
        "next_check_in": "next_reporting_date",
        "next_checkin": "next_reporting_date",
        "next_required_check_in_date": "next_reporting_date",
        "next_report_date": "next_reporting_date",
        "check_in_date": "next_reporting_date",
        "curfew_start_time": "curfew_start",
        "curfew_begin": "curfew_start",
        "curfew_end_time": "curfew_end",
        "curfew_ends": "curfew_end",
        "drug_testing": "drug_testing_required",
        "drug_test": "drug_testing_required",
        "ankle_monitor": "electronic_monitoring",
        "monitor": "electronic_monitoring",
        "travel_restrictions": "geographic_restrictions",
        "treatment_required": "mandatory_treatment",
        "restitution": "restitution_owed",
    },
    "housing": {
        "status": "housing_status",
        "living_with": "returning_to_housing_with",
        "who_living_with": "returning_to_housing_with",
        "roommates": "returning_to_housing_with",
        "sex_offender": "sex_offender_registry",
        "evictions": "eviction_history",
        "prior_evictions": "eviction_history",
    },
    "employment": {
        "status": "employment_status",
        "employment": "employment_status",
        "current_employment_status": "employment_status",
        "working": "employment_status",
        "drivers_license": "has_valid_drivers_license",
        "valid_driver_license": "has_valid_drivers_license",
        "license": "has_valid_drivers_license",
        "ged": "has_ged_or_diploma",
        "diploma": "has_ged_or_diploma",
        "education": "has_ged_or_diploma",
        "college": "college_completed",
        "skills": "trade_skills",
        "certs": "certifications",
        "felony": "felony_category",
        "offense": "felony_category",
    },
    "health": {
        "medications": "current_medications",
        "meds": "current_medications",
        "conditions": "chronic_conditions",
        "disability": "disability_status",
        "medicaid": "has_active_medicaid",
        "medicaid_active": "has_active_medicaid",
        "insurance": "has_active_medicaid",
        "mental_health": "mental_health_diagnoses",
        "substance_use": "substance_use_disorder_diagnosis",
        "sud": "substance_use_disorder_diagnosis",
        "insurance_lapsed": "insurance_gap",
    },
    "benefits": {
        "benefits": "benefits_enrolled",
        "enrolled": "benefits_enrolled",
        "snap": "benefits_enrolled",
        "child_support": "child_support_obligations",
        "veteran": "veteran_status",
        "vet": "veteran_status",
    },
    "goals": {
        "short_goals": "short_term_goals",
        "near_term_goals": "short_term_goals",
        "immediate_goals": "short_term_goals",
        "long_goals": "long_term_goals",
        "future_goals": "long_term_goals",
        "priorities": "values",
        "what_matters": "values",
        "worries": "concerns",
        "fears": "concerns",
        "anxieties": "concerns",
        "skills": "strengths",
        "abilities": "strengths",
    },
    "support": {
        "case_worker": "has_case_worker",
        "caseworker": "has_case_worker",
        "case_manager": "has_case_worker",
        "case_worker_contact": "case_worker_name",
        "trusted_contacts": "trusted_people",
        "support_network": "support_contacts",
        "contacts": "support_contacts",
    },
}

# Per-session in-memory cache, initialised in the pipeline and shared with
# interview_flow via get_cache() / set_cache().
_interview_cache: InterviewCache | None = None


def get_cache() -> InterviewCache | None:
    return _interview_cache


def set_cache(cache: InterviewCache | None) -> None:
    global _interview_cache
    _interview_cache = cache

# ---------------------------------------------------------------------------
# Observation categories matching info_collection.md long-term memory sections
# ---------------------------------------------------------------------------
VALID_CATEGORIES = {
    "personality",
    "attitude",
    "family",
    "trauma",
    "substance_use",
    "goals",
    "strengths",
    "values",
    "concerns",
    "general",
}

# ---------------------------------------------------------------------------
# Event broadcaster — set by the pipeline to push real-time events to frontend
# ---------------------------------------------------------------------------
_event_callback: Any = None


def set_event_callback(callback):
    """Register a callback for broadcasting events to the frontend."""
    global _event_callback
    _event_callback = callback


async def _broadcast(event_type: str, data: dict):
    if _event_callback:
        try:
            await _event_callback(event_type, data)
        except Exception:
            logger.debug("Event broadcast failed for %s", event_type)


# ---------------------------------------------------------------------------
# save_field
# ---------------------------------------------------------------------------

def _normalize_field(section: str, field: str) -> str:
    """Resolve LLM-guessed field names to actual DB column names."""
    aliases = FIELD_ALIASES.get(section, {})
    canonical = aliases.get(field, field)
    if canonical != field:
        logger.warning("[interview] alias: %s.%s → %s.%s", section, field, section, canonical)
    return canonical


async def handle_save_field(
    args: FlowArgs, flow_manager: FlowManager
) -> tuple[FlowResult, None]:
    """Persist a structured field to the DB and update the in-memory cache."""
    section = args["section"]
    field = _normalize_field(section, args["field"])
    value = args["value"]

    # Coerce string representations back to native types
    if isinstance(value, str):
        low = value.strip().lower()
        if low in ("true", "yes"):
            value = True
        elif low in ("false", "no"):
            value = False
        elif "," in value:
            value = [v.strip() for v in value.split(",") if v.strip()]

    if section not in TABLE_MAP:
        return {"error": f"Unknown section: {section}"}, None

    # Write to DB
    db = get_db()
    try:
        upsert_fields(db, DEFAULT_USER_ID, section, {field: value})
    finally:
        db.close()

    # Update cache and compute completion from it (no extra DB round-trip)
    cache = get_cache()
    if cache and cache.loaded:
        cache.update_field(section, field, value)
        pct = cache.get_completion_summary()["overall_pct"]
    else:
        db = get_db()
        try:
            summary = get_completion_summary(db, DEFAULT_USER_ID)
            pct = summary["overall_pct"]
        finally:
            db.close()

    logger.warning("[interview] SAVED %s.%s = %s (%.0f%% complete)", section, field, value, pct)

    await _broadcast("field_saved", {
        "section": section,
        "field": field,
        "value": value if not isinstance(value, (list, dict)) else json.dumps(value),
        "completion_pct": pct,
    })

    flow_manager.state.setdefault("fields_saved", []).append(
        {"section": section, "field": field, "value": value}
    )

    return {"status": "saved", "field": f"{section}.{field}", "completion_pct": pct}, None


save_field_schema = FlowsFunctionSchema(
    name="save_field",
    description=(
        "Save a profile field. Use the EXACT field names below.\n"
        "identity: first_name, last_name, legal_name, date_of_birth, current_address, "
        "phone_number, gender_identity, state_of_release, preferred_language\n"
        "supervision: supervision_type, supervision_end_date, po_name, po_phone, "
        "next_reporting_date, reporting_frequency, curfew_start, curfew_end, "
        "drug_testing_required, electronic_monitoring, geographic_restrictions, "
        "mandatory_treatment, restitution_owed\n"
        "housing: housing_status, returning_to_housing_with, sex_offender_registry, "
        "eviction_history\n"
        "employment: employment_status, has_valid_drivers_license, has_ged_or_diploma, "
        "trade_skills, certifications, felony_category\n"
        "health: current_medications, has_active_medicaid, chronic_conditions, "
        "disability_status, substance_use_disorder_diagnosis, insurance_gap\n"
        "benefits: benefits_enrolled, child_support_obligations, veteran_status\n"
        "goals: short_term_goals, long_term_goals, values, strengths, concerns\n"
        "support: has_case_worker, case_worker_name, trusted_people, support_contacts"
    ),
    properties={
        "section": {
            "type": "string",
            "enum": list(TABLE_MAP.keys()),
            "description": "Schema section",
        },
        "field": {
            "type": "string",
            "description": "Exact column name from the list above",
        },
        "value": {
            "type": "string",
            "description": "The value. Booleans: 'true'/'false'. Lists: comma-separated.",
        },
    },
    required=["section", "field", "value"],
    handler=handle_save_field,
)


# ---------------------------------------------------------------------------
# log_observation
# ---------------------------------------------------------------------------

async def handle_log_observation(
    args: FlowArgs, flow_manager: FlowManager
) -> tuple[FlowResult, None]:
    """Log a qualitative observation about the person to the memory stream."""
    category = args["category"]
    content = args["content"]

    if category not in VALID_CATEGORIES:
        category = "general"

    _log_obs(
        agent="voice_interview",
        event_type="reflection",
        content=f"[{category}] {content}",
        tags=["voice_interview", category],
    )

    logger.warning("[interview] OBSERVATION [%s]: %s", category, content[:120])

    await _broadcast("observation_logged", {"category": category})

    flow_manager.state.setdefault("observations", []).append(
        {"category": category, "content": content}
    )

    return {"status": "logged", "category": category}, None


log_observation_schema = FlowsFunctionSchema(
    name="log_observation",
    description=(
        "Record a qualitative observation about the person — personality traits, "
        "emotional reactions, attitude, family dynamics, goals, strengths, or "
        "anything that helps understand them as a person. These notes build the "
        "long-term memory that makes future interactions more effective."
    ),
    properties={
        "category": {
            "type": "string",
            "enum": sorted(VALID_CATEGORIES),
            "description": "Observation category",
        },
        "content": {
            "type": "string",
            "description": (
                "The observation in natural language. Be specific and behavioral: "
                "'Got quiet when medications came up — seems worried about insurance gap' "
                "rather than 'seems anxious'."
            ),
        },
    },
    required=["category", "content"],
    handler=handle_log_observation,
)


# ---------------------------------------------------------------------------
# mark_needs_help
# ---------------------------------------------------------------------------

async def handle_mark_needs_help(
    args: FlowArgs, flow_manager: FlowManager
) -> tuple[FlowResult, None]:
    """Mark a field the person doesn't know and needs help finding."""
    section = args["section"]
    field = _normalize_field(section, args["field"])
    reason = args.get("reason", "User doesn't know this information")

    if section not in TABLE_MAP:
        return {"error": f"Unknown section: {section}"}, None

    db = get_db()
    try:
        upsert_fields(db, DEFAULT_USER_ID, section, {field: "__needs_help"})
    finally:
        db.close()

    _log_obs(
        agent="voice_interview",
        event_type="reflection",
        content=f"[needs_help] {section}.{field}: {reason}",
        tags=["voice_interview", "needs_help"],
    )

    logger.warning("[interview] NEEDS_HELP %s.%s — %s", section, field, reason)

    await _broadcast("field_saved", {
        "section": section,
        "field": field,
        "value": "__needs_help",
    })

    flow_manager.state.setdefault("needs_help", []).append(
        {"section": section, "field": field, "reason": reason}
    )

    return {"status": "marked_needs_help", "field": f"{section}.{field}"}, None


mark_needs_help_schema = FlowsFunctionSchema(
    name="mark_needs_help",
    description=(
        "Mark a field the person GENUINELY doesn't know and needs help "
        "finding out — e.g. 'I don't know my PO's number' or 'I'm not "
        "sure what my supervision end date is.' This triggers proactive "
        "follow-up from the system.\n\n"
        "IMPORTANT: Do NOT use this when the person gives a clear answer. "
        "If they say 'no' or 'I don't have that,' save the answer:\n"
        "  - 'No' to drug testing → save_field(value='false')\n"
        "  - 'I don't take any medications' → save_field(value='none')\n"
        "  - 'No restitution' → save_field(value='false')\n"
        "Only use mark_needs_help when they are unsure and want help "
        "finding the information."
    ),
    properties={
        "section": {
            "type": "string",
            "enum": list(TABLE_MAP.keys()),
        },
        "field": {
            "type": "string",
            "description": "The field they don't know",
        },
        "reason": {
            "type": "string",
            "description": "Why they don't know (e.g., 'told verbally at release but didn't write it down')",
        },
    },
    required=["section", "field"],
    handler=handle_mark_needs_help,
)


# ---------------------------------------------------------------------------
# get_interview_context
# ---------------------------------------------------------------------------

async def handle_get_context(
    args: FlowArgs, flow_manager: FlowManager
) -> tuple[FlowResult, None]:
    """Refresh the current intake status — what's filled, what's missing."""
    db = get_db()
    try:
        ctx = build_interview_prompt_context(db, DEFAULT_USER_ID)
    finally:
        db.close()

    return {"context": ctx}, None


get_context_schema = FlowsFunctionSchema(
    name="get_interview_context",
    description=(
        "Check what profile fields are populated and what's still missing. "
        "Call this when you need to decide what to ask about next or want "
        "to verify what's left before wrapping up a phase."
    ),
    properties={},
    required=[],
    handler=handle_get_context,
)


# ---------------------------------------------------------------------------
# adjust_voice
# ---------------------------------------------------------------------------

async def handle_adjust_voice(
    args: FlowArgs, flow_manager: FlowManager
) -> tuple[FlowResult, None]:
    """Adjust TTS voice parameters for emotional adaptation."""
    from pipecat.frames.frames import TTSUpdateSettingsFrame
    from pipecat.services.elevenlabs.tts import ElevenLabsTTSSettings

    speed = args.get("speed", 1.0)
    warmth = args.get("warmth", 0.7)

    # Map warmth to ElevenLabs params: higher warmth = higher stability, lower similarity_boost
    stability = min(1.0, 0.5 + warmth * 0.4)
    similarity_boost = max(0.3, 0.8 - warmth * 0.3)

    settings = ElevenLabsTTSSettings(
        speed=max(0.7, min(1.2, speed)),
        stability=stability,
        similarity_boost=similarity_boost,
    )

    task = flow_manager._task
    await task.queue_frame(TTSUpdateSettingsFrame(delta=settings))

    logger.info("[interview] voice adjusted: speed=%.1f warmth=%.1f", speed, warmth)
    return {"status": "adjusted", "speed": speed, "warmth": warmth}, None


adjust_voice_schema = FlowsFunctionSchema(
    name="adjust_voice",
    description=(
        "Adjust the speaking voice to match the emotional tone needed. "
        "Lower speed and higher warmth for sensitive topics or when the "
        "person seems uncomfortable. Normal speed for routine questions."
    ),
    properties={
        "speed": {
            "type": "number",
            "description": "Speech rate 0.7 (slow/careful) to 1.2 (normal). Default 1.0",
        },
        "warmth": {
            "type": "number",
            "description": "Voice warmth 0.0 (neutral) to 1.0 (very warm). Default 0.7",
        },
    },
    required=[],
    handler=handle_adjust_voice,
)


# ---------------------------------------------------------------------------
# crisis_response
# ---------------------------------------------------------------------------

async def handle_crisis(
    args: FlowArgs, flow_manager: FlowManager
) -> tuple[FlowResult, None]:
    """Immediate crisis intervention — non-negotiable."""
    crisis_text = (
        "I hear you, and I want you to know that what you're feeling matters. "
        "Please reach out to one of these resources right now:\n\n"
        "988 Suicide & Crisis Lifeline: call or text 988 (available 24/7)\n"
        "Crisis Text Line: text HOME to 741741\n"
        "National Domestic Violence Hotline: 1-800-799-7233\n\n"
        "You don't have to go through this alone. Is there someone you trust "
        "that I can help you reach out to?"
    )

    _log_obs(
        agent="voice_interview",
        event_type="reflection",
        content="[CRISIS] Crisis response triggered during voice interview",
        importance=1.0,
        tags=["voice_interview", "crisis"],
    )

    return {"crisis_response": crisis_text}, None


crisis_schema = FlowsFunctionSchema(
    name="crisis_response",
    description=(
        "IMMEDIATE crisis intervention. Call this if the person expresses "
        "suicidal ideation, self-harm, or acute emotional crisis. Do NOT "
        "delegate, do NOT continue the interview. Call this FIRST."
    ),
    properties={},
    required=[],
    handler=handle_crisis,
    cancel_on_interruption=False,
)


# ---------------------------------------------------------------------------
# All tool schemas for convenience
# ---------------------------------------------------------------------------

ALL_INTERVIEW_TOOLS = [
    save_field_schema,
    log_observation_schema,
    mark_needs_help_schema,
    get_context_schema,
    adjust_voice_schema,
    crisis_schema,
]
