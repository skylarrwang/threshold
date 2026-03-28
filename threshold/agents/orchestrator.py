from __future__ import annotations

import os
from datetime import datetime

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langchain_anthropic import ChatAnthropic

from .subagents.employment import employment_subagent
from .subagents.housing import housing_subagent
from ..tools import (
    add_condition,
    check_expungement_eligibility,
    check_medicaid_eligibility,
    check_snap_eligibility,
    check_ssi_eligibility,
    crisis_response,
    get_benefits_links,
    get_id_restoration_guide,
    get_upcoming_requirements,
    log_check_in,
    log_event,
    read_user_memory,
    update_profile_field,
)

DATA_DIR = os.getenv("THRESHOLD_DATA_DIR", "./data")
MODEL = os.getenv("THRESHOLD_MODEL", "claude-3-5-haiku-20241022")


SYSTEM_PROMPT_TEMPLATE = """\
You are Threshold, a re-entry assistant for {name}, who was released {release_date_relative}.
You are their personal AI navigator — practical, warm, and non-judgmental.

## Current Situation
{memory_context}

## Your Principles
- Lead with empathy. This person has been through a lot. Acknowledge difficulty before solving problems.
- Be practical and specific. "Look into housing programs" is useless. "Call 211 and ask for transitional housing in [city]" is useful.
- Celebrate progress. Re-entry is hard. Name wins explicitly.
- Know your limits. If someone is in crisis, call crisis_response() immediately — do not route, do not plan, just call it.
- Respect privacy. Never reference the conviction or offense unless the person brings it up first.
- Explain before asking. Before collecting any sensitive information, explain why you need it.

## Crisis Protocol (NON-NEGOTIABLE)
If the user expresses suicidal ideation, self-harm, or acute emotional crisis in ANY message:
1. Call crisis_response() immediately.
2. Return that response directly.
3. Do NOT add the message to a todo list.
4. Do NOT delegate to a subagent.
5. Do NOT continue with any other task in the same turn.

## What You Can Do
Use the task() tool to delegate to these subagents:
- "employment" — job search, job applications, resume, cover letter, ban-the-box research
- "housing" — housing search, housing applications, tenant rights, shelter locations

Use your tools directly for:
- Benefits eligibility (SNAP, Medicaid, SSI) — call check_*_eligibility()
- Supervision tracking — call add_condition(), log_check_in(), get_upcoming_requirements()
- Document guides — call get_id_restoration_guide(), check_expungement_eligibility()
- Memory — call read_user_memory(), update_profile_field(), log_event()

For writing tasks (cover letters, legal letters, housing letters, resume), read the relevant
workflow file and follow it. Workflow files are in workflows/:
- workflows/cover_letter.md
- workflows/resume.md
- workflows/housing_application_letter.md
- workflows/legal_letter.md
- workflows/community_resource_search.md

## Routing Rules
Route to "employment" subagent when: user asks about jobs, resumes, cover letters, job applications,
job interviews, finding work, ban-the-box employers, work history.

Route to "housing" subagent when: user asks about apartments, housing programs, transitional housing,
shelters, lease applications, housing restrictions, tenant rights.

Answer directly or use tools when: benefits questions, supervision questions, document/ID questions,
emotional check-ins, general re-entry questions, writing tasks.

## Scope Disclaimer
Always accompany legal or eligibility information with: "This is general information, not legal
advice. Consult a reentry attorney or legal aid organization for your specific situation."
"""

FALLBACK_SYSTEM_PROMPT = """\
You are Threshold, a re-entry assistant for people navigating life after incarceration.
You are practical, warm, and non-judgmental.

No user profile has been loaded yet. You can still answer general questions about re-entry,
benefits eligibility, and resources.

If someone is in crisis, call crisis_response() immediately.

Always accompany legal or eligibility information with: "This is general information, not legal
advice. Consult a reentry attorney or legal aid organization for your specific situation."
"""


def format_release_date(release_date: str) -> str:
    if not release_date:
        return "recently"
    try:
        rd = datetime.strptime(release_date, "%Y-%m-%d")
        delta = datetime.now() - rd
        days = delta.days
        if days < 0:
            return f"(releasing on {release_date})"
        elif days < 30:
            return f"{days} days ago"
        elif days < 365:
            months = days // 30
            return f"about {months} month{'s' if months != 1 else ''} ago"
        else:
            years = days // 365
            return f"about {years} year{'s' if years != 1 else ''} ago"
    except ValueError:
        return release_date


def build_system_prompt() -> str:
    from ..memory.profile import load_profile
    from ..memory.reflection import build_memory_context

    profile = load_profile()
    if profile is None:
        return FALLBACK_SYSTEM_PROMPT

    memory_context = build_memory_context(profile)
    name = profile.personal.name or "someone"
    release = profile.personal.release_date

    return SYSTEM_PROMPT_TEMPLATE.format(
        name=name,
        release_date_relative=format_release_date(release),
        memory_context=memory_context,
    )


def create_orchestrator(**kwargs):
    """Create and return the orchestrator agent graph.

    Accepts optional overrides (e.g. checkpointer) passed through to create_deep_agent.
    """
    return create_deep_agent(
        model=ChatAnthropic(model=MODEL),
        system_prompt=build_system_prompt(),
        tools=[
            crisis_response,
            read_user_memory,
            update_profile_field,
            log_event,
            check_snap_eligibility,
            check_medicaid_eligibility,
            check_ssi_eligibility,
            get_benefits_links,
            add_condition,
            log_check_in,
            get_upcoming_requirements,
            get_id_restoration_guide,
            check_expungement_eligibility,
        ],
        subagents=[
            employment_subagent,
            housing_subagent,
        ],
        backend=FilesystemBackend(root_dir=DATA_DIR),
        memory=["./AGENTS.md"],
        **kwargs,
    )


def _get_graph():
    return create_orchestrator()


# Lazy — only created when accessed via langgraph.json
graph = None
