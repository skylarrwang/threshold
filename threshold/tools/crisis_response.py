from langchain_core.tools import tool


@tool
def crisis_response(context: str) -> str:
    """Call this IMMEDIATELY if the user expresses suicidal ideation, self-harm urges,
    or acute emotional crisis. Returns crisis resources. Never delegate this to a subagent.

    Args:
        context: Brief description of what the user expressed (for logging only).
    """
    from ..memory.observation_stream import log_observation

    log_observation(
        agent="orchestrator",
        event_type="check_in",
        content=f"Crisis response triggered: {context}",
        importance=1.0,
        tags=["crisis"],
    )
    return (
        "I hear you, and I'm glad you're reaching out.\n\n"
        "Please contact one of these right now:\n\n"
        "- **988 Suicide & Crisis Lifeline**: Call or text 988 (free, 24/7)\n"
        "- **Crisis Text Line**: Text HOME to 741741\n"
        "- **SAMHSA Helpline**: 1-800-662-4357 (mental health + substance use)\n\n"
        "You don't have to be in immediate danger to call. They're there for any moment "
        "that feels too heavy to carry alone.\n\n"
        "If you're with a case worker or counselor, please reach out to them too."
    )
