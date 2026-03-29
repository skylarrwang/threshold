from __future__ import annotations

import logging
import os
import time

from browserbase import Browserbase
from playwright.sync_api import Browser, Page, sync_playwright

logger = logging.getLogger(__name__)

# Claude's computer-use key names -> Playwright key names
KEY_NAME_MAP = {
    "Return": "Enter",
    "enter": "Enter",
    "Down": "ArrowDown",
    "down": "ArrowDown",
    "arrow_down": "ArrowDown",
    "downArrow": "ArrowDown",
    "KP_Down": "ArrowDown",
    "Up": "ArrowUp",
    "up": "ArrowUp",
    "arrow_up": "ArrowUp",
    "Left": "ArrowLeft",
    "left": "ArrowLeft",
    "arrow_left": "ArrowLeft",
    "Right": "ArrowRight",
    "right": "ArrowRight",
    "arrow_right": "ArrowRight",
    "Escape": "Escape",
    "escape": "Escape",
    "BackSpace": "Backspace",
    "backspace": "Backspace",
    "space": " ",
    "Space": " ",
    "Tab": "Tab",
    "tab": "Tab",
    "Page_Down": "PageDown",
    "Page_Up": "PageUp",
    "Next": "PageDown",
    "Prior": "PageUp",
    # Modifier keys
    "ctrl": "Control",
    "Ctrl": "Control",
    "control": "Control",
    "alt": "Alt",
    "Alt": "Alt",
    "shift": "Shift",
    "Shift": "Shift",
    "meta": "Meta",
    "Meta": "Meta",
    "super": "Meta",
    "Super": "Meta",
    # Common combos Claude sends as single key names
    "Delete": "Delete",
    "delete": "Delete",
    "Home": "Home",
    "End": "End",
    "Insert": "Insert",
    "F1": "F1", "F2": "F2", "F3": "F3", "F4": "F4",
    "F5": "F5", "F6": "F6", "F7": "F7", "F8": "F8",
    "F9": "F9", "F10": "F10", "F11": "F11", "F12": "F12",
}


def _normalize_key(key: str) -> list[str]:
    """Normalize a key name from Claude's format to Playwright's format.

    Handles:
    - Multi-key strings like 'Down Down Down' (split on spaces, press each)
    - Combo strings like 'ctrl+a' or 'Control+A' (converted to Playwright combo format)
    """
    key = key.strip()

    # Handle combo keys like "ctrl+a", "Control+A", "Shift+Tab"
    if "+" in key:
        combo_parts = [KEY_NAME_MAP.get(p.strip(), p.strip()) for p in key.split("+")]
        # Playwright combo format: "Control+a"
        return ["+".join(combo_parts)]

    # Handle compound keys like "Down Down Down"
    parts = key.split()
    if len(parts) > 1:
        return [KEY_NAME_MAP.get(p, p) for p in parts]
    return [KEY_NAME_MAP.get(key, key)]


class BrowserSession:
    """Manages a remote Browserbase browser for form filling via computer use."""

    def __init__(self, width: int = 1280, height: int = 720):
        self.width = width
        self.height = height
        self._bb = Browserbase(api_key=os.environ["BROWSER_BASE_API"])
        self._bb_session = None
        self._live_view_url: str | None = None
        self._pw_context = None
        self._browser: Browser | None = None
        self._page: Page | None = None

    def start(self, url: str) -> bytes:
        """Create a Browserbase session, connect via CDP, navigate to URL."""
        # Create remote browser session
        self._bb_session = self._bb.sessions.create(
            project_id=os.environ["BROWSER_BASE_PROJECT_ID"],
        )
        logger.info(f"Browserbase session created: {self._bb_session.id}")

        # Get live view URL for the user to watch
        debug_urls = self._bb.sessions.debug(self._bb_session.id)
        self._live_view_url = debug_urls.debugger_fullscreen_url
        logger.info(f"Live view URL: {self._live_view_url}")

        # Connect Playwright to the remote browser via CDP
        self._pw_context = sync_playwright().start()
        self._browser = self._pw_context.chromium.connect_over_cdp(
            self._bb_session.connect_url,
        )

        # Use the default context and page (recommended by Browserbase for stealth)
        context = self._browser.contexts[0]
        self._page = context.pages[0] if context.pages else context.new_page()
        self._page.set_viewport_size({"width": self.width, "height": self.height})

        # For PDF URLs, use CDP to disable downloads so Chrome renders PDFs inline
        is_pdf = url.lower().endswith(".pdf")
        if is_pdf:
            cdp = context.new_cdp_session(self._page)
            cdp.send("Page.setDownloadBehavior", {
                "behavior": "deny",
            })
            logger.info("PDF detected — disabled downloads to force inline rendering")

        self._page.goto(url, wait_until="domcontentloaded", timeout=30_000)
        # Give the page a moment to render (PDFs need extra time)
        time.sleep(3 if is_pdf else 1)
        return self.screenshot()

    @property
    def live_view_url(self) -> str | None:
        """URL where the user can watch the browser in real-time."""
        return self._live_view_url

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
                keys = _normalize_key(text)
                for k in keys:
                    self._page.keyboard.press(k)

        elif action == "scroll":
            scroll_pos = action_input.get("coordinate", [self.width // 2, self.height // 2])
            delta_x = action_input.get("delta_x", 0)
            delta_y = action_input.get("delta_y", 0)
            self._page.mouse.move(scroll_pos[0], scroll_pos[1])
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
            logger.warning(f"Unknown action: {action}")

        # Small delay to let the page react
        time.sleep(0.3)
        return self.screenshot()

    def close(self):
        """Disconnect Playwright but keep the Browserbase session alive for user review."""
        if self._browser:
            self._browser.close()
            self._browser = None
        if self._pw_context:
            self._pw_context.stop()
            self._pw_context = None
        # Intentionally do NOT close the Browserbase session -- the user
        # can still view/interact via the live view URL.
