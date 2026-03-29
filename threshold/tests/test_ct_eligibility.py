from __future__ import annotations

import unittest

from threshold.agents.subagents.benefits import benefits_subagent
from threshold.tools.ct_eligibility import (
    CT_SNAP_GROSS_LIMITS,
    CT_SNAP_MAX_ALLOTMENT,
    CT_SNAP_NET_LIMITS,
    CTMedicaidResult,
    CTMSPResult,
    CTSnapResult,
    _get_limit,
    _get_max_allotment,
    calculate_snap_deductions,
    check_ct_medicaid,
    check_ct_msp,
    check_ct_snap,
)
from threshold.tools.benefits_lookup import (
    ct_medicaid_eligibility_check,
    ct_msp_eligibility_check,
    ct_snap_eligibility_check,
)
from threshold.memory.profile import FinancialContext, UserProfile


class FPLLimitLookupTests(unittest.TestCase):
    def test_known_household_sizes(self) -> None:
        self.assertEqual(_get_limit(1, CT_SNAP_GROSS_LIMITS, 992), 2794)
        self.assertEqual(_get_limit(2, CT_SNAP_GROSS_LIMITS, 992), 3786)
        self.assertEqual(_get_limit(4, CT_SNAP_GROSS_LIMITS, 992), 5770)

    def test_extrapolation_beyond_table(self) -> None:
        # HH5 = 5770 + 992 = 6762
        self.assertEqual(_get_limit(5, CT_SNAP_GROSS_LIMITS, 992), 6762)
        # HH8 = 5770 + 992*4 = 9738
        self.assertEqual(_get_limit(8, CT_SNAP_GROSS_LIMITS, 992), 9738)

    def test_zero_household_treated_as_one(self) -> None:
        self.assertEqual(_get_limit(0, CT_SNAP_GROSS_LIMITS, 992), 2794)

    def test_net_limits(self) -> None:
        self.assertEqual(_get_limit(1, CT_SNAP_NET_LIMITS, 496), 1397)
        self.assertEqual(_get_limit(4, CT_SNAP_NET_LIMITS, 496), 2885)
        # HH5 = 2885 + 496 = 3381
        self.assertEqual(_get_limit(5, CT_SNAP_NET_LIMITS, 496), 3381)


class MaxAllotmentTests(unittest.TestCase):
    def test_known_sizes(self) -> None:
        self.assertEqual(_get_max_allotment(1), 298)
        self.assertEqual(_get_max_allotment(4), 994)
        self.assertEqual(_get_max_allotment(6), 1421)

    def test_extrapolation(self) -> None:
        # HH7 = 1421 + 218 = 1639
        self.assertEqual(_get_max_allotment(7), 1639)
        # HH8 = 1421 + 218*2 = 1857
        self.assertEqual(_get_max_allotment(8), 1857)


class DeductionTests(unittest.TestCase):
    def test_unearned_income_disregard(self) -> None:
        total, breakdown = calculate_snap_deductions(
            monthly_earned_income=0,
            monthly_unearned_income=800,
            has_separate_utility_bill=False,
            rent_or_mortgage=0,
            dependent_care_costs=0,
            child_support_paid=0,
            is_elderly_or_disabled=False,
            medical_expenses=0,
            household_size=1,
        )
        self.assertEqual(breakdown["unearned_income_disregard"], 562)

    def test_unearned_disregard_capped_at_unearned_income(self) -> None:
        _, breakdown = calculate_snap_deductions(
            monthly_earned_income=0,
            monthly_unearned_income=300,
            has_separate_utility_bill=False,
            rent_or_mortgage=0,
            dependent_care_costs=0,
            child_support_paid=0,
            is_elderly_or_disabled=False,
            medical_expenses=0,
            household_size=1,
        )
        self.assertEqual(breakdown["unearned_income_disregard"], 300)

    def test_earned_income_deduction(self) -> None:
        _, breakdown = calculate_snap_deductions(
            monthly_earned_income=2000,
            monthly_unearned_income=0,
            has_separate_utility_bill=False,
            rent_or_mortgage=0,
            dependent_care_costs=0,
            child_support_paid=0,
            is_elderly_or_disabled=False,
            medical_expenses=0,
            household_size=1,
        )
        self.assertEqual(breakdown["earned_income_deduction"], 400)  # 20% of 2000

    def test_sua_applied_when_separate_utility(self) -> None:
        _, breakdown = calculate_snap_deductions(
            monthly_earned_income=0,
            monthly_unearned_income=0,
            has_separate_utility_bill=True,
            rent_or_mortgage=500,
            dependent_care_costs=0,
            child_support_paid=0,
            is_elderly_or_disabled=False,
            medical_expenses=0,
            household_size=1,
        )
        # Shelter = 500 + 976 = 1476, half of remaining (0) = 0, excess = 1476
        self.assertEqual(breakdown["excess_shelter"], 1476)

    def test_medical_deduction_elderly_disabled(self) -> None:
        _, breakdown = calculate_snap_deductions(
            monthly_earned_income=0,
            monthly_unearned_income=1000,
            has_separate_utility_bill=False,
            rent_or_mortgage=0,
            dependent_care_costs=0,
            child_support_paid=0,
            is_elderly_or_disabled=True,
            medical_expenses=100,
            household_size=1,
        )
        self.assertEqual(breakdown["medical_expenses"], 65)  # 100 - 35

    def test_medical_deduction_not_elderly(self) -> None:
        _, breakdown = calculate_snap_deductions(
            monthly_earned_income=0,
            monthly_unearned_income=1000,
            has_separate_utility_bill=False,
            rent_or_mortgage=0,
            dependent_care_costs=0,
            child_support_paid=0,
            is_elderly_or_disabled=False,
            medical_expenses=100,
            household_size=1,
        )
        self.assertEqual(breakdown["medical_expenses"], 0)


