from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import TypedDict

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END, StateGraph

from ...db.database import get_db
from ...db.profile_bridge import load_profile_from_db
from ...tools.form_filler import FormFillRequest, run_form_fill
from ...tools.form_filler.safety import filter_profile_for_form, is_url_allowed

logger = logging.getLogger(__name__)


class FormFillerState(TypedDict):
    messages: list


def _extract_url(text: str) -> str | None:
    """Extract a URL from the task description."""
    match = re.search(r"https?://[^\s)\"']+", text)
    return match.group(0) if match else None


def fill_node(state: FormFillerState) -> dict:
    """Parse the task, validate, load profile data, and run the form filler."""
    task_text = ""
    if state["messages"]:
        last = state["messages"][-1]
        task_text = last.content if isinstance(last.content, str) else str(last.content)

    # Extract URL from the task description
    url = _extract_url(task_text)
    if not url:
        return {"messages": [AIMessage(
            content="I could not find a URL in the task description. "
                    "Please provide the form URL you want me to fill out."
        )]}

    # Validate URL against allowlist
    if not is_url_allowed(url):
        return {"messages": [AIMessage(
            content=f"The URL {url} is not on the approved list. "
                    "For safety, I can only fill forms on government (.gov) sites "
                    "and pre-approved domains."
        )]}

    # Load user profile and filter safe fields
    db = get_db()
    try:
        profile = load_profile_from_db(db)
    finally:
        db.close()
    form_data: dict[str, str] = {}
    if profile:
        form_data = filter_profile_for_form(profile)

    # Detect CT DMV forms and inject step-by-step workflow
    workflow_file = None
    if "dmv.service.ct.gov" in url and "scheduleappointment" in url:
        workflow_file = "ct_dmv_nondriver_id.md"
    elif "ct.gov" in url and ("B-230" in url.upper() or "B230" in url.upper()):
        workflow_file = "ct_dmv_b230_id_application.md"

    if workflow_file:
        workflow_path = Path(__file__).parent.parent.parent / ".." / "workflows" / workflow_file
        workflow_path = workflow_path.resolve()
        if workflow_path.exists():
            workflow = workflow_path.read_text()
            task_text = f"""Fill out this CT DMV form following these exact step-by-step instructions:

{workflow}

Use the user data provided below to fill in the form fields.
Original request: {task_text}"""
            logger.info(f"Injected workflow: {workflow_file}")

    request = FormFillRequest(
        url=url,
        instructions=task_text,
        form_data=form_data,
    )

    logger.info(f"Starting form fill: url={url}, fields={list(form_data.keys())}")

    try:
        result = run_form_fill(request)
    except Exception as e:
        logger.error(f"Form fill failed: {e}")
        return {"messages": [AIMessage(
            content=f"I encountered an error while trying to fill the form: {e}"
        )]}

    # Build the response message
    parts = []

    if result.live_view_url:
        parts.append(f"**Watch the browser here:** {result.live_view_url}\n")

    parts.append(result.summary)

    if result.fields_filled:
        parts.append("\n**Fields provided:**")
        for k, v in result.fields_filled.items():
            parts.append(f"- {k}: {v}")

    if result.status == "completed":
        parts.append(
            "\nThe remote browser session is still open for you to review. "
            "Open the link above to see the filled form and submit it yourself."
        )
    elif result.status == "failed":
        parts.append("\nThe form filling was not successful. See details above.")

    return {"messages": [AIMessage(content="\n".join(parts))]}


# Build the LangGraph graph
_builder = StateGraph(FormFillerState)
_builder.add_node("fill", fill_node)
_builder.set_entry_point("fill")
_builder.add_edge("fill", END)
_form_filler_graph = _builder.compile()

form_filler_subagent = {
    "name": "form-filler",
    "description": (
        "Fill out online government forms using browser automation. "
        "Delegate here when the user wants to complete an online form, "
        "schedule a DMV appointment, apply for benefits online, or submit "
        "any government application. The agent fills fields using the user's "
        "profile data but NEVER clicks submit -- the user reviews and submits manually. "
        "Only works with approved .gov URLs. Include the full URL in the task description."
    ),
    "runnable": _form_filler_graph,
}
