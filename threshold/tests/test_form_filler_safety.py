from __future__ import annotations

import unittest

from threshold.memory.profile import UserProfile
from threshold.tools.form_filler.safety import filter_profile_for_form, is_url_allowed


class FormFillerSafetyTests(unittest.TestCase):
    def test_is_url_allowed_accepts_gov_and_preapproved_domains(self) -> None:
        self.assertTrue(is_url_allowed("https://www.irs.gov/payments"))
        self.assertTrue(is_url_allowed("https://www.211.org/help"))

    def test_is_url_allowed_rejects_unapproved_domains(self) -> None:
        self.assertFalse(is_url_allowed("https://example.com/form"))

    def test_filter_profile_for_form_keeps_safe_fields_only(self) -> None:
        profile = UserProfile()
        profile.personal.name = "Marcus"
        profile.personal.home_state = "CT"
        profile.personal.age_range = "25-34"
        profile.personal.time_served = "5 years"
        profile.personal.offense_category = "drug"
        profile.situation.housing_status = "shelter"
        profile.situation.employment_status = "part-time"
        profile.situation.supervision_type = "parole"
        profile.situation.supervision_end_date = "2026-12-31"
        profile.goals.strengths = ["organized", "persistent"]
        profile.goals.concerns = ["privacy"]
        profile.support.case_worker_name = "Jane Doe"

        filtered = filter_profile_for_form(profile)

        self.assertEqual(
            filtered,
            {
                "name": "Marcus",
                "state": "CT",
                "age_range": "25-34",
                "housing_status": "shelter",
                "employment_status": "part-time",
                "strengths": "organized, persistent",
                "case_worker": "Jane Doe",
            },
        )