class SNAPEligibilityTests(unittest.TestCase):
    def test_zero_income_gets_max_benefit(self) -> None:
        result = check_ct_snap(household_size=1)
        self.assertTrue(result.eligible)
        self.assertTrue(result.passes_gross_test)
        self.assertTrue(result.passes_net_test)
        self.assertEqual(result.estimated_monthly_benefit, 298)

    def test_family_of_four_zero_income(self) -> None:
        result = check_ct_snap(household_size=4)
        self.assertTrue(result.eligible)
        self.assertEqual(result.estimated_monthly_benefit, 994)

    def test_over_gross_income_limit(self) -> None:
        result = check_ct_snap(
            household_size=1,
            monthly_earned_income=3000,
        )
        self.assertFalse(result.eligible)
        self.assertFalse(result.passes_gross_test)

    def test_elderly_disabled_bypass_gross_test(self) -> None:
        result = check_ct_snap(
            household_size=1,
            monthly_earned_income=3000,
            is_elderly_or_disabled=True,
        )
        self.assertTrue(result.passes_gross_test)

    def test_moderate_income_with_shelter_deductions(self) -> None:
        result = check_ct_snap(
            household_size=3,
            monthly_earned_income=2000,
            monthly_unearned_income=500,
            rent_or_mortgage=1200,
            has_separate_utility_bill=True,
        )
        self.assertTrue(result.eligible)
        self.assertGreater(result.estimated_monthly_benefit, 0)
        # Verify deductions are reasonable
        self.assertIn("earned_income_deduction", result.deductions_breakdown)
        self.assertIn("excess_shelter", result.deductions_breakdown)

    def test_benefit_floors_at_zero(self) -> None:
        # High income but just under gross limit
        result = check_ct_snap(
            household_size=1,
            monthly_earned_income=2700,
        )
        # Even if eligible, benefit shouldn't go negative
        self.assertGreaterEqual(result.estimated_monthly_benefit, 0)


class MedicaidEligibilityTests(unittest.TestCase):
    def test_childless_adult_husky_d(self) -> None:
        result = check_ct_medicaid(
            household_size=1,
            monthly_income=1500,
            age=30,
        )
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "HUSKY D (Adult)")

    def test_parent_husky_a(self) -> None:
        result = check_ct_medicaid(
            household_size=3,
            monthly_income=3000,
            age=35,
            has_dependent_children=True,
        )
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "HUSKY A (Parent/Caretaker)")

    def test_pregnant_husky_a(self) -> None:
        result = check_ct_medicaid(
            household_size=1,
            monthly_income=3000,
            age=25,
            is_pregnant=True,
        )
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "HUSKY A (Pregnant)")

    def test_child_husky_a(self) -> None:
        result = check_ct_medicaid(
            household_size=3,
            monthly_income=2000,
            age=10,
        )
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "HUSKY A (Child)")

    def test_disabled_husky_c(self) -> None:
        result = check_ct_medicaid(
            household_size=1,
            monthly_income=1200,
            age=50,
            is_disabled=True,
        )
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "HUSKY C (Aged/Blind/Disabled)")

    def test_over_income_not_eligible(self) -> None:
        result = check_ct_medicaid(
            household_size=1,
            monthly_income=5000,
            age=30,
        )
        self.assertFalse(result.eligible)
        self.assertEqual(result.program, "None")


