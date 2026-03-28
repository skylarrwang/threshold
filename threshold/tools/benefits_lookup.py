from langchain_core.tools import tool

SNAP_DRUG_FELONY_OPT_OUT_STATES = {
    "CA", "CO", "CT", "DC", "DE", "HI", "IL", "ME", "MD", "MA",
    "MI", "MN", "NE", "NV", "NM", "NY", "NC", "OH", "OR", "RI",
    "VT", "VA", "WA", "WI",
}

MEDICAID_EXPANSION_STATES = {
    "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "HI", "ID",
    "IL", "IN", "IA", "KY", "LA", "ME", "MD", "MA", "MI", "MN",
    "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND",
    "OH", "OK", "OR", "PA", "RI", "SD", "UT", "VT", "VA", "WA",
    "WV", "WI",
}

SSI_DISQUALIFYING_SITUATIONS = {
    "currently_incarcerated",
    "fleeing_felon",
    "parole_violation_warrant",
}


@tool
def check_snap_eligibility(state: str, offense_category: str) -> str:
    """Check SNAP (food stamps) eligibility for a person in re-entry.

    Args:
        state: Two-letter state code (e.g. "NY")
        offense_category: One of: non-violent, violent, drug, financial, other
    """
    state = state.upper()
    has_drug_felony = offense_category == "drug"

    if has_drug_felony and state not in SNAP_DRUG_FELONY_OPT_OUT_STATES:
        return (
            f"**SNAP eligibility in {state}: Likely ineligible** due to the federal drug "
            f"felony bar, which {state} has not opted out of. However, eligibility rules "
            f"can change — check with your local SNAP office or a benefits counselor.\n\n"
            f"Application: https://www.benefits.gov/benefit/361\n\n"
            "This is general information, not legal advice."
        )

    return (
        f"**SNAP eligibility in {state}: Likely eligible.**\n\n"
        f"{'Your state has opted out of the federal drug felony bar. ' if has_drug_felony else ''}"
        f"You will need to meet income requirements (generally under 130% of the federal "
        f"poverty line) and residency requirements.\n\n"
        f"Apply online: https://www.benefits.gov/benefit/361\n"
        f"Or call your local Department of Social Services.\n\n"
        "This is general information, not legal advice."
    )


@tool
def check_medicaid_eligibility(state: str, offense_category: str) -> str:
    """Check Medicaid eligibility for a person in re-entry.

    Args:
        state: Two-letter state code (e.g. "NY")
        offense_category: One of: non-violent, violent, drug, financial, other
    """
    state = state.upper()
    expanded = state in MEDICAID_EXPANSION_STATES

    if expanded:
        return (
            f"**Medicaid eligibility in {state}: Likely eligible.**\n\n"
            f"{state} has expanded Medicaid. Adults with income up to 138% of the "
            f"federal poverty line generally qualify regardless of conviction history.\n\n"
            f"Many states now allow Medicaid enrollment before release. "
            f"Contact your local Medicaid office or call 1-800-318-2596.\n\n"
            f"Apply: https://www.healthcare.gov/\n\n"
            "This is general information, not legal advice."
        )

    return (
        f"**Medicaid eligibility in {state}: May be limited.**\n\n"
        f"{state} has not expanded Medicaid. Eligibility depends on income, "
        f"disability status, pregnancy, or having dependent children.\n\n"
        f"Contact your local Medicaid office for specific requirements.\n"
        f"Apply: https://www.healthcare.gov/\n\n"
        "This is general information, not legal advice."
    )


@tool
def check_ssi_eligibility(state: str, offense_category: str) -> str:
    """Check SSI (Supplemental Security Income) eligibility for a person in re-entry.

    Args:
        state: Two-letter state code (e.g. "NY")
        offense_category: One of: non-violent, violent, drug, financial, other
    """
    state = state.upper()

    return (
        f"**SSI eligibility in {state}: Possible if you have a qualifying disability.**\n\n"
        "SSI is available to people with limited income and resources who are aged 65+, "
        "blind, or have a qualifying disability. Criminal history generally does not "
        "disqualify you, but you cannot receive SSI while incarcerated or if you have "
        "an outstanding warrant for a parole/probation violation.\n\n"
        "Key requirements:\n"
        "- Must have a qualifying disability (physical or mental)\n"
        "- Monthly income below ~$943 (2024 federal limit)\n"
        "- Resources below $2,000 ($3,000 for couples)\n\n"
        "If you were receiving SSI before incarceration, you may be able to restart "
        "benefits — apply within 30 days of release for faster processing.\n\n"
        "Apply: https://www.ssa.gov/ssi/ or call 1-800-772-1213\n\n"
        "This is general information, not legal advice."
    )


@tool
def get_benefits_links(state: str) -> str:
    """Get links to common benefits application portals for a given state.

    Args:
        state: Two-letter state code (e.g. "NY")
    """
    state = state.upper()
    return (
        f"**Benefits application links for {state}:**\n\n"
        f"- **SNAP (Food Stamps)**: https://www.benefits.gov/benefit/361\n"
        f"- **Medicaid**: https://www.healthcare.gov/\n"
        f"- **SSI**: https://www.ssa.gov/ssi/\n"
        f"- **General Benefits Finder**: https://www.benefits.gov/\n"
        f"- **211 (Local Resources)**: Call 211 or visit https://www.211.org/\n\n"
        f"For {state}-specific portals, search '{state} benefits portal' or call 211.\n\n"
        "This is general information, not legal advice."
    )
