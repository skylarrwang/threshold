"""Curated reentry housing database.

Hand-researched programs that specifically serve people with criminal records.
CT-focused with expansion capability. These are programs that won't reject
you for having a record — that's the whole point.
"""

from __future__ import annotations

from langchain_core.tools import tool

# Each entry: name, city, state, phone, website, description, accepts (offense types),
# housing_type, how_to_apply, waitlist_note, eligibility
_REENTRY_PROGRAMS: list[dict] = [
    # --- Connecticut ---
    {
        "name": "Community Partners in Action (CPA) — Residential Services",
        "city": "Hartford",
        "state": "CT",
        "phone": "860-566-2030",
        "website": "https://www.cpaonline.org",
        "description": (
            "Transitional housing for men and women returning from incarceration. "
            "Case management, employment readiness, substance abuse support. "
            "Multiple locations in Hartford area."
        ),
        "accepts": ["all"],
        "housing_type": "transitional",
        "how_to_apply": "Call intake line or get referral from parole/probation officer",
        "waitlist_note": "Usually 2-4 weeks. Apply early.",
        "eligibility": "Adults in reentry. Parole/DOC referrals prioritized.",
    },
    {
        "name": "Open Hearth — Men's Transitional Living",
        "city": "Hartford",
        "state": "CT",
        "phone": "860-525-3447",
        "website": "https://www.openhearthct.org",
        "description": (
            "Emergency shelter beds + 6-month transitional housing program for men. "
            "Includes job training, financial literacy, and case management. "
            "Record-friendly — designed for reentry population."
        ),
        "accepts": ["non-violent", "violent", "drug", "financial", "other"],
        "housing_type": "shelter_to_transitional",
        "how_to_apply": "Walk in or call for intake assessment. 211 can also refer.",
        "waitlist_note": "Emergency beds: same-day if available. Transitional: 1-3 months.",
        "eligibility": "Men 18+. Background check is NOT a barrier.",
    },
    {
        "name": "Mercy Housing & Shelter",
        "city": "Hartford",
        "state": "CT",
        "phone": "860-808-2100",
        "website": "https://www.mercyhousingct.org",
        "description": (
            "Emergency shelter + transitional housing. Partners with reentry services. "
            "On-site case managers help with housing search and benefits enrollment."
        ),
        "accepts": ["all"],
        "housing_type": "shelter_to_transitional",
        "how_to_apply": "Call or walk in. CAN referral accepted: 1-888-774-2900",
        "waitlist_note": "High demand. Emergency beds first-come.",
        "eligibility": "Adults experiencing homelessness. Reentry population welcome.",
    },
    {
        "name": "Columbus House — Rapid Rehousing",
        "city": "New Haven",
        "state": "CT",
        "phone": "203-401-4400",
        "website": "https://www.columbushouse.org",
        "description": (
            "Emergency shelter + rapid rehousing program that helps place people in "
            "permanent housing with short-term rental assistance. Reentry-friendly."
        ),
        "accepts": ["all"],
        "housing_type": "rapid_rehousing",
        "how_to_apply": "Call intake or walk in to Abraham's Tent or Overflow Shelter",
        "waitlist_note": "Rapid rehousing slots limited. Shelter beds available nightly.",
        "eligibility": "Adults and families. No criminal record exclusion.",
    },
    {
        "name": "CT Coalition to End Homelessness — Coordinated Access Network",
        "city": "Statewide",
        "state": "CT",
        "phone": "1-888-774-2900",
        "website": "https://cceh.org",
        "description": (
            "NOT a housing program itself — this is the intake gateway. CAN does "
            "assessments and connects you to available shelter beds and transitional "
            "housing across CT. Call them first if you don't know where to start."
        ),
        "accepts": ["all"],
        "housing_type": "referral_network",
        "how_to_apply": "Call 1-888-774-2900 for phone assessment",
        "waitlist_note": "Assessment same-day. Placement depends on availability.",
        "eligibility": "Anyone experiencing or at risk of homelessness in CT.",
    },
    {
        "name": "Hartford Reentry Welcome Center",
        "city": "Hartford",
        "state": "CT",
        "phone": "860-560-5600",
        "website": "",
        "description": (
            "Day-of-release support center. Connects newly released individuals "
            "to housing, food, ID restoration, and employment services. "
            "Operated by the CT Reentry Collaborative."
        ),
        "accepts": ["all"],
        "housing_type": "referral_center",
        "how_to_apply": "Walk in or call. Designed for day-of or week-of release.",
        "waitlist_note": "No waitlist — drop-in services.",
        "eligibility": "Recently released from CT DOC facilities.",
    },
    {
        "name": "Halfway Home Bridgeport",
        "city": "Bridgeport",
        "state": "CT",
        "phone": "203-334-6228",
        "website": "",
        "description": (
            "Residential reentry program for men. Up to 6 months of transitional "
            "housing with structured programming, job placement, and relapse prevention."
        ),
        "accepts": ["non-violent", "drug", "financial", "other"],
        "housing_type": "transitional",
        "how_to_apply": "Referral from DOC, parole, or probation. Call for self-referral.",
        "waitlist_note": "2-6 weeks typical.",
        "eligibility": "Men 18+. Some offense restrictions — call to verify.",
    },
    {
        "name": "Chrysalis Center",
        "city": "Hartford",
        "state": "CT",
        "phone": "860-263-4400",
        "website": "https://www.chrysaliscenterct.org",
        "description": (
            "Supportive housing + workforce development for women in recovery and reentry. "
            "On-site childcare, mental health services, and financial coaching."
        ),
        "accepts": ["all"],
        "housing_type": "supportive",
        "how_to_apply": "Call intake. Self-referral or agency referral accepted.",
        "waitlist_note": "Varies. Priority for women with children.",
        "eligibility": "Women in recovery or reentry. Children welcome.",
    },
    {
        "name": "CT DOC Transitional Supervision (Halfway Back)",
        "city": "Statewide",
        "state": "CT",
        "phone": "860-692-7480",
        "website": "https://portal.ct.gov/doc",
        "description": (
            "DOC-contracted halfway houses for people on transitional supervision. "
            "Not voluntary — assigned by DOC. But if you're eligible, ask your "
            "counselor about placement."
        ),
        "accepts": ["all"],
        "housing_type": "halfway_house",
        "how_to_apply": "Request through DOC counselor or parole officer",
        "waitlist_note": "Depends on DOC bed availability and your release date.",
        "eligibility": "CT DOC inmates approaching release with transitional supervision.",
    },
    {
        "name": "InterCommunity — Recovery Housing",
        "city": "Hartford",
        "state": "CT",
        "phone": "860-569-5900",
        "website": "https://www.intercommunityct.org",
        "description": (
            "Sober living and recovery housing with integrated mental health services. "
            "Accepts people with criminal records. Medication-assisted treatment available."
        ),
        "accepts": ["all"],
        "housing_type": "recovery",
        "how_to_apply": "Call for behavioral health intake assessment",
        "waitlist_note": "1-4 weeks for residential programs.",
        "eligibility": "Adults with substance use or mental health needs. Record-friendly.",
    },
]

