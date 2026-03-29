import logging
import os

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = os.getenv("THRESHOLD_USER_ID", "default-user")


@tool
def read_user_memory() -> str:
    """Read the user's full profile from the database.
    Call this before any task that requires understanding the user's situation.
    Returns a formatted string summary including:
    - Identity (name, DOB, contact info)
    - Employment (skills, certifications, education)
    - Housing situation
    - Supervision details
    - Health info
    - Financial situation
    - Goals and strengths
    """
    from ..db.database import get_db
    from ..db.profile_bridge import load_profile_from_db
    from ..memory.reflection import build_memory_context

    db = get_db()
    try:
        profile = load_profile_from_db(db)
    finally:
        db.close()

    if profile is None:
        base_context = "No profile found. The user has not completed the intake interview yet."
    else:
        base_context = build_memory_context(profile)

    # Append application tracking data
    apps_context = _build_applications_supplement()
    if apps_context:
        return base_context + "\n\n" + apps_context
    return base_context


def _build_applications_supplement() -> str:
    """Query the DB for housing/job application tracking data."""
    try:
        from ..db.database import get_db
        from ..db.crud import get_housing_applications, get_job_applications
    except Exception:
        return ""

    db = get_db()
    try:
        housing_apps = get_housing_applications(db, DEFAULT_USER_ID)
        job_apps = get_job_applications(db, DEFAULT_USER_ID)
    except Exception as e:
        logger.debug("Applications supplement failed: %s", e)
        return ""
    finally:
        db.close()

    parts: list[str] = []

    if housing_apps:
        parts.append("## Housing Applications")
        for app in housing_apps:
            parts.append(f"  - {app.get('program', 'Unknown')} — status: {app.get('status', '?')}")

    if job_apps:
        parts.append("## Job Applications")
        for app in job_apps:
            parts.append(f"  - {app.get('company', '?')} / {app.get('position', '?')} — status: {app.get('status', '?')}")

    return "\n".join(parts)


@tool
def update_profile_field(section: str, field: str, value: str) -> str:
    """Update a specific field in the user's profile.

    Args:
        section: The profile section (identity, employment, housing, supervision, health, benefits, financial, goals, documents)
        field: The field name within that section
        value: New value as a string (use "true"/"false" for booleans, JSON for arrays)
    """
    from ..db.database import get_db
    from ..db.crud import upsert_fields

    db = get_db()
    try:
        # Handle JSON arrays and booleans
        if value.lower() in ("true", "false"):
            parsed_value = value.lower() == "true"
        elif value.startswith("[") and value.endswith("]"):
            import json
            parsed_value = json.loads(value)
        else:
            parsed_value = value

        upsert_fields(db, DEFAULT_USER_ID, section, {field: parsed_value})
    finally:
        db.close()

    return f"Updated {section}.{field} to: {value}"


@tool
def log_event(event_type: str, content: str, tags: list[str]) -> str:
    """Log an important event or milestone for the user.

    Args:
        event_type: One of: user_message, tool_result, milestone, check_in, reflection
        content: Plain text description of what happened
        tags: List of topic tags e.g. ["job_search", "cover_letter"]
    """
    from ..memory.observation_stream import log_observation

    log_observation(
        agent="orchestrator",
        event_type=event_type,
        content=content,
        tags=tags,
    )
    return "Logged."
