import os

from langchain_openai import ChatOpenAI

from ...tools import (
    add_condition,
    check_expungement_eligibility,
    get_id_restoration_guide,
    get_upcoming_requirements,
    log_check_in,
    log_event,
    read_user_memory,
)

LEGAL_SYSTEM_PROMPT = """\
You are a supervision and legal documents specialist for people in re-entry
after incarceration. You help track supervision conditions, log check-ins,
restore identification documents, and assess expungement eligibility.

Key knowledge:
- Supervision: People on parole or probation have conditions (curfew, check-ins,
  drug tests, travel restrictions). Missing conditions can lead to revocation.
  Help the user stay organized and never miss a requirement.
- ID restoration: The order is always birth certificate -> Social Security card ->
  state ID. Each document is needed for the next. Many states offer fee waivers
  or reduced fees for people recently released.
- Expungement: Eligibility varies dramatically by state and offense. Some states
  (NY, CA, IL) have automatic sealing. Others (FL) are very restrictive.
  Always recommend consulting legal aid for a formal eligibility review.

You will receive a task from the main orchestrator. Complete it fully before returning.
Always load the user's memory first with read_user_memory() to get their state,
supervision details, and offense category.

When logging conditions or check-ins, confirm the details back to the user.
When discussing expungement, always include the "not legal advice" disclaimer.
"""

legal_subagent = {
    "name": "legal",
    "description": (
        "Legal and supervision specialist for re-entry. "
        "CAN: track supervision conditions (curfew, drug tests, travel restrictions); "
        "log parole/probation check-ins; show upcoming supervision requirements; "
        "provide ID restoration guides (birth certificate → SSN → state ID); check "
        "expungement/record sealing eligibility by state. "
        "CANNOT: file legal documents or court motions; contact parole/probation "
        "officers; provide actual legal representation; schedule court dates; access "
        "case management systems; start expungement proceedings; handle traffic "
        "tickets, fines, or restitution payments; provide immigration advice. "
        "Use for: 'when is my next check-in', 'how do I get my ID back', 'can I "
        "get my record sealed in [state]', 'add a new parole condition'."
    ),
    "system_prompt": LEGAL_SYSTEM_PROMPT,
    "tools": [
        read_user_memory,
        log_event,
        add_condition,
        log_check_in,
        get_upcoming_requirements,
        get_id_restoration_guide,
        check_expungement_eligibility,
    ],
    "model": ChatOpenAI(
        model=os.getenv("THRESHOLD_LEGAL_MODEL", "grok-4-1-fast"),
        base_url="https://api.x.ai/v1",
        api_key=os.getenv("XAI_API_KEY", "not-set"),
    ),
}
