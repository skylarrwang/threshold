"""Connecticut-specific SNAP, Medicaid/HUSKY, and Medicare Savings Program eligibility rules.

All constants reflect 2026 CT rules based on 2026 Federal Poverty Guidelines.
Source: CT DSS / 7 CFR 273 / user-provided 2026 technical report.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# ---------------------------------------------------------------------------
# 2026 CT SNAP constants
# ---------------------------------------------------------------------------

# Gross income limits (200% FPL, 2026) — CT uses Broad-Based Categorical Eligibility
CT_SNAP_GROSS_LIMITS: dict[int, float] = {
    1: 2794,
    2: 3786,
    3: 4778,
    4: 5770,
}
CT_SNAP_GROSS_ADDITIONAL = 992  # per additional household member beyond 4

# Net income limits (100% FPL, 2026)
CT_SNAP_NET_LIMITS: dict[int, float] = {
    1: 1397,
    2: 1893,
    3: 2389,
    4: 2885,
}
CT_SNAP_NET_ADDITIONAL = 496

# Deduction constants
CT_SNAP_UNEARNED_INCOME_DISREGARD = 562.00
CT_SNAP_EARNED_INCOME_DEDUCTION_RATE = 0.20
CT_SNAP_STANDARD_UTILITY_ALLOWANCE = 976.00  # SUA, effective Oct 2025
CT_SNAP_STANDARD_SHELTER_ALLOWANCE = 793.13
CT_SNAP_MEDICAL_EXPENSE_THRESHOLD = 35.00  # elderly/disabled only
CT_SNAP_DEPENDENT_CARE_MAX_CHILD = 200.00  # federal max per child
CT_SNAP_DEPENDENT_CARE_MAX_OTHER = 175.00  # federal max per other dependent
CT_SNAP_BENEFIT_REDUCTION_RATE = 0.30

# Maximum SNAP allotments (2026)
CT_SNAP_MAX_ALLOTMENT: dict[int, float] = {
    1: 298,
    2: 546,
    3: 785,
    4: 994,
    5: 1183,
    6: 1421,
}
CT_SNAP_MAX_ALLOTMENT_ADDITIONAL = 218

# ---------------------------------------------------------------------------
# 2026 CT Medicaid / HUSKY constants
# ---------------------------------------------------------------------------

# FPL percentages (MAGI-based, includes 5% disregard where applicable)
CT_HUSKY_D_FPL_PERCENT = 1.43  # childless adults: 138% + 5% disregard
CT_HUSKY_A_PARENTS_FPL_PERCENT = 1.60
CT_HUSKY_A_CHILDREN_FPL_PERCENT = 2.01
CT_HUSKY_A_PREGNANT_FPL_PERCENT = 2.63
CT_HUSKY_B_CHILDREN_FPL_PERCENT = 3.23  # CHIP

# HUSKY C (aged/blind/disabled) — flat income limits
CT_HUSKY_C_SINGLE = 1397.00
CT_HUSKY_C_COUPLE = 2252.00

# 100% FPL monthly (2026) — used as base for HUSKY percentage calculations
FPL_100_MONTHLY: dict[int, float] = {
    1: 1397,
    2: 1893,
    3: 2389,
    4: 2885,
}
FPL_100_ADDITIONAL = 496

# ---------------------------------------------------------------------------
# 2026 CT Medicare Savings Program (MSP) constants
# ---------------------------------------------------------------------------

CT_MSP_LIMITS: dict[str, dict[str, float]] = {
    "QMB": {"single": 2807, "couple": 3806},
    "SLMB": {"single": 3073, "couple": 4166},
    "ALMB": {"single": 3272, "couple": 4437},
}


# ---------------------------------------------------------------------------
# Result dataclasses
# ---------------------------------------------------------------------------


@dataclass
class CTSnapResult:
    eligible: bool
    gross_income: float
    gross_income_limit: float
    passes_gross_test: bool
    net_income: float
    net_income_limit: float
    passes_net_test: bool
    is_elderly_or_disabled: bool
    deductions_breakdown: dict[str, float] = field(default_factory=dict)
    estimated_monthly_benefit: float = 0.0
    notes: list[str] = field(default_factory=list)


@dataclass
class CTMedicaidResult:
    eligible: bool
    program: str  # "HUSKY A", "HUSKY B", "HUSKY C", "HUSKY D", or "None"
    monthly_income: float
    income_limit: float
    notes: list[str] = field(default_factory=list)


@dataclass
class CTMSPResult:
    eligible: bool
    program: str  # "QMB", "SLMB", "ALMB", or "None"
    monthly_income: float
    income_limit: float
    notes: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _get_limit(household_size: int, table: dict[int, float], additional: float) -> float:
    """Look up an income limit by household size, extrapolating for sizes beyond the table."""
    if household_size <= 0:
        household_size = 1
    max_key = max(table)
    if household_size <= max_key:
        return table[household_size]
    return table[max_key] + additional * (household_size - max_key)


def _get_max_allotment(household_size: int) -> float:
    if household_size <= 0:
        household_size = 1
    max_key = max(CT_SNAP_MAX_ALLOTMENT)
    if household_size <= max_key:
        return CT_SNAP_MAX_ALLOTMENT[household_size]
    return CT_SNAP_MAX_ALLOTMENT[max_key] + CT_SNAP_MAX_ALLOTMENT_ADDITIONAL * (household_size - max_key)


# ---------------------------------------------------------------------------
# SNAP calculation
# ---------------------------------------------------------------------------


def calculate_snap_deductions(
    *,
    monthly_earned_income: float,
    monthly_unearned_income: float,
    has_separate_utility_bill: bool,
    rent_or_mortgage: float,
    dependent_care_costs: float,
    child_support_paid: float,
    is_elderly_or_disabled: bool,
    medical_expenses: float,
    household_size: int,
) -> tuple[float, dict[str, float]]:
    """Calculate total SNAP deductions and return (total, breakdown).

    The net income formula (per 2026 CT rules):
    1. Start with gross income (earned + unearned)
    2. Subtract $562 unearned income disregard
    3. Subtract 20% earned income deduction
    4. Subtract dependent care costs
    5. Subtract child support paid
    6. Subtract medical expenses over $35 (elderly/disabled only)
    7. Calculate excess shelter deduction from remaining income
    """
    breakdown: dict[str, float] = {}

    # 1. Unearned income disregard
    unearned_disregard = min(CT_SNAP_UNEARNED_INCOME_DISREGARD, monthly_unearned_income)
    breakdown["unearned_income_disregard"] = unearned_disregard

    # 2. Earned income deduction (20%)
    earned_deduction = monthly_earned_income * CT_SNAP_EARNED_INCOME_DEDUCTION_RATE
    breakdown["earned_income_deduction"] = earned_deduction

    # 3. Dependent care
    breakdown["dependent_care"] = dependent_care_costs

    # 4. Child support paid
    breakdown["child_support_paid"] = child_support_paid

    # 5. Medical expenses (elderly/disabled only, amount over $35)
    medical_deduction = 0.0
    if is_elderly_or_disabled and medical_expenses > CT_SNAP_MEDICAL_EXPENSE_THRESHOLD:
        medical_deduction = medical_expenses - CT_SNAP_MEDICAL_EXPENSE_THRESHOLD
    breakdown["medical_expenses"] = medical_deduction

    # Subtotal before shelter
    non_shelter_deductions = (
        unearned_disregard
        + earned_deduction
        + dependent_care_costs
        + child_support_paid
        + medical_deduction
    )

    gross_income = monthly_earned_income + monthly_unearned_income
    income_after_deductions = max(gross_income - non_shelter_deductions, 0)

    # 6. Shelter costs
    shelter_costs = rent_or_mortgage
    if has_separate_utility_bill:
        shelter_costs += CT_SNAP_STANDARD_UTILITY_ALLOWANCE

    half_remaining = income_after_deductions * 0.5
    excess_shelter = max(shelter_costs - half_remaining, 0)

    # No cap on excess shelter deduction for elderly/disabled households
    # For others, excess shelter is uncapped in CT under BBCE (the $793.13 is the
    # standard shelter allowance used as an anchor, not a cap per the 2026 rules)
    breakdown["excess_shelter"] = excess_shelter

    total = non_shelter_deductions + excess_shelter
    return total, breakdown


def check_ct_snap(
    *,
    household_size: int,
    monthly_earned_income: float = 0.0,
    monthly_unearned_income: float = 0.0,
    rent_or_mortgage: float = 0.0,
    has_separate_utility_bill: bool = False,
    dependent_care_costs: float = 0.0,
    child_support_paid: float = 0.0,
    is_elderly_or_disabled: bool = False,
    medical_expenses: float = 0.0,
) -> CTSnapResult:
    """Run the full CT SNAP eligibility check and benefit estimation."""
    notes: list[str] = []
    gross_income = monthly_earned_income + monthly_unearned_income
    gross_limit = _get_limit(household_size, CT_SNAP_GROSS_LIMITS, CT_SNAP_GROSS_ADDITIONAL)
    net_limit = _get_limit(household_size, CT_SNAP_NET_LIMITS, CT_SNAP_NET_ADDITIONAL)

    # Elderly/disabled households bypass the gross income test
    if is_elderly_or_disabled:
        passes_gross = True
        notes.append(
            "Elderly/disabled household: gross income test waived under CT rules. "
            "Only the net income test applies."
        )
    else:
        passes_gross = gross_income <= gross_limit

    # Calculate deductions and net income
    total_deductions, deductions_breakdown = calculate_snap_deductions(
        monthly_earned_income=monthly_earned_income,
        monthly_unearned_income=monthly_unearned_income,
        has_separate_utility_bill=has_separate_utility_bill,
        rent_or_mortgage=rent_or_mortgage,
        dependent_care_costs=dependent_care_costs,
        child_support_paid=child_support_paid,
        is_elderly_or_disabled=is_elderly_or_disabled,
        medical_expenses=medical_expenses,
        household_size=household_size,
    )
    net_income = max(gross_income - total_deductions, 0)
    passes_net = net_income <= net_limit

    eligible = passes_gross and passes_net

    # Benefit estimate
    max_allotment = _get_max_allotment(household_size)
    estimated_benefit = max(max_allotment - (CT_SNAP_BENEFIT_REDUCTION_RATE * net_income), 0)
    # Round to nearest dollar
    estimated_benefit = round(estimated_benefit)

    if eligible:
        notes.append(f"Estimated monthly SNAP benefit: ${estimated_benefit}")
    if gross_income == 0 and monthly_earned_income == 0:
        notes.append("With zero income, you would receive the maximum allotment.")

    return CTSnapResult(
        eligible=eligible,
        gross_income=gross_income,
        gross_income_limit=gross_limit,
        passes_gross_test=passes_gross,
        net_income=net_income,
        net_income_limit=net_limit,
        passes_net_test=passes_net,
        is_elderly_or_disabled=is_elderly_or_disabled,
        deductions_breakdown=deductions_breakdown,
        estimated_monthly_benefit=estimated_benefit if eligible else 0.0,
        notes=notes,
    )


# ---------------------------------------------------------------------------
# Medicaid / HUSKY calculation
# ---------------------------------------------------------------------------


def check_ct_medicaid(
    *,
    household_size: int,
    monthly_income: float,
    age: int = 30,
    has_dependent_children: bool = False,
    is_pregnant: bool = False,
    is_disabled: bool = False,
    is_blind: bool = False,
) -> CTMedicaidResult:
    """Determine CT Medicaid/HUSKY program eligibility."""
    notes: list[str] = []
    fpl_100 = _get_limit(household_size, FPL_100_MONTHLY, FPL_100_ADDITIONAL)

    # Check programs from most generous to least
    # HUSKY A — pregnant women (263% FPL)
    if is_pregnant:
        limit = fpl_100 * CT_HUSKY_A_PREGNANT_FPL_PERCENT
        if monthly_income <= limit:
            notes.append("Criminal history does NOT affect Medicaid eligibility.")
            return CTMedicaidResult(
                eligible=True, program="HUSKY A (Pregnant)", monthly_income=monthly_income,
                income_limit=limit, notes=notes,
            )

    # HUSKY A — children (201% FPL) / HUSKY B — children CHIP (323% FPL)
    if age < 19:
        limit_a = fpl_100 * CT_HUSKY_A_CHILDREN_FPL_PERCENT
        limit_b = fpl_100 * CT_HUSKY_B_CHILDREN_FPL_PERCENT
        if monthly_income <= limit_a:
            return CTMedicaidResult(
                eligible=True, program="HUSKY A (Child)", monthly_income=monthly_income,
                income_limit=limit_a, notes=notes,
            )
        if monthly_income <= limit_b:
            notes.append("HUSKY B (CHIP) may have cost-sharing requirements.")
            return CTMedicaidResult(
                eligible=True, program="HUSKY B (CHIP)", monthly_income=monthly_income,
                income_limit=limit_b, notes=notes,
            )

    # HUSKY C — aged/blind/disabled
    if age >= 65 or is_disabled or is_blind:
        is_couple = household_size >= 2
        limit = CT_HUSKY_C_COUPLE if is_couple else CT_HUSKY_C_SINGLE
        if monthly_income <= limit:
            notes.append("HUSKY C has asset limits — verify with your local DSS office.")
            return CTMedicaidResult(
                eligible=True, program="HUSKY C (Aged/Blind/Disabled)",
                monthly_income=monthly_income, income_limit=limit, notes=notes,
            )

    # HUSKY A — parents/caretakers (160% FPL)
    if has_dependent_children:
        limit = fpl_100 * CT_HUSKY_A_PARENTS_FPL_PERCENT
        if monthly_income <= limit:
            notes.append("Criminal history does NOT affect Medicaid eligibility.")
            return CTMedicaidResult(
                eligible=True, program="HUSKY A (Parent/Caretaker)",
                monthly_income=monthly_income, income_limit=limit, notes=notes,
            )

    # HUSKY D — childless adults (143% FPL)
    if age >= 19:
        limit = fpl_100 * CT_HUSKY_D_FPL_PERCENT
        if monthly_income <= limit:
            notes.append("Criminal history does NOT affect Medicaid eligibility.")
            notes.append("HUSKY D has no asset test.")
            return CTMedicaidResult(
                eligible=True, program="HUSKY D (Adult)", monthly_income=monthly_income,
                income_limit=limit, notes=notes,
            )

    # Not eligible for any program
    # Find the closest program limit for context
    best_limit = fpl_100 * CT_HUSKY_D_FPL_PERCENT
    if has_dependent_children:
        best_limit = fpl_100 * CT_HUSKY_A_PARENTS_FPL_PERCENT
    notes.append(
        f"Monthly income (${monthly_income:,.0f}) exceeds the limit "
        f"(${best_limit:,.0f}). You may still qualify if your income changes."
    )
    return CTMedicaidResult(
        eligible=False, program="None", monthly_income=monthly_income,
        income_limit=best_limit, notes=notes,
    )


# ---------------------------------------------------------------------------
# Medicare Savings Programs (MSP)
# ---------------------------------------------------------------------------


def check_ct_msp(
    *,
    monthly_income: float,
    is_married: bool = False,
) -> CTMSPResult:
    """Check CT Medicare Savings Program eligibility (QMB/SLMB/ALMB)."""
    notes: list[str] = []
    key = "couple" if is_married else "single"

    # Check from most generous (QMB) to least (ALMB)
    for program in ("QMB", "SLMB", "ALMB"):
        limit = CT_MSP_LIMITS[program][key]
        if monthly_income <= limit:
            notes.append(f"No asset limit for {program} in Connecticut.")
            notes.append(
                f"{program} enrollment automatically qualifies you for "
                "Extra Help (Low-Income Subsidy) for Medicare Part D."
            )
            if program == "QMB":
                notes.append(
                    "QMB covers Medicare Part A and B premiums, deductibles, "
                    "and co-insurance."
                )
            elif program == "SLMB":
                notes.append("SLMB covers Medicare Part B premiums.")
            else:
                notes.append("ALMB covers Medicare Part B premiums.")
            return CTMSPResult(
                eligible=True, program=program, monthly_income=monthly_income,
                income_limit=limit, notes=notes,
            )

    almb_limit = CT_MSP_LIMITS["ALMB"][key]
    notes.append(
        f"Monthly income (${monthly_income:,.0f}) exceeds the ALMB limit "
        f"(${almb_limit:,.0f})."
    )
    return CTMSPResult(
        eligible=False, program="None", monthly_income=monthly_income,
        income_limit=almb_limit, notes=notes,
    )
