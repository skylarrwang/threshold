import os

from langchain_openai import ChatOpenAI

from ...tools import (
    add_condition,
    get_upcoming_requirements,
    log_check_in,
    log_event,
    read_user_memory,
)

SUPERVISION_SYSTEM_PROMPT = """\
You are a supervision compliance specialist for people on parole, probation,
or supervised release after incarceration. Your role is to help the user stay
organized and never miss a requirement.

Key knowledge:
- Common conditions: curfew, regular check-ins with PO, drug testing, travel
  restrictions, employment requirements, community service, anger management or
  substance abuse programs, no-contact orders.
- Missing a condition can lead to violation hearings and potential revocation.
  Always treat compliance as urgent.
- Check-in frequencies vary: weekly, biweekly, monthly, or as directed.
  Help the user track exactly when their next one is.

You will receive a task from the main orchestrator. Complete it fully before returning.
Always load the user's memory first with read_user_memory() to get their supervision
details, conditions, and upcoming requirements.

When logging conditions or check-ins, confirm the details back to the user.
Be encouraging — staying compliant is hard work and worth celebrating.
"""

supervision_subagent = {
    "name": "supervision",
    "description": (
        "Supervision compliance specialist for parole, probation, and supervised release. "
        "CAN: track supervision conditions (curfew, drug tests, travel restrictions, "
        "program requirements); log check-ins with parole/probation officer; show upcoming "
        "supervision requirements and deadlines; help the user stay compliant. "
        "CANNOT: contact the parole/probation officer; file motions to modify conditions; "
        "provide legal advice on violations; schedule court dates; handle warrant issues; "
        "access case management or DOC systems. "
        "Use for: 'when is my next check-in', 'add a new condition', 'log that I checked "
        "in today', 'what are my upcoming requirements'."
    ),
    "system_prompt": SUPERVISION_SYSTEM_PROMPT,
    "tools": [
        read_user_memory,
        log_event,
        add_condition,
        log_check_in,
        get_upcoming_requirements,
    ],
    "model": ChatOpenAI(
        model=os.getenv("THRESHOLD_SUPERVISION_MODEL", "grok-4-1-fast"),
        base_url="https://api.x.ai/v1",
        api_key=os.getenv("XAI_API_KEY", "not-set"),
    ),
}
