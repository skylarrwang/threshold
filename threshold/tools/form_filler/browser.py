from __future__ import annotations

import time

from playwright.sync_api import Browser, Page, sync_playwright


class BrowserSession:
    """Manages a headed Chromium browser for form filling via computer use."""

    def __init__(self, width: int = 1280, height: int = 720):
        self.width = width
        self.height = height
        self._pw_context = None
        self._browser: Browser | None = None
        self._page: Page | None = None

    def start(self, url: str) -> bytes:
        """Launch a visible browser, navigate to the URL, return initial screenshot."""
        self._pw_context = sync_playwright().start()
        self._browser = self._pw_context.chromium.launch(headless=False)
        self._page = self._browser.new_page(
            viewport={"width": self.width, "height": self.height},
        )
        self._page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        # Give the page a moment to render JS-heavy content
        time.sleep(1)
        return self.screenshot()

    def screenshot(self) -> bytes:
        """Capture the current page as PNG bytes."""
        assert self._page is not None, "Browser session not started"
        return self._page.screenshot(type="png")

    def execute_action(self, action_input: dict) -> bytes:
        """Execute a computer-use action and return a screenshot after."""
        assert self._page is not None, "Browser session not started"

        action = action_input.get("action", "")
        coordinate = action_input.get("coordinate")
        text = action_input.get("text", "")

        if action == "screenshot":
            pass  # Just return screenshot below

        elif action == "left_click":
            if coordinate:
                self._page.mouse.click(coordinate[0], coordinate[1])

        elif action == "right_click":
            if coordinate:
                self._page.mouse.click(coordinate[0], coordinate[1], button="right")

        elif action == "middle_click":
            if coordinate:
                self._page.mouse.click(coordinate[0], coordinate[1], button="middle")

        elif action == "double_click":
            if coordinate:
                self._page.mouse.dblclick(coordinate[0], coordinate[1])

        elif action == "triple_click":
            if coordinate:
                self._page.mouse.click(coordinate[0], coordinate[1], click_count=3)

        elif action == "type":
            if text:
                self._page.keyboard.type(text, delay=20)

        elif action == "key":
            if text:
                self._page.keyboard.press(text)

        elif action == "scroll":
            scroll_x = action_input.get("coordinate", [self.width // 2, self.height // 2])
            delta_x = action_input.get("delta_x", 0)
            delta_y = action_input.get("delta_y", 0)
            self._page.mouse.move(scroll_x[0], scroll_x[1])
            self._page.mouse.wheel(delta_x, delta_y)

        elif action == "mouse_move":
            if coordinate:
                self._page.mouse.move(coordinate[0], coordinate[1])

        elif action == "left_click_drag":
            start = action_input.get("start_coordinate", coordinate)
            end = coordinate
            if start and end:
                self._page.mouse.move(start[0], start[1])
                self._page.mouse.down()
                self._page.mouse.move(end[0], end[1])
                self._page.mouse.up()

        elif action == "wait":
            duration = action_input.get("duration", 1)
            time.sleep(min(duration, 5))

        else:
            pass  # Unknown action, just screenshot

        # Small delay to let the page react
        time.sleep(0.3)
        return self.screenshot()

    def close(self):
        """Close the browser. Does NOT close it if the form is filled (user reviews manually)."""
        # Intentionally left as a no-op so the browser stays open for the user.
        # The browser will be cleaned up when the process exits.
        pass

    def force_close(self):
        """Force close the browser and Playwright context."""
        if self._browser:
            self._browser.close()
            self._browser = None
        if self._pw_context:
            self._pw_context.stop()
            self._pw_context = None
