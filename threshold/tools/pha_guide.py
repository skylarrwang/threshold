"""Public Housing Authority (PHA) and Section 8 guide.

Curated database of housing authorities with waitlist status,
application instructions, and eligibility rules specific to
people with criminal records.
"""

from __future__ import annotations

import httpx
from langchain_core.tools import tool


# Curated PHA data — CT focus, expandable
_PHA_DATABASE: list[dict] = [
    {
        "name": "Hartford Housing Authority",
        "state": "CT",
        "city": "Hartford",
        "phone": "860-723-8400",
        "website": "https://www.hartfordhousing.org",
        "application_url": "https://www.hartfordhousing.org",
        "waitlist_check_url": "https://www.hartfordhousing.org",
        "last_verified": "2026-03-28",
        "section_8_status": "Waitlist currently CLOSED. Check website for reopening announcements.",
        "public_housing_status": "Limited availability. Apply through website.",
        "reentry_notes": (
            "Hartford HA uses individualized assessment for criminal records. "
            "Mandatory denial only for: lifetime sex offender registrants and "
            "methamphetamine production on federally-assisted premises. "
            "Other convictions evaluated case-by-case — time since offense, "
            "evidence of rehabilitation, and nature of offense considered."
        ),
        "how_to_apply": (
            "1. Check hartfordhousing.org for waitlist openings\n"
            "2. When open: apply online or request paper application\n"
            "3. You'll need: ID, SSN, proof of income, family composition\n"
            "4. After application: background check + eligibility review\n"
            "5. If denied for criminal history: you have the RIGHT to appeal"
        ),
        "tips": [
            "Ask about the 'preference points' system — homeless status and local residency may bump you up",
            "If denied, request the specific reason IN WRITING",
            "You have 14 days to request an informal hearing to appeal a denial",
        ],
    },
    {
        "name": "New Haven Housing Authority (Elm City Communities)",
        "state": "CT",
        "city": "New Haven",
        "phone": "203-498-8800",
        "website": "https://www.elmcitycommunities.org",
        "application_url": "https://www.elmcitycommunities.org",
        "waitlist_check_url": "https://www.elmcitycommunities.org",
        "last_verified": "2026-03-28",
        "section_8_status": "Waitlist status varies. Check website or call.",
        "public_housing_status": "Multiple developments. Apply through central office.",
        "reentry_notes": (
            "Elm City Communities conducts individualized reviews. "
            "New Haven's fair chance housing ordinance applies — criminal history "
            "cannot be asked until after conditional offer for private housing, "
            "and PHA must do individualized assessment per HUD rules."
        ),
        "how_to_apply": (
            "1. Visit elmcitycommunities.org or call 203-498-8800\n"
            "2. Request application for Section 8 or public housing\n"
            "3. Complete intake interview\n"
            "4. Background check conducted after application\n"
            "5. Appeal rights apply if denied"
        ),
        "tips": [
            "Elm City has several mixed-income developments — ask about those too",
            "They partner with local reentry organizations for referrals",
        ],
    },
    {
        "name": "Bridgeport Housing Authority (Park City Communities)",
        "state": "CT",
        "city": "Bridgeport",
        "phone": "203-337-8900",
        "website": "https://www.parkcitycommunities.org",
        "application_url": "https://www.parkcitycommunities.org",
        "waitlist_check_url": "https://www.parkcitycommunities.org",
        "last_verified": "2026-03-28",
        "section_8_status": "Waitlist typically CLOSED. Opens periodically — check website.",
        "public_housing_status": "Applications accepted. Long wait times.",
        "reentry_notes": (
            "Individualized assessment per HUD guidelines. "
            "Drug convictions: evaluated on case-by-case basis. "
            "Violent offenses: longer look-back period but not automatic denial."
        ),
        "how_to_apply": (
            "1. Check parkcitycommunities.org for current openings\n"
            "2. Apply online or in person at 150 Highland Ave\n"
            "3. Bring ID, SSN, income verification\n"
            "4. Wait for eligibility determination\n"
            "5. Appeal if denied — request hearing in writing within 14 days"
        ),
        "tips": [
            "Ask about Project-Based Vouchers — these are attached to specific buildings and may have shorter waits",
        ],
    },
    {
        "name": "Waterbury Housing Authority",
        "state": "CT",
        "city": "Waterbury",
        "phone": "203-596-2640",
        "website": "https://www.waterburyha.org",
        "application_url": "https://www.waterburyha.org",
        "waitlist_check_url": "https://www.waterburyha.org",
        "last_verified": "2026-03-28",
        "section_8_status": "Check website for waitlist status.",
        "public_housing_status": "Applications accepted for multiple properties.",
        "reentry_notes": (
            "Standard HUD criminal screening rules. Individualized assessment required. "
            "Has historically worked with reentry population."
        ),
        "how_to_apply": (
            "1. Visit waterburyha.org or call for application\n"
            "2. Complete application with required documentation\n"
            "3. Background screening after acceptance\n"
            "4. Appeal rights available if denied"
        ),
        "tips": [],
    },
    {
        "name": "New London Housing Authority",
        "state": "CT",
        "city": "New London",
        "phone": "860-443-2851",
        "website": "",
        "application_url": "",
        "waitlist_check_url": "",
        "last_verified": "2026-03-28",
        "section_8_status": "Limited. Call for current status.",
        "public_housing_status": "Applications accepted.",
        "reentry_notes": "Standard HUD individualized assessment. Smaller agency — decisions may be faster.",
        "how_to_apply": (
            "1. Call 860-443-2851 for application\n"
            "2. Submit documentation\n"
            "3. Eligibility determination\n"
            "4. Appeal rights apply"
        ),
        "tips": ["Smaller PHA — may have shorter wait times than Hartford or New Haven"],
    },
]


