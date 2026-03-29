from __future__ import annotations

import unittest
from unittest.mock import patch

from threshold.tools.form_filler.browser import BrowserSession, _normalize_key


class FakeMouse:
    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def click(self, *args, **kwargs) -> None:
        self.calls.append(("click", args, kwargs))

    def dblclick(self, *args, **kwargs) -> None:
        self.calls.append(("dblclick", args, kwargs))

    def move(self, *args, **kwargs) -> None:
        self.calls.append(("move", args, kwargs))

    def wheel(self, *args, **kwargs) -> None:
        self.calls.append(("wheel", args, kwargs))

    def down(self) -> None:
        self.calls.append(("down", (), {}))

    def up(self) -> None:
        self.calls.append(("up", (), {}))


class FakeKeyboard:
    def __init__(self) -> None:
        self.calls: list[tuple] = []

    def type(self, *args, **kwargs) -> None:
        self.calls.append(("type", args, kwargs))

    def press(self, *args, **kwargs) -> None:
        self.calls.append(("press", args, kwargs))


class FakePage:
    def __init__(self) -> None:
        self.mouse = FakeMouse()
        self.keyboard = FakeKeyboard()
        self.screenshot_calls = 0

    def screenshot(self, type: str = "png") -> bytes:
        self.screenshot_calls += 1
        return f"screenshot-{self.screenshot_calls}".encode()


class BrowserHelpersTests(unittest.TestCase):
    def test_normalize_key_maps_single_key(self) -> None:
        self.assertEqual(_normalize_key("Return"), ["Enter"])

    def test_normalize_key_splits_and_maps_compound_keys(self) -> None:
        self.assertEqual(_normalize_key("Down Down Tab"), ["ArrowDown", "ArrowDown", "Tab"])


class BrowserSessionActionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.session = BrowserSession.__new__(BrowserSession)
        self.session.width = 1280
        self.session.height = 720
        self.session._page = FakePage()

    @patch("threshold.tools.form_filler.browser.time.sleep", return_value=None)
    def test_execute_action_presses_each_normalized_key(self, _sleep) -> None:
        screenshot = self.session.execute_action({"action": "key", "text": "Down Tab"})

        self.assertEqual(screenshot, b"screenshot-1")
        self.assertEqual(
            self.session._page.keyboard.calls,
            [
                ("press", ("ArrowDown",), {}),
                ("press", ("Tab",), {}),
            ],
        )

    @patch("threshold.tools.form_filler.browser.time.sleep", return_value=None)
    def test_execute_action_scrolls_from_center_when_coordinate_missing(self, _sleep) -> None:
        screenshot = self.session.execute_action({"action": "scroll", "delta_x": 10, "delta_y": 25})

        self.assertEqual(screenshot, b"screenshot-1")
        self.assertEqual(
            self.session._page.mouse.calls,
            [
                ("move", (640, 360), {}),
                ("wheel", (10, 25), {}),
            ],
        )

    @patch("threshold.tools.form_filler.browser.time.sleep", return_value=None)
    def test_execute_action_drags_from_start_to_end_coordinate(self, _sleep) -> None:
        screenshot = self.session.execute_action(
            {
                "action": "left_click_drag",
                "start_coordinate": [10, 20],
                "coordinate": [30, 40],
            }
        )

        self.assertEqual(screenshot, b"screenshot-1")
        self.assertEqual(
            self.session._page.mouse.calls,
            [
                ("move", (10, 20), {}),
                ("down", (), {}),
                ("move", (30, 40), {}),
                ("up", (), {}),
            ],
        )

