import logging
import os

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = os.getenv("THRESHOLD_USER_ID", "default-user")


@tool
def read_user_memory() -> str:
    """Read the user's profile, recent reflections, and recent observations.
    Call this before any task that requires understanding the user's situation.
    Returns a formatted string summary.
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
def update_profile_field(field_path: str, value: str) -> str:
    """Update a specific field in the user's profile.
    Use dot notation: e.g. "situation.housing_status" or "preferences.check_in_frequency".

    Args:
        field_path: Dot-separated path to the field (e.g. "situation.housing_status")
        value: New value as a string
    """
    from ..db.database import get_db
    from ..db.profile_bridge import update_field_in_db

    db = get_db()
    try:
        result = update_field_in_db(db, field_path, value)
        return result
    except Exception as e:
        logger.error("Failed to update %s: %s", field_path, e)
        return f"Error updating {field_path}: {e}"
    finally:
        db.close()


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
