from __future__ import annotations

import unittest
from unittest.mock import patch

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from threshold.tools.form_filler.loop import (
    MAX_CONTEXT_SCREENSHOTS,
    _trim_old_screenshots,
    run_form_fill,
)
from threshold.tools.form_filler.types import FormFillRequest


class TrimOldScreenshotsTests(unittest.TestCase):
    def test_trim_old_screenshots_keeps_only_latest_image_messages(self) -> None:
        messages = []
        total = MAX_CONTEXT_SCREENSHOTS + 2
        for idx in range(total):
            messages.append(
                HumanMessage(content=[
                    {"type": "text", "text": f"step-{idx}"},
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": "x"}},
                ])
            )

        _trim_old_screenshots(messages)

        stripped = messages[:2]
        kept = messages[2:]

        for idx, message in enumerate(stripped):
            self.assertEqual(message.content, [{"type": "text", "text": f"step-{idx}"}])
        for message in kept:
            self.assertEqual(len(message.content), 2)


class FakeBoundModel:
    def __init__(self, responses: list[AIMessage | Exception]) -> None:
        self.responses = responses
        self.calls = 0

    def invoke(self, messages):
        response = self.responses[self.calls]
        self.calls += 1
        if isinstance(response, Exception):
            raise response
        return response


class FakeChatAnthropic:
    def __init__(self, *, model: str) -> None:
        self.model = model

    def bind_tools(self, _tools):
        return self.bound_model


class FakeBrowserSession:
    def __init__(self, *, width: int, height: int) -> None:
        self.width = width
        self.height = height
        self.live_view_url = "https://browserbase.example/live"
        self.closed = False
        self.execute_calls: list[dict] = []
        self.start_error: Exception | None = None
        self.action_error: Exception | None = None

    def start(self, _url: str) -> bytes:
        if self.start_error:
            raise self.start_error
        return b"initial-shot"

    def execute_action(self, action_input: dict) -> bytes:
        self.execute_calls.append(action_input)
        if self.action_error:
            raise self.action_error
        return b"after-action"

    def close(self) -> None:
        self.closed = True


class RunFormFillTests(unittest.TestCase):
    def setUp(self) -> None:
        self.request = FormFillRequest(
            url="https://example.gov/form",
            instructions="Fill out the form at https://example.gov/form",
            form_data={"name": "Marcus"},
        )

    def test_run_form_fill_returns_failed_when_browser_cannot_start(self) -> None:
        fake_session = FakeBrowserSession(width=1280, height=720)
        fake_session.start_error = RuntimeError("browser unavailable")
        fake_chat = FakeChatAnthropic(model="claude-sonnet-4-6")
        fake_chat.bound_model = FakeBoundModel(responses=[])

        with patch("threshold.tools.form_filler.loop.BrowserSession", return_value=fake_session), patch(
            "threshold.tools.form_filler.loop.ChatAnthropic",
            return_value=fake_chat,
        ):
            result = run_form_fill(self.request)

        self.assertEqual(result.status, "failed")
        self.assertIn("Failed to open the page: browser unavailable", result.summary)
        self.assertEqual(result.live_view_url, "https://browserbase.example/live")
        self.assertEqual(result.fields_filled, {})

    def test_run_form_fill_executes_tool_actions_and_returns_completed_result(self) -> None:
        fake_session = FakeBrowserSession(width=1280, height=720)
        fake_model = FakeBoundModel(
            responses=[
                AIMessage(
                    content=[
                        {"type": "tool_use", "id": "tool-1", "name": "computer", "input": {"action": "type", "text": "Marcus"}},
                        {"type": "text", "text": "Filling fields"},
                    ]
                ),
                AIMessage(content="Filled name field and stopped before submit."),
            ]
        )
        fake_chat = FakeChatAnthropic(model="claude-sonnet-4-6")
        fake_chat.bound_model = fake_model

        with patch("threshold.tools.form_filler.loop.BrowserSession", return_value=fake_session), patch(
            "threshold.tools.form_filler.loop.ChatAnthropic",
            return_value=fake_chat,
        ):
            result = run_form_fill(self.request)

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.summary, "Filled name field and stopped before submit.")
        self.assertEqual(result.live_view_url, "https://browserbase.example/live")
        self.assertEqual(result.fields_filled, {"name": "Marcus"})
        self.assertEqual(result.screenshot_base64, "YWZ0ZXItYWN0aW9u")
        self.assertEqual(fake_session.execute_calls, [{"action": "type", "text": "Marcus"}])
        self.assertTrue(fake_session.closed)

    def test_run_form_fill_returns_model_error_summary_when_invoke_fails(self) -> None:
        fake_session = FakeBrowserSession(width=1280, height=720)
        fake_model = FakeBoundModel(responses=[RuntimeError("anthropic boom")])
        fake_chat = FakeChatAnthropic(model="claude-sonnet-4-6")
        fake_chat.bound_model = fake_model

        with patch("threshold.tools.form_filler.loop.BrowserSession", return_value=fake_session), patch(
            "threshold.tools.form_filler.loop.ChatAnthropic",
            return_value=fake_chat,
        ):
            result = run_form_fill(self.request)

        self.assertEqual(result.status, "failed")
        self.assertEqual(result.summary, "Model error at step 1: anthropic boom")
        self.assertEqual(result.screenshot_base64, "aW5pdGlhbC1zaG90")
        self.assertTrue(fake_session.closed)

    def test_run_form_fill_records_tool_errors_and_uses_followup_summary(self) -> None:
        fake_session = FakeBrowserSession(width=1280, height=720)
        fake_session.action_error = RuntimeError("cannot click")
        fake_model = FakeBoundModel(
            responses=[
                AIMessage(
                    content=[
                        {"type": "tool_use", "id": "tool-1", "name": "computer", "input": {"action": "left_click", "coordinate": [1, 2]}},
                    ]
                ),
                AIMessage(content="Stopped because the form interaction failed."),
            ]
        )
        fake_chat = FakeChatAnthropic(model="claude-sonnet-4-6")
        fake_chat.bound_model = fake_model

        with patch("threshold.tools.form_filler.loop.BrowserSession", return_value=fake_session), patch(
            "threshold.tools.form_filler.loop.ChatAnthropic",
            return_value=fake_chat,
        ):
            result = run_form_fill(self.request)

        self.assertEqual(result.status, "completed")
        self.assertEqual(result.summary, "Stopped because the form interaction failed.")
        self.assertEqual(result.screenshot_base64, "aW5pdGlhbC1zaG90")
        self.assertTrue(fake_session.closed)
