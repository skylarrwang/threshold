from langchain_core.tools import tool

from .ct_eligibility import check_ct_medicaid, check_ct_msp, check_ct_snap

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


# ---------------------------------------------------------------------------
# Connecticut-specific detailed eligibility tools (2026 rules)
# ---------------------------------------------------------------------------


@tool
def ct_snap_eligibility_check(
    household_size: int,
    monthly_earned_income: float = 0.0,
    monthly_unearned_income: float = 0.0,
    rent_or_mortgage: float = 0.0,
    has_separate_utility_bill: bool = False,
    dependent_care_costs: float = 0.0,
    child_support_paid: float = 0.0,
    is_elderly_or_disabled: bool = False,
    medical_expenses: float = 0.0,
) -> str:
    """Run a detailed CT SNAP eligibility screening with benefit estimation (2026 rules).

    This performs the full Connecticut SNAP calculation: gross income test (200% FPL),
    net income test (100% FPL) with all deductions, and estimated monthly benefit.

    Args:
        household_size: Number of people in the household
        monthly_earned_income: Monthly income from jobs or self-employment
        monthly_unearned_income: Monthly unearned income (SSI, Social Security, unemployment,
            child support received, interest, rental, alimony, veterans, pensions, etc.)
        rent_or_mortgage: Monthly rent or mortgage payment
        has_separate_utility_bill: Whether household has a separate heating/cooling bill
            (triggers Standard Utility Allowance of $976)
        dependent_care_costs: Monthly dependent care costs (daycare, babysitter, etc.)
        child_support_paid: Monthly court-ordered child support payments made
        is_elderly_or_disabled: Whether any household member is 60+ or disabled
            (bypasses gross income test, unlocks medical deduction)
        medical_expenses: Monthly out-of-pocket medical expenses (only counted if
            elderly/disabled, and only the amount over $35)
    """
    result = check_ct_snap(
        household_size=household_size,
        monthly_earned_income=monthly_earned_income,
        monthly_unearned_income=monthly_unearned_income,
        rent_or_mortgage=rent_or_mortgage,
        has_separate_utility_bill=has_separate_utility_bill,
        dependent_care_costs=dependent_care_costs,
        child_support_paid=child_support_paid,
        is_elderly_or_disabled=is_elderly_or_disabled,
        medical_expenses=medical_expenses,
    )

    status = "Likely ELIGIBLE" if result.eligible else "Likely NOT ELIGIBLE"
    lines = [f"**CT SNAP Screening Result: {status}**\n"]

    # Income tests
    gross_status = "PASS" if result.passes_gross_test else "FAIL"
    net_status = "PASS" if result.passes_net_test else "FAIL"

    if result.is_elderly_or_disabled:
        lines.append(
            f"- Gross income test: **WAIVED** (elderly/disabled household)"
        )
    else:
        lines.append(
            f"- Gross income test: **{gross_status}** — "
            f"${result.gross_income:,.0f} vs ${result.gross_income_limit:,.0f} limit (200% FPL)"
        )
    lines.append(
        f"- Net income test: **{net_status}** — "
        f"${result.net_income:,.0f} vs ${result.net_income_limit:,.0f} limit (100% FPL)"
    )

    # Deductions breakdown
    lines.append("\n**Deductions applied:**")
    for name, amount in result.deductions_breakdown.items():
        if amount > 0:
            label = name.replace("_", " ").title()
            lines.append(f"- {label}: ${amount:,.2f}")

    # Benefit estimate
    if result.eligible:
        lines.append(
            f"\n**Estimated monthly benefit: ${result.estimated_monthly_benefit:,.0f}**"
        )
        lines.append(
            "\nApply online: https://connect.ct.gov\n"
            "Or call CT DSS: 1-855-626-6632"
        )
    else:
        lines.append(
            "\nYou may still qualify if your circumstances change. "
            "Contact CT DSS for a full determination."
        )

    # Notes
    for note in result.notes:
        lines.append(f"\n> {note}")

    lines.append(
        "\n---\n*This is a screening estimate based on 2026 CT rules, not a final "
        "determination. Apply through ConneCT for official results.*"
    )
    return "\n".join(lines)


