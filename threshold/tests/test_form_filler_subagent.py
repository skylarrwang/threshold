from __future__ import annotations

import unittest
from unittest.mock import patch

from langchain_core.messages import AIMessage, HumanMessage

from threshold.agents.subagents.form_filler import _extract_url, fill_node
from threshold.memory.profile import UserProfile
from threshold.tools.form_filler.types import FormFillResult


class ExtractUrlTests(unittest.TestCase):
    def test_extract_url_returns_first_url(self) -> None:
        text = "Please fill https://www.irs.gov/forms?id=123 for me"
        self.assertEqual(_extract_url(text), "https://www.irs.gov/forms?id=123")

    def test_extract_url_returns_none_when_absent(self) -> None:
        self.assertIsNone(_extract_url("No link here"))


class FillNodeTests(unittest.TestCase):
    def test_fill_node_rejects_missing_url(self) -> None:
        result = fill_node({"messages": [HumanMessage(content="Please fill this form")]})

        message = result["messages"][0]
        self.assertIsInstance(message, AIMessage)
        self.assertIn("could not find a URL", message.content)

    def test_fill_node_rejects_disallowed_url(self) -> None:
        result = fill_node({"messages": [HumanMessage(content="Fill https://example.com/form")]})

        self.assertIn("not on the approved list", result["messages"][0].content)

    def test_fill_node_runs_form_fill_with_filtered_profile_data(self) -> None:
        profile = UserProfile()
        profile.personal.name = "Marcus"
        profile.personal.home_state = "CT"
        run_result = FormFillResult(
            status="completed",
            summary="Completed safely.",
            live_view_url="https://browserbase.example/live",
            fields_filled={"name": "Marcus"},
        )

        with patch("threshold.agents.subagents.form_filler.load_profile", return_value=profile), patch(
            "threshold.agents.subagents.form_filler.run_form_fill",
            return_value=run_result,
        ) as run_form_fill_mock:
            result = fill_node(
                {"messages": [HumanMessage(content="Fill https://www.irs.gov/apply using my profile")]}
            )

        request = run_form_fill_mock.call_args.args[0]
        self.assertEqual(request.url, "https://www.irs.gov/apply")
        self.assertEqual(request.form_data, {"name": "Marcus", "state": "CT", "employment_status": "unemployed"})
        content = result["messages"][0].content
        self.assertIn("https://browserbase.example/live", content)
        self.assertIn("Completed safely.", content)
        self.assertIn("- name: Marcus", content)
        self.assertIn("submit it yourself", content)

    def test_fill_node_handles_form_fill_errors(self) -> None:
        with patch("threshold.agents.subagents.form_filler.load_profile", return_value=None), patch(
            "threshold.agents.subagents.form_filler.run_form_fill",
            side_effect=RuntimeError("browser failed"),
        ):
            result = fill_node(
                {"messages": [HumanMessage(content="Fill https://www.irs.gov/apply using my profile")]}
            )

        self.assertIn("encountered an error", result["messages"][0].content)
        self.assertIn("browser failed", result["messages"][0].content)

    def test_fill_node_handles_non_string_message_content(self) -> None:
        with patch("threshold.agents.subagents.form_filler.load_profile", return_value=None), patch(
            "threshold.agents.subagents.form_filler.run_form_fill",
            return_value=FormFillResult(status="failed", summary="Could not proceed.", fields_filled={}),
        ):
            result = fill_node(
                {"messages": [HumanMessage(content=[{"type": "text", "text": "Fill https://www.irs.gov/apply"}])]}
            )

        self.assertIn("Could not proceed.", result["messages"][0].content)
        self.assertIn("not successful", result["messages"][0].content)
