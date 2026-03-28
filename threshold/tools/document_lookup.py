from langchain_core.tools import tool

ID_RESTORATION_GUIDES: dict[str, dict[str, str]] = {
    "NY": {
        "birth_certificate": "NYC: vitalchek.com or 311; NYS: health.ny.gov — $30 fee, fee waivers available for low-income",
        "social_security": "Visit ssa.gov or local SSA office with proof of identity — free, takes 2-4 weeks",
        "state_id": "NY DMV: bring birth cert + 2 proofs of residency + SSN — $9 non-driver ID",
    },
    "CA": {
        "birth_certificate": "cdph.ca.gov/Programs/CHSI — $25 fee",
        "social_security": "Visit ssa.gov or local SSA office — free",
        "state_id": "CA DMV: reduced-fee ID ($8) available for re-entry — bring release docs",
    },
    "TX": {
        "birth_certificate": "dshs.texas.gov — $22 fee",
        "social_security": "Visit ssa.gov or local SSA office — free",
        "state_id": "TX DPS: bring birth cert + SSN + 2 proofs of residency — $16",
    },
    "FL": {
        "birth_certificate": "floridahealth.gov — $9 fee",
        "social_security": "Visit ssa.gov or local SSA office — free",
        "state_id": "FL DHSMV: bring birth cert + SSN + 2 proofs of residency — $25",
    },
    "IL": {
        "birth_certificate": "dph.illinois.gov — $15 fee ($2 for corrections ID program)",
        "social_security": "Visit ssa.gov or local SSA office — free",
        "state_id": "IL SOS: free state ID for people released from IDOC within 30 days",
    },
}

DEFAULT_GUIDE = {
    "birth_certificate": "Contact your state's vital records office. Typical cost: $10-30. Fee waivers may be available.",
    "social_security": "Visit ssa.gov or your local Social Security office. Free. Bring proof of identity.",
    "state_id": "Visit your state's DMV/RMV. Bring birth certificate, Social Security card, and 2 proofs of residency. "
                "Many states offer reduced fees for re-entry.",
}


EXPUNGEMENT_ELIGIBILITY: dict[str, dict[str, str]] = {
    "NY": {
        "eligible": "non-violent, drug, financial",
        "waiting_period": "Varies: misdemeanors 3 years, felonies 10 years after sentence completion",
        "notes": "NY's Clean Slate Act (2024) auto-seals eligible convictions. Check courts.ny.gov.",
    },
    "CA": {
        "eligible": "non-violent, drug, financial",
        "waiting_period": "After completing probation/parole. Some automatic via Prop 47/64.",
        "notes": "AB 1076 provides automatic record clearing for eligible convictions.",
    },
    "TX": {
        "eligible": "non-violent (deferred adjudication only), drug (some)",
        "waiting_period": "Varies by offense class. Misdemeanor: 2 years. Felony: 5+ years.",
        "notes": "Texas allows nondisclosure orders (sealing) rather than true expungement for most cases.",
    },
    "IL": {
        "eligible": "non-violent, drug, financial",
        "waiting_period": "3 years for misdemeanors, 5+ years for felonies",
        "notes": "IL has automatic expungement for arrests not leading to conviction.",
    },
    "FL": {
        "eligible": "non-violent (very limited)",
        "waiting_period": "Must complete all terms of sentence",
        "notes": "FL is restrictive — only one sealing/expungement per lifetime. Some offenses never eligible.",
    },
}

DEFAULT_EXPUNGEMENT = {
    "eligible": "Varies by state",
    "waiting_period": "Varies by state and offense",
    "notes": "Contact your state's legal aid organization for specific eligibility information.",
}


@tool
def get_id_restoration_guide(state: str) -> str:
    """Get a step-by-step guide for restoring identification documents after release.

    Args:
        state: Two-letter state code (e.g. "NY")
    """
    state = state.upper()
    guide = ID_RESTORATION_GUIDES.get(state, DEFAULT_GUIDE)

    lines = [f"**ID Restoration Guide for {state}:**\n"]
    lines.append("**Step 1: Birth Certificate**")
    lines.append(f"  {guide['birth_certificate']}\n")
    lines.append("**Step 2: Social Security Card**")
    lines.append(f"  {guide['social_security']}\n")
    lines.append("**Step 3: State ID / Driver's License**")
    lines.append(f"  {guide['state_id']}\n")
    lines.append(
        "**Tip:** Start with your birth certificate — you'll need it for everything else. "
        "If you were released recently, ask your facility or case worker if they can help "
        "expedite any of these.\n\n"
        "This is general information, not legal advice."
    )
    return "\n".join(lines)


@tool
def check_expungement_eligibility(state: str, offense_category: str) -> str:
    """Check if a conviction may be eligible for expungement or record sealing.

    Args:
        state: Two-letter state code (e.g. "NY")
        offense_category: One of: non-violent, violent, drug, financial, other
    """
    state = state.upper()
    info = EXPUNGEMENT_ELIGIBILITY.get(state, DEFAULT_EXPUNGEMENT)

    eligible_categories = info.get("eligible", "")
    is_likely_eligible = offense_category in eligible_categories

    if is_likely_eligible:
        result = f"**Expungement in {state}: Your offense category ({offense_category}) may be eligible.**\n\n"
    elif offense_category == "violent":
        result = f"**Expungement in {state}: Violent offenses are generally not eligible** for expungement in most states.\n\n"
    else:
        result = f"**Expungement in {state}: Eligibility is uncertain** for your offense category ({offense_category}).\n\n"

    result += f"Eligible categories: {info.get('eligible', 'Varies')}\n"
    result += f"Waiting period: {info.get('waiting_period', 'Varies')}\n"
    result += f"Notes: {info.get('notes', 'Contact local legal aid.')}\n\n"
    result += (
        "**Next step:** Contact a legal aid organization in your state for a free "
        "eligibility review. Many offer pro bono expungement services.\n\n"
        "This is general information, not legal advice. "
        "Consult a reentry attorney or legal aid organization for your specific situation."
    )
    return result