@tool
def ct_medicaid_eligibility_check(
    household_size: int,
    monthly_income: float,
    age: int = 30,
    has_dependent_children: bool = False,
    is_pregnant: bool = False,
    is_disabled: bool = False,
    is_blind: bool = False,
) -> str:
    """Run a detailed CT Medicaid/HUSKY Health eligibility screening (2026 rules).

    Determines which HUSKY program the person may qualify for:
    - HUSKY A: children (201% FPL), parents (160% FPL), pregnant women (263% FPL)
    - HUSKY B: children CHIP (323% FPL)
    - HUSKY C: aged 65+, blind, or disabled (flat income limits)
    - HUSKY D: childless adults (143% FPL)

    Criminal history does NOT affect Medicaid eligibility in Connecticut.

    Args:
        household_size: Number of people in the household
        monthly_income: Total monthly household income
        age: Age of the applicant
        has_dependent_children: Whether applicant has dependent children under 19
        is_pregnant: Whether the applicant is pregnant
        is_disabled: Whether the applicant has a qualifying disability
        is_blind: Whether the applicant is blind
    """
    result = check_ct_medicaid(
        household_size=household_size,
        monthly_income=monthly_income,
        age=age,
        has_dependent_children=has_dependent_children,
        is_pregnant=is_pregnant,
        is_disabled=is_disabled,
        is_blind=is_blind,
    )

    status = "Likely ELIGIBLE" if result.eligible else "Likely NOT ELIGIBLE"
    lines = [f"**CT Medicaid/HUSKY Screening Result: {status}**\n"]

    if result.eligible:
        lines.append(f"- Program: **{result.program}**")
        lines.append(
            f"- Monthly income: ${result.monthly_income:,.0f} vs "
            f"${result.income_limit:,.0f} limit"
        )
        lines.append(
            "\n**How to apply:**"
        )
        if "HUSKY C" in result.program:
            lines.append(
                "- Online: https://connect.ct.gov\n"
                "- Phone: 1-855-626-6632"
            )
        else:
            lines.append(
                "- Online: https://www.accesshealthct.com\n"
                "- Phone: 1-855-805-4325"
            )
    else:
        lines.append(
            f"- Monthly income: ${result.monthly_income:,.0f} vs "
            f"${result.income_limit:,.0f} limit"
        )

    for note in result.notes:
        lines.append(f"\n> {note}")

    lines.append(
        "\n---\n*This is a screening estimate based on 2026 CT rules, not a final "
        "determination. Criminal history does NOT affect Medicaid eligibility.*"
    )
    return "\n".join(lines)


@tool
def ct_msp_eligibility_check(
    monthly_income: float,
    is_married: bool = False,
) -> str:
    """Check CT Medicare Savings Program eligibility — QMB, SLMB, ALMB (2026 rules).

    Medicare Savings Programs help pay Medicare premiums and cost-sharing.
    Connecticut has NO asset limit for MSP programs.
    Enrollment auto-qualifies for Extra Help (Part D Low-Income Subsidy).

    Args:
        monthly_income: Applicant's monthly income
        is_married: Whether the applicant is married (uses couple limits)
    """
    result = check_ct_msp(monthly_income=monthly_income, is_married=is_married)

    status = "Likely ELIGIBLE" if result.eligible else "Likely NOT ELIGIBLE"
    lines = [f"**CT Medicare Savings Program Screening: {status}**\n"]

    if result.eligible:
        lines.append(f"- Program: **{result.program}**")
        lines.append(
            f"- Monthly income: ${result.monthly_income:,.0f} vs "
            f"${result.income_limit:,.0f} limit"
        )
    else:
        lines.append(
            f"- Monthly income: ${result.monthly_income:,.0f} vs "
            f"${result.income_limit:,.0f} limit (ALMB)"
        )

    for note in result.notes:
        lines.append(f"\n> {note}")

    lines.append(
        "\nApply: https://connect.ct.gov or call 1-855-626-6632"
    )
    lines.append(
        "\n---\n*This is a screening estimate based on 2026 CT rules, not a final determination.*"
    )
    return "\n".join(lines)