# Housing type labels for display
_TYPE_LABELS = {
    "transitional": "Transitional Housing",
    "shelter_to_transitional": "Emergency Shelter → Transitional",
    "rapid_rehousing": "Rapid Rehousing",
    "supportive": "Supportive Housing",
    "recovery": "Recovery Housing",
    "halfway_house": "Halfway House (DOC)",
    "referral_network": "Referral Network",
    "referral_center": "Reentry Welcome Center",
    "permanent": "Permanent Housing",
    "sober_living": "Sober Living",
}


@tool
def find_reentry_housing(
    state: str = "CT",
    city: str = "",
    housing_type: str = "",
    offense_category: str = "",
) -> str:
    """Search the curated database of housing programs that specifically accept people with criminal records.

    Unlike general housing searches, every result here is verified to serve the reentry population.

    Args:
        state: Two-letter state code (default "CT")
        city: Optional city to filter (e.g. "Hartford")
        housing_type: Optional filter: transitional, recovery, shelter, supportive, rapid_rehousing
        offense_category: User's offense category to filter programs that won't accept them
    """
    state_upper = state.upper().strip()
    matches = [p for p in _REENTRY_PROGRAMS if p["state"] == state_upper]

    if city:
        city_lower = city.lower().strip()
        city_matches = [p for p in matches if city_lower in p["city"].lower() or p["city"] == "Statewide"]
        if city_matches:
            matches = city_matches

    if housing_type:
        ht = housing_type.lower().strip()
        type_matches = [p for p in matches if ht in p["housing_type"]]
        if type_matches:
            matches = type_matches

    if offense_category:
        cat = offense_category.lower().strip()
        matches = [
            p for p in matches
            if "all" in p["accepts"] or cat in [a.lower() for a in p["accepts"]]
        ]

    if not matches:
        return (
            f"*No reentry housing programs found for {state_upper}"
            + (f" / {city}" if city else "")
            + ".*\n\n"
            "Try:\n"
            "- Call **211** for local referrals\n"
            "- Search at https://findtreatment.gov for recovery housing\n"
            "- Contact your state's reentry services coordinator\n"
            f"- Use `find_emergency_shelter(\"{state}\")` for immediate shelter options"
        )

    lines = [f"## Reentry Housing Programs — {state_upper}"]
    if city:
        lines[0] += f" ({city})"
    lines.append(f"\n*{len(matches)} programs found. All verified to serve people with records.*\n")

    for prog in matches:
        type_label = _TYPE_LABELS.get(prog["housing_type"], prog["housing_type"])
        lines.append(f"### {prog['name']}")
        lines.append(f"**Type:** {type_label}")
        lines.append(f"{prog['description']}")
        if prog["phone"]:
            lines.append(f"**Phone:** {prog['phone']}")
        if prog["website"]:
            lines.append(f"**Website:** {prog['website']}")
        lines.append(f"**How to apply:** {prog['how_to_apply']}")
        lines.append(f"**Waitlist:** {prog['waitlist_note']}")
        lines.append(f"**Eligibility:** {prog['eligibility']}")
        lines.append("")

    lines.append("---")
    lines.append(
        "*These programs were verified for reentry eligibility. Availability and policies change — "
        "always call to confirm current openings and requirements.*"
    )
    return "\n".join(lines)
