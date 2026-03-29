import os

from langchain_openai import ChatOpenAI

from ...tools import (
    check_medicaid_eligibility,
    check_snap_eligibility,
    check_ssi_eligibility,
    get_benefits_links,
    read_user_memory,
)

BENEFITS_SYSTEM_PROMPT = """\
You are a benefits enrollment specialist for people in re-entry after incarceration.
You know federal and state eligibility rules for SNAP, Medicaid, and SSI, including
how conviction history interacts with each program.

Key knowledge:
- SNAP: The 1996 federal drug felony ban still applies in ~26 states, but many have
  opted out. Always check state-specific status with check_snap_eligibility().
- Medicaid: Conviction history does not disqualify. Expansion states cover adults up
  to 138% FPL. Many states now allow enrollment before release.
- SSI: Available for qualifying disabilities regardless of conviction, but not while
  incarcerated or with an outstanding parole/probation violation warrant.
  Apply within 30 days of release to restart prior benefits faster.

You will receive a task from the main orchestrator. Complete it fully before returning.
Always load the user's memory first with read_user_memory() to get their state and
offense category, so you can give accurate eligibility results.

When the user asks about benefits generally, check all three programs and summarize
which they likely qualify for.

Be direct about eligibility but never definitive — always recommend confirming with
the local benefits office or calling 211.
"""

benefits_subagent = {
    "name": "benefits",
    "description": (
        "Benefits eligibility specialist for re-entry. "
        "CAN: check SNAP/food stamp eligibility by state (including drug felony ban "
        "status); check Medicaid eligibility; check SSI/disability eligibility; provide "
        "links to benefits application portals. "
        "CANNOT: actually submit benefits applications; check eligibility for programs "
        "beyond SNAP/Medicaid/SSI (no WIC, TANF, LIHEAP, Section 8 vouchers, etc.); "
        "check status of existing applications; check benefit balances; handle "
        "recertifications or appeals. "
        "Use for: 'am I eligible for SNAP', 'check my Medicaid eligibility', "
        "'what benefits can I get'. Do NOT use for housing vouchers (use housing) "
        "or general questions about benefits the user already has."
    ),
    "system_prompt": BENEFITS_SYSTEM_PROMPT,
    "tools": [
        read_user_memory,
        check_snap_eligibility,
        check_medicaid_eligibility,
        check_ssi_eligibility,
        get_benefits_links,
    ],
    "model": ChatOpenAI(
        model=os.getenv("THRESHOLD_BENEFITS_MODEL", "grok-4-1-fast"),
        base_url="https://api.x.ai/v1",
        api_key=os.getenv("XAI_API_KEY", "not-set"),
    ),
}