@tool
def get_pha_guide(state: str = "CT", city: str = "") -> str:
    """Get Public Housing Authority info, Section 8 waitlist status, and application guidance.

    Includes reentry-specific notes on criminal record policies and appeal rights.

    Args:
        state: Two-letter state code (default "CT")
        city: Optional city to filter to a specific housing authority
    """
    state_upper = state.upper().strip()
    matches = [p for p in _PHA_DATABASE if p["state"] == state_upper]

    if city:
        city_lower = city.lower().strip()
        city_matches = [p for p in matches if city_lower in p["city"].lower()]
        if city_matches:
            matches = city_matches

    lines = [f"## Public Housing Authorities — {state_upper}\n"]

    if not matches:
        lines.append(f"*No PHA data for {state_upper} in the database yet.*\n")
        lines.append("To find your local housing authority:\n")
        lines.append("1. **HUD PHA lookup:** https://www.hud.gov/program_offices/public_indian_housing/pha/contacts")
        lines.append("2. **Call 211** and ask for 'public housing authority' or 'Section 8'")
        lines.append("3. **Search:** https://www.hud.gov/topics/rental_assistance\n")
        lines.append("### What to Know About Section 8 + Criminal Records\n")
    else:
        for pha in matches:
            lines.append(f"### {pha['name']}")
            lines.append(f"**City:** {pha['city']}")
            if pha["phone"]:
                lines.append(f"**Phone:** {pha['phone']}")
            if pha["website"]:
                lines.append(f"**Website:** {pha['website']}")
            if pha.get("application_url"):
                lines.append(f"**Apply online:** {pha['application_url']}")
            if pha.get("waitlist_check_url"):
                lines.append(f"**Check waitlist status:** {pha['waitlist_check_url']}")
            if pha.get("last_verified"):
                lines.append(f"**Data last verified:** {pha['last_verified']}")
            lines.append(f"\n**Section 8 (Housing Choice Voucher):** {pha['section_8_status']}")
            lines.append(f"**Public Housing:** {pha['public_housing_status']}")
            lines.append(f"\n**Criminal Record Policy:**\n{pha['reentry_notes']}")
            lines.append(f"\n**How to Apply:**\n{pha['how_to_apply']}")
            if pha["tips"]:
                lines.append("\n**Tips:**")
                for tip in pha["tips"]:
                    lines.append(f"- {tip}")
            lines.append("")

    # Universal guidance
    lines.append("### Your Rights with a Criminal Record\n")
    lines.append("**Federal rules (apply everywhere):**")
    lines.append("- PHAs **must** do individualized assessments — blanket bans are not allowed")
    lines.append("- Only TWO automatic federal bars:")
    lines.append("  1. Lifetime sex offender registrants")
    lines.append("  2. Methamphetamine production on federally-assisted property")
    lines.append("- Everything else is at the PHA's discretion")
    lines.append("- You have the **right to appeal** any denial")
    lines.append("- You can request an **informal hearing** within 14 days of denial")
    lines.append("- PHAs must consider: nature of offense, time elapsed, evidence of rehabilitation\n")

    lines.append("**If denied:**")
    lines.append("1. Request the denial reason IN WRITING")
    lines.append("2. Request an informal hearing within 14 days")
    lines.append("3. Bring evidence of rehabilitation: certificates, employment, support letters")
    lines.append("4. Contact legal aid: https://www.lawhelp.org for free representation")
    lines.append("5. File a complaint with HUD if you believe the decision was discriminatory")

    lines.append("\n---")
    lines.append(
        "*This is general information, not legal advice. PHA policies change — "
        "always call to confirm current waitlist status and application procedures.*"
    )
    return "\n".join(lines)


@tool
def check_pha_waitlist_status(city: str = "", state: str = "CT") -> str:
    """Check the latest known waitlist status for Public Housing Authorities.

    Returns stored status, direct links to verify online, and phone numbers.
    PHA waitlists change frequently — always verify by calling or checking their website.

    Args:
        city: Optional city to filter (e.g. "Hartford")
        state: Two-letter state code (default "CT")
    """
    state_upper = state.upper().strip()
    matches = [p for p in _PHA_DATABASE if p["state"] == state_upper]

    if city:
        city_lower = city.lower().strip()
        city_matches = [p for p in matches if city_lower in p["city"].lower()]
        if city_matches:
            matches = city_matches

    if not matches:
        return (
            f"*No PHA waitlist data for {state_upper}"
            + (f" / {city}" if city else "")
            + " in the database.*\n\n"
            "Find your local PHA:\n"
            "- HUD directory: https://www.hud.gov/program_offices/public_indian_housing/pha/contacts\n"
            "- Call **211** and ask for 'Section 8 waitlist status'\n"
        )

    lines = [f"## PHA Waitlist Status — {state_upper}"]
    if city:
        lines[0] += f" ({city})"
    lines.append("")

    for pha in matches:
        lines.append(f"### {pha['name']}")
        lines.append(f"**Section 8 (Housing Choice Voucher):** {pha['section_8_status']}")
        lines.append(f"**Public Housing:** {pha['public_housing_status']}")
        if pha.get("waitlist_check_url"):
            lines.append(f"**Check current status online:** {pha['waitlist_check_url']}")
        if pha.get("phone"):
            lines.append(f"**Call to verify:** {pha['phone']}")
        if pha.get("last_verified"):
            lines.append(f"**Data last verified:** {pha['last_verified']}")
        lines.append("")

    lines.append("---")
    lines.append(
        "*Waitlist status changes frequently. This information was last verified on the "
        "dates shown above. Always call or check the website before making decisions "
        "based on waitlist status.*"
    )
    return "\n".join(lines)
