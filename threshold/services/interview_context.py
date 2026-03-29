"""Interview context builder.

Queries the DB to understand what we already know about the user (from OCR
or prior sessions) and what's still missing. Formats this into structured
context that gets injected into the interview agent's system prompt.

This is the bridge between the intake pipeline and the interview agent:
  OCR fills what it can → this module checks what's left → interview agent
  gets a targeted list of what to ask about, organized by priority.

The InterviewCache holds an in-memory mirror of the user's profile so that
context building and completion stats don't re-query SQLite on every turn.
Writes still go to the DB (via crud.upsert_fields) — the cache is updated
alongside each write.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.orm import Session

from threshold.db.crud import (
    FIELD_DESCRIPTIONS,
    FIELD_PRIORITY,
    _JSON_FIELDS,
    get_full_profile,
    get_intake_status,
    get_populated_fields,
)

logger = logging.getLogger(__name__)


class InterviewCache:
    """In-memory mirror of a single user's profile for fast context builds.

    Lifecycle:
      1. Created once when the interview starts.
      2. Populated via load() from the DB.
      3. Updated in-place by update_field() on every save_field() call.
      4. Read by get_intake_status() and get_completion_summary() instead
         of hitting the DB.
    """

    def __init__(self) -> None:
        self._profile: dict[str, dict[str, Any]] = {}
        self._loaded = False

    @property
    def loaded(self) -> bool:
        return self._loaded

    def load(self, db: Session, user_id: str) -> None:
        self._profile = get_full_profile(db, user_id)
        self._loaded = True
        logger.debug("InterviewCache loaded for %s", user_id)

    def update_field(self, section: str, field: str, value: Any) -> None:
        if section not in self._profile:
            self._profile[section] = {}
        if field in _JSON_FIELDS and isinstance(value, (list, dict)):
            self._profile[section][field] = value
        elif field in _JSON_FIELDS and isinstance(value, str):
            try:
                self._profile[section][field] = json.loads(value)
            except json.JSONDecodeError:
                self._profile[section][field] = value
        else:
            self._profile[section][field] = value

    def get_intake_status(self) -> dict[str, Any]:
        populated: dict[str, dict[str, Any]] = {}
        missing_critical: dict[str, list[dict]] = {}
        missing_important: dict[str, list[dict]] = {}
        total_fields = 0
        filled_fields = 0

        for section, fields in self._profile.items():
            section_desc = FIELD_DESCRIPTIONS.get(section, {})
            section_prio = FIELD_PRIORITY.get(section, {})

            for field_name, value in fields.items():
                total_fields += 1
                is_pop = _is_populated(value)

                if is_pop:
                    filled_fields += 1
                    populated.setdefault(section, {})[field_name] = value
                else:
                    prio = section_prio.get(field_name, "optional")
                    desc = section_desc.get(field_name, field_name)
                    if prio == "critical":
                        missing_critical.setdefault(section, []).append(
                            {"field": field_name, "description": desc}
                        )
                    elif prio == "important":
                        missing_important.setdefault(section, []).append(
                            {"field": field_name, "description": desc}
                        )

        pct = round(filled_fields / total_fields * 100, 1) if total_fields else 0
        crit_count = sum(len(v) for v in missing_critical.values())
        imp_count = sum(len(v) for v in missing_important.values())

        return {
            "overall_pct": pct,
            "populated": populated,
            "missing_critical": missing_critical,
            "missing_important": missing_important,
            "critical_count": crit_count,
            "important_count": imp_count,
        }

    def get_completion_summary(self) -> dict[str, Any]:
        total = 0
        filled = 0
        for fields in self._profile.values():
            for value in fields.values():
                total += 1
                if _is_populated(value):
                    filled += 1
        return {
            "overall_pct": round(filled / total * 100, 1) if total else 0,
            "filled": filled,
            "total": total,
        }


def _is_populated(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and value in ("", "[]", "__needs_help"):
        return False
    if isinstance(value, list) and len(value) == 0:
        return False
    return True


def build_interview_prompt_context(
    db: Session,
    user_id: str,
    cache: InterviewCache | None = None,
) -> str:
    """Build the context block that gets injected into the interview agent's
    system prompt.

    If a loaded InterviewCache is provided, uses the in-memory profile
    instead of querying the DB (much faster during an active interview).

    Returns a formatted string covering:
    1. What we already know (from OCR / prior intake)
    2. Critical fields still missing (the agent should try hard to get these)
    3. Important fields still missing (cover if comfortable)
    4. Guidance on what NOT to re-ask
    """
    if cache and cache.loaded:
        status = cache.get_intake_status()
    else:
        status = get_intake_status(db, user_id)

    parts: list[str] = []

    # --- What we already know ---
    populated = status["populated"]
    if populated:
        parts.append("## What We Already Know")
        parts.append(
            "The following was extracted from uploaded documents or earlier "
            "in this conversation. Do NOT re-ask for this information unless "
            "the person wants to correct it. These fields are ALREADY SAVED."
        )
        for section, fields in populated.items():
            field_lines = []
            for field, value in fields.items():
                desc = FIELD_DESCRIPTIONS.get(section, {}).get(field, field)
                field_lines.append(f"  - {desc} [{section}.{field}]: {value}")
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
                parts.append(
                    f"  - {f['description']} → "
                    f"save_field(section='{section}', field='{f['field']}')"
                )
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
                parts.append(
                    f"  - {f['description']} → "
                    f"save_field(section='{section}', field='{f['field']}')"
                )
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