class MSPEligibilityTests(unittest.TestCase):
    def test_qmb_eligible_single(self) -> None:
        result = check_ct_msp(monthly_income=2500, is_married=False)
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "QMB")

    def test_slmb_eligible(self) -> None:
        result = check_ct_msp(monthly_income=2900, is_married=False)
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "SLMB")

    def test_almb_eligible(self) -> None:
        result = check_ct_msp(monthly_income=3100, is_married=False)
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "ALMB")

    def test_over_income(self) -> None:
        result = check_ct_msp(monthly_income=5000, is_married=False)
        self.assertFalse(result.eligible)

    def test_couple_limits(self) -> None:
        result = check_ct_msp(monthly_income=3500, is_married=True)
        self.assertTrue(result.eligible)
        self.assertEqual(result.program, "QMB")


class CTBenefitsToolWrapperTests(unittest.TestCase):
    def test_ct_snap_tool_formats_eligible_response(self) -> None:
        response = ct_snap_eligibility_check.invoke(
            {
                "household_size": 1,
                "monthly_earned_income": 0,
                "monthly_unearned_income": 0,
                "rent_or_mortgage": 0,
                "has_separate_utility_bill": False,
                "dependent_care_costs": 0,
                "child_support_paid": 0,
                "is_elderly_or_disabled": False,
                "medical_expenses": 0,
            }
        )

        self.assertIn("CT SNAP Screening Result: Likely ELIGIBLE", response)
        self.assertIn("Estimated monthly benefit: $298", response)
        self.assertIn("Apply online: https://connect.ct.gov", response)

    def test_ct_snap_tool_formats_ineligible_response(self) -> None:
        response = ct_snap_eligibility_check.invoke(
            {
                "household_size": 1,
                "monthly_earned_income": 3000,
            }
        )

        self.assertIn("CT SNAP Screening Result: Likely NOT ELIGIBLE", response)
        self.assertIn("Gross income test: **FAIL**", response)
        self.assertIn("Contact CT DSS for a full determination.", response)

    def test_ct_medicaid_tool_formats_program_and_notes(self) -> None:
        response = ct_medicaid_eligibility_check.invoke(
            {
                "household_size": 1,
                "monthly_income": 1500,
                "age": 30,
            }
        )

        self.assertIn("CT Medicaid/HUSKY Screening Result: Likely ELIGIBLE", response)
        self.assertIn("Program: **HUSKY D (Adult)**", response)
        self.assertIn("Criminal history does NOT affect Medicaid eligibility.", response)
        self.assertIn("https://www.accesshealthct.com", response)

    def test_ct_msp_tool_formats_program_tier(self) -> None:
        response = ct_msp_eligibility_check.invoke(
            {
                "monthly_income": 2500,
                "is_married": False,
            }
        )

        self.assertIn("CT Medicare Savings Program Screening: Likely ELIGIBLE", response)
        self.assertIn("Program: **QMB**", response)
        self.assertIn("No asset limit for QMB in Connecticut.", response)


class BenefitsSubagentRegistrationTests(unittest.TestCase):
    def test_benefits_subagent_registers_ct_tools(self) -> None:
        tool_names = {tool.name for tool in benefits_subagent["tools"]}

        self.assertIn("ct_snap_eligibility_check", tool_names)
        self.assertIn("ct_medicaid_eligibility_check", tool_names)
        self.assertIn("ct_msp_eligibility_check", tool_names)

    def test_benefits_subagent_prompt_mentions_ct_screening(self) -> None:
        prompt = benefits_subagent["system_prompt"]

        self.assertIn("Connecticut-Specific Detailed Screening", prompt)
        self.assertIn("ct_snap_eligibility_check", prompt)
        self.assertIn("ct_msp_eligibility_check", prompt)


class ProfileBackwardCompatTests(unittest.TestCase):
    def test_old_profile_without_financial(self) -> None:
        old_data = {
            "user_id": "test-123",
            "personal": {"name": "Test", "home_state": "CT"},
            "situation": {"housing_status": "housed"},
        }
        profile = UserProfile.model_validate(old_data)
        self.assertEqual(profile.financial.household_size, 1)
        self.assertEqual(profile.financial.income.job_income_monthly, 0.0)

    def test_financial_context_defaults(self) -> None:
        profile = UserProfile()
        self.assertIsInstance(profile.financial, FinancialContext)
        self.assertEqual(profile.financial.household_size, 1)
        self.assertFalse(profile.financial.is_employed)
