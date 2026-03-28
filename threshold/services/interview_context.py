"""Interview context builder.

Queries the DB to understand what we already know about the user (from OCR
or prior sessions) and what's still missing. Formats this into structured
context that gets injected into the interview agent's system prompt.

This is the bridge between the intake pipeline and the interview agent:
  OCR fills what it can → this module checks what's left → interview agent
  gets a targeted list of what to ask about, organized by priority.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from threshold.db.crud import (
    FIELD_DESCRIPTIONS,
    get_intake_status,
    get_populated_fields,
)


def build_interview_prompt_context(db: Session, user_id: str) -> str:
    """Build the context block that gets injected into the interview agent's
    system prompt.

    Returns a formatted string covering:
    1. What we already know (from OCR / prior intake)
    2. Critical fields still missing (the agent should try hard to get these)
    3. Important fields still missing (cover if comfortable)
    4. Guidance on what NOT to re-ask
    """
    status = get_intake_status(db, user_id)

    parts: list[str] = []

    # --- What we already know ---
    populated = status["populated"]
    if populated:
        parts.append("## What We Already Know")
        parts.append(
            "The following was extracted from uploaded documents. "
            "Do NOT re-ask for this information unless the person wants to correct it."
        )
        for section, fields in populated.items():
            field_lines = []
            for field, value in fields.items():
                desc = FIELD_DESCRIPTIONS.get(section, {}).get(field, field)
                field_lines.append(f"  - {desc}: {value}")
            parts.append(f"\n**{section.title()}**")
            parts.extend(field_lines)
        parts.append("")

    # --- Critical missing fields ---
    critical = status["missing_critical"]
    if critical:
        parts.append("## Critical Information Still Needed")
        parts.append(
            "These fields are essential for the app to work. Try to cover all "
            "of them during the conversation. If the person skips one, note it "
            "and move on — but try to circle back if rapport allows."
        )
        for section, fields in critical.items():
            parts.append(f"\n**{section.title()}**")
            for f in fields:
                parts.append(f"  - {f['description']}")
        parts.append("")

    # --- Important missing fields ---
    important = status["missing_important"]
    if important:
        parts.append("## Important Information (If Comfortable)")
        parts.append(
            "These fields make the subagents significantly more effective. "
            "Cover them if the conversation flows naturally, but don't push "
            "if the person seems uncomfortable or wants to wrap up."
        )
        for section, fields in important.items():
            parts.append(f"\n**{section.title()}**")
            for f in fields:
                parts.append(f"  - {f['description']}")
        parts.append("")

    # --- Summary stats ---
    parts.append("## Intake Progress")
    parts.append(f"Profile is {status['overall_pct']}% complete.")
    parts.append(f"Critical fields missing: {status['critical_count']}")
    parts.append(f"Important fields missing: {status['important_count']}")

    if status["critical_count"] == 0:
        parts.append(
            "\nAll critical fields are filled. The interview can wrap up "
            "whenever the person is ready — focus on important fields and "
            "building rapport for the long-term memory layer."
        )
    elif status["critical_count"] <= 5:
        parts.append(
            "\nAlmost there — just a few critical fields left. "
            "Try to cover them before wrapping up."
        )

    return "\n".join(parts)


def build_post_ocr_summary(db: Session, user_id: str) -> dict[str, Any]:
    """Build a summary to show the user after document upload, before
    the interview starts.

    Returns a structured dict the frontend can render as a "here's what
    we found" screen, with what was extracted and what we'll need to ask.
    """
    status = get_intake_status(db, user_id)

    return {
        "overall_pct": status["overall_pct"],
        "extracted": status["populated"],
        "still_needed_critical": status["missing_critical"],
        "still_needed_important": status["missing_important"],
        "critical_count": status["critical_count"],
        "important_count": status["important_count"],
        "message": _build_summary_message(status),
    }


def _build_summary_message(status: dict[str, Any]) -> str:
    """Human-readable message for post-OCR screen."""
    pct = status["overall_pct"]
    crit = status["critical_count"]

    if pct >= 50:
        opener = "Great — we got a lot from your documents."
    elif pct >= 20:
        opener = "Thanks for uploading. We were able to pull some info from your documents."
    else:
        opener = "We got a few things from your documents."

    if crit == 0:
        closer = "We have all the essentials. The next conversation will help us understand your goals and how to help."
    elif crit <= 5:
        closer = f"We still need {crit} key pieces of information. We'll cover those in a quick conversation next."
    else:
        closer = f"There are {crit} things we'll need to go over together. It won't take long — we'll have a conversation and fill in the gaps."

    return f"{opener} {closer}"
