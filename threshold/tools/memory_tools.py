from langchain_core.tools import tool


@tool
def read_user_memory() -> str:
    """Read the user's profile, recent reflections, and recent observations.
    Call this before any task that requires understanding the user's situation.
    Returns a formatted string summary.
    """
    from ..memory.profile import load_profile
    from ..memory.reflection import build_memory_context

    profile = load_profile()
    if profile is None:
        return "No profile found. The user has not completed the intake interview yet."
    return build_memory_context(profile)


@tool
def update_profile_field(field_path: str, value: str) -> str:
    """Update a specific field in the user's profile.
    Use dot notation: e.g. "situation.housing_status" or "preferences.check_in_frequency".

    Args:
        field_path: Dot-separated path to the field (e.g. "situation.housing_status")
        value: New value as a string
    """
    from ..memory.profile import load_profile, save_profile

    profile = load_profile()
    if profile is None:
        return "Error: no profile found."
    parts = field_path.split(".")
    obj = profile
    for part in parts[:-1]:
        obj = getattr(obj, part)
    setattr(obj, parts[-1], value)
    save_profile(profile)
    return f"Updated {field_path} to: {value}"


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
