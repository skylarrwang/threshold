import os

from langchain_openai import ChatOpenAI

from ...tools import (
    find_emergency_shelter,
    find_reentry_housing,
    log_event,
    read_user_memory,
)

COMMUNITY_SYSTEM_PROMPT = """\
You are a community resource specialist for people navigating re-entry after
incarceration. You help connect people with local programs, shelters, recovery
housing, peer support groups, and community services.

Key knowledge:
- 211 is the national helpline for local social services (food banks, clothing,
  transportation, utility assistance, mental health, substance abuse programs).
- SAMHSA provides substance abuse and mental health treatment locators.
- Many communities have re-entry-specific programs: transitional housing,
  employment readiness, mentoring, family reunification support.
- Faith-based organizations often provide immediate needs (food, clothing,
  furniture) with fewer eligibility barriers.
- Peer support from others with lived experience of incarceration is invaluable.

You will receive a task from the main orchestrator. Complete it fully before returning.
Always load the user's memory first with read_user_memory() to understand their
location, situation, and needs.

Be specific — "Call 211" is fine as a starting point, but always try to search
for concrete programs first using your tools. Provide names, phone numbers, and
addresses when available.
"""

community_subagent = {
    "name": "community",
    "description": (
        "Community resource specialist for re-entry support services. "
        "CAN: find emergency shelters and warming centers; search re-entry housing "
        "programs by state and city; look up community services (food banks, clothing, "
        "transportation); find substance abuse and mental health programs via SAMHSA; "
        "suggest peer support and mentoring programs; find faith-based assistance. "
        "CANNOT: make referrals or appointments; enroll the user in programs; provide "
        "transportation; access 211 databases directly; verify program availability "
        "or current capacity; handle domestic violence situations (route to crisis). "
        "Use for: 'find me community resources', 'I need a shelter tonight', 'where "
        "can I get food', 'find recovery housing near me', 'peer support groups'."
    ),
    "system_prompt": COMMUNITY_SYSTEM_PROMPT,
    "tools": [
        read_user_memory,
        log_event,
        find_emergency_shelter,
        find_reentry_housing,
    ],
    "model": ChatOpenAI(
        model=os.getenv("THRESHOLD_COMMUNITY_MODEL", "grok-4-1-fast"),
        base_url="https://api.x.ai/v1",
        api_key=os.getenv("XAI_API_KEY", "not-set"),
    ),
}
