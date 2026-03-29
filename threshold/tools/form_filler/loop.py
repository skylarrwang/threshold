from __future__ import annotations

import base64
import logging

import os

from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

from .browser import BrowserSession
from .types import FormFillRequest, FormFillResult

logger = logging.getLogger(__name__)

COMPUTER_TOOL_DEF = {
    "type": "computer_20251124",
    "name": "computer",
    "display_width_px": 1280,
    "display_height_px": 720,
}

FORM_FILLER_SYSTEM_PROMPT = """\
You are a form-filling assistant. You are looking at a web browser showing a form.

## Your Task
{instructions}

## Data to Fill In
{form_data_formatted}

## Rules
- Fill ONLY the fields using the data listed above. Do not invent or guess information.
- NEVER enter criminal history, offense details, conviction information, or supervision details.
- NEVER click any submit, confirm, send, or final action button. Stop once all fields are filled.
- After filling each field, take a screenshot to verify your work.
- If the form has multiple pages/steps, navigate through them filling fields as you go,
  but stop before the final submission step.
- If the form asks for information you do not have, note it in your final report.
- When you are done filling all available fields, respond with a text summary of what
  you filled in and what (if anything) is missing.
- If you encounter a CAPTCHA, login wall, or error, stop and report the issue.
"""

MAX_CONTEXT_SCREENSHOTS = 5


def _b64(png_bytes: bytes) -> str:
    return base64.b64encode(png_bytes).decode()


def _make_image_content(png_bytes: bytes) -> dict:
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": "image/png",
            "data": _b64(png_bytes),
        },
    }


def _trim_old_screenshots(messages: list, keep_last: int = MAX_CONTEXT_SCREENSHOTS):
    """Remove image content from older messages to manage token usage."""
    image_indices = []
    for i, msg in enumerate(messages):
        if isinstance(msg, (ToolMessage, HumanMessage)) and isinstance(msg.content, list):
            has_image = any(
                isinstance(block, dict) and block.get("type") == "image"
                for block in msg.content
            )
            if has_image:
                image_indices.append(i)

    # Keep the last N image-bearing messages, strip images from the rest
    to_strip = image_indices[:-keep_last] if len(image_indices) > keep_last else []
    for idx in to_strip:
        msg = messages[idx]
        if isinstance(msg.content, list):
            messages[idx] = msg.model_copy(
                update={
                    "content": [
                        block for block in msg.content
                        if not (isinstance(block, dict) and block.get("type") == "image")
                    ] or [{"type": "text", "text": "[screenshot removed to save context]"}]
                }
            )


def run_form_fill(request: FormFillRequest, max_steps: int = 50) -> FormFillResult:
    """Run the computer-use form-filling loop.

    Opens a visible browser, navigates to the URL, and uses Claude's computer use
    to fill form fields. Never clicks submit. Returns a summary of what was filled.
    """
    model = ChatOpenAI(
        model=os.getenv("THRESHOLD_FORM_FILLER_MODEL", "grok-4-1-fast"),
        base_url="https://api.x.ai/v1",
        api_key=os.getenv("XAI_API_KEY", "not-set"),
    ).bind_tools([COMPUTER_TOOL_DEF])

    session = BrowserSession(
        width=COMPUTER_TOOL_DEF["display_width_px"],
        height=COMPUTER_TOOL_DEF["display_height_px"],
    )

    try:
        initial_screenshot = session.start(request.url)
    except Exception as e:
        return FormFillResult(
            status="failed",
            summary=f"Failed to open the page: {e}",
            fields_filled={},
        )

    # Format the form data for the prompt
    form_data_lines = "\n".join(f"- {k}: {v}" for k, v in request.form_data.items())

    system_text = FORM_FILLER_SYSTEM_PROMPT.format(
        instructions=request.instructions,
        form_data_formatted=form_data_lines or "(No specific data provided -- fill based on instructions)",
    )

    messages: list = [
        HumanMessage(content=[
            {"type": "text", "text": system_text},
            _make_image_content(initial_screenshot),
        ])
    ]

    final_screenshot = initial_screenshot
    summary = ""

    for step in range(max_steps):
        logger.info(f"Form filler step {step + 1}/{max_steps}")

        try:
            response = model.invoke(messages)
        except Exception as e:
            logger.error(f"Model invocation failed: {e}")
            summary = f"Model error at step {step + 1}: {e}"
            break

        messages.append(response)

        # Extract tool use blocks from response
        tool_uses = []
        text_parts = []

        if isinstance(response.content, list):
            for block in response.content:
                if isinstance(block, dict):
                    if block.get("type") == "tool_use":
                        tool_uses.append(block)
                    elif block.get("type") == "text":
                        text_parts.append(block.get("text", ""))
                elif isinstance(block, str):
                    text_parts.append(block)
        elif isinstance(response.content, str):
            text_parts.append(response.content)

        # If no tool calls, Claude is done -- extract summary
        if not tool_uses:
            summary = "\n".join(text_parts).strip()
            break

        # Execute each tool call
        for tool_use in tool_uses:
            action_input = tool_use.get("input", {})
            try:
                screenshot = session.execute_action(action_input)
                final_screenshot = screenshot
                messages.append(ToolMessage(
                    content=[_make_image_content(screenshot)],
                    tool_call_id=tool_use["id"],
                ))
            except Exception as e:
                logger.error(f"Action failed: {e}")
                messages.append(ToolMessage(
                    content=[{"type": "text", "text": f"Action failed: {e}"}],
                    tool_call_id=tool_use["id"],
                ))

        # Trim old screenshots to manage context size
        _trim_old_screenshots(messages)
    else:
        summary = "Reached maximum steps without completing the form."

    # Don't close the browser -- leave it open for the user to review and submit
    # session.close() is intentionally a no-op

    if not summary:
        summary = "Form filling completed but no summary was provided by the model."

    return FormFillResult(
        status="completed",
        summary=summary,
        screenshot_base64=_b64(final_screenshot),
        fields_filled=request.form_data,
    )
