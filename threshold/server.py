"""Threshold API server — bridges the React frontend to the Python backend.

Exposes:
  - REST endpoints for profile, documents, intake status, OCR upload
  - WebSocket at /ws for chat with the orchestrator (token streaming)

Run with:
  uvicorn threshold.server:app --reload --port 8000

Or via CLI:
  python main.py serve
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from threshold.db.crud import (
    create_user,
    get_completion_summary,
    get_full_profile,
    get_intake_status,
    get_populated_fields,
    upsert_fields,
    user_exists,
)
from threshold.db.database import get_db, init_db
from threshold.services.document_ocr import process_document
from threshold.services.interview_context import (
    build_interview_prompt_context,
    build_post_ocr_summary,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# Suppress noisy uvicorn WebSocket accept/close logs
logging.getLogger("uvicorn.error").setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
DEFAULT_USER_ID = os.getenv("THRESHOLD_USER_ID", "default-user")
DEBUG_WS_STREAM = os.getenv("DEBUG_WS_STREAM") == "1"

# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = get_db()
    if not user_exists(db, DEFAULT_USER_ID):
        create_user(db, DEFAULT_USER_ID)
        logger.info("Created default user: %s", DEFAULT_USER_ID)
    db.close()
    yield


app = FastAPI(
    title="Threshold API",
    description="Re-entry AI assistant backend",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/api/health")
async def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@app.get("/api/profile")
async def get_profile():
    """Return the full fixed-schema profile organized by section."""
    db = get_db()
    try:
        profile = get_full_profile(db, DEFAULT_USER_ID)
        return {"user_id": DEFAULT_USER_ID, "profile": profile}
    finally:
        db.close()


@app.get("/api/profile/exists")
async def profile_exists():
    db = get_db()
    try:
        populated = get_populated_fields(db, DEFAULT_USER_ID)
        has_data = any(len(fields) > 0 for fields in populated.values())
        return {"exists": has_data}
    finally:
        db.close()


class ProfileUpdate(BaseModel):
    section: str
    fields: dict[str, Any]


@app.patch("/api/profile")
async def update_profile(update: ProfileUpdate):
    """Update specific fields in a profile section."""
    db = get_db()
    try:
        upsert_fields(db, DEFAULT_USER_ID, update.section, update.fields)
        return {"ok": True}
    except ValueError as e:
        return {"ok": False, "error": str(e)}
    finally:
        db.close()


@app.get("/api/profile/completion")
async def profile_completion():
    """Get profile completion summary with per-section breakdown."""
    db = get_db()
    try:
        return get_completion_summary(db, DEFAULT_USER_ID)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Intake pipeline
# ---------------------------------------------------------------------------

@app.get("/api/intake/status")
async def intake_status():
    """Full intake status: what's filled, what's missing by priority."""
    db = get_db()
    try:
        return get_intake_status(db, DEFAULT_USER_ID)
    finally:
        db.close()


@app.get("/api/intake/interview-context")
async def interview_context():
    """Get the interview prompt context (what OCR found, what's still needed)."""
    db = get_db()
    try:
        context = build_interview_prompt_context(db, DEFAULT_USER_ID)
        return {"context": context}
    finally:
        db.close()


@app.get("/api/intake/post-ocr-summary")
async def post_ocr_summary():
    """Summary to show the user after document upload, before interview."""
    db = get_db()
    try:
        return build_post_ocr_summary(db, DEFAULT_USER_ID)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Document upload (OCR)
# ---------------------------------------------------------------------------

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document image for OCR extraction.

    Accepts JPEG, PNG, WebP, HEIC, or PDF. Extracts structured fields
    via Gemini Flash, maps to the DB schema, and writes to the profile.
    The uploaded image is NOT persisted.
    """
    if not file.content_type:
        return {"ok": False, "error": "No content type specified"}

    allowed = {"image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"}
    if file.content_type not in allowed:
        return {"ok": False, "error": f"Unsupported file type: {file.content_type}"}

    image_data = await file.read()

    try:
        result = await asyncio.to_thread(
            process_document, image_data, DEFAULT_USER_ID, file.content_type
        )
        return {"ok": True, **result}
    except Exception as e:
        logger.error("OCR processing failed: %s", e)
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Housing pipeline
# ---------------------------------------------------------------------------

HOUSING_APPS_LOG = DATA_DIR / "tracking" / "housing_applications.json"

# Import fair chance laws data from the housing tools
from threshold.tools.housing_search import (
    _FAIR_CHANCE_LAWS, _PIPELINE_STAGES, _STAGE_LABELS, _NEXT_ACTIONS,
    _TERMINAL_STATUSES, get_pending_follow_ups,
)


def _read_housing_apps() -> list[dict]:
    """Read housing applications from the tracking file."""
    if not HOUSING_APPS_LOG.exists():
        return []
    try:
        return json.loads(HOUSING_APPS_LOG.read_text())
    except (json.JSONDecodeError, OSError):
        return []


@app.get("/api/housing/pipeline")
async def housing_pipeline():
    """Return the full housing application pipeline as structured JSON."""
    apps = _read_housing_apps()
    active = [a for a in apps if a.get("status") not in _TERMINAL_STATUSES]
    approved = [a for a in apps if a.get("status") in ("approved", "moved_in")]

    # Find next follow-up
    follow_ups = sorted(
        [a for a in apps if a.get("follow_up_date") and a.get("status") not in ("denied", "moved_in")],
        key=lambda a: a.get("follow_up_date", ""),
    )
    next_follow_up = None
    if follow_ups:
        next_follow_up = {
            "program": follow_ups[0]["program"],
            "date": follow_ups[0]["follow_up_date"],
        }

    # Add next_action to each application
    for app_item in apps:
        app_item["next_action"] = _NEXT_ACTIONS.get(app_item.get("status", ""), "")
        app_item["stage_label"] = _STAGE_LABELS.get(app_item.get("status", ""), app_item.get("status", ""))

    return {
        "applications": apps,
        "active_count": len(active),
        "total_count": len(apps),
        "approved_count": len(approved),
        "next_follow_up": next_follow_up,
        "stages": [{"key": s, "label": _STAGE_LABELS.get(s, s)} for s in _PIPELINE_STAGES],
    }


@app.get("/api/housing/alerts")
async def housing_alerts():
    """Return pending follow-ups, upcoming interviews, and approaching deadlines."""
    return get_pending_follow_ups()


class HousingApplicationCreate(BaseModel):
    program: str
    status: str
    notes: str = ""
    follow_up_date: str = ""
    contact_name: str = ""
    contact_phone: str = ""
    application_url: str = ""
    deadline: str = ""
    interview_date: str = ""
    interview_time: str = ""
    interview_location: str = ""
    denial_reason: str = ""
    documents_submitted: str = ""
    housing_type: str = ""


@app.post("/api/housing/applications")
async def create_housing_application(body: HousingApplicationCreate):
    """Log or update a housing application."""
    HOUSING_APPS_LOG.parent.mkdir(parents=True, exist_ok=True)
    apps = _read_housing_apps()

    # Check for existing program (update instead of duplicate)
    existing = None
    for a in apps:
        if a["program"].lower() == body.program.lower():
            existing = a
            break

    now = datetime.now().isoformat()

    # Fields that get set/updated when provided
    _optional_fields = {
        "follow_up_date": body.follow_up_date,
        "contact_name": body.contact_name,
        "contact_phone": body.contact_phone,
        "application_url": body.application_url,
        "deadline": body.deadline,
        "interview_date": body.interview_date,
        "interview_time": body.interview_time,
        "interview_location": body.interview_location,
        "denial_reason": body.denial_reason,
        "documents_submitted": body.documents_submitted,
        "housing_type": body.housing_type,
    }

    if existing:
        old_status = existing.get("status", "")
        existing["status"] = body.status
        existing["updated_at"] = now
        if body.notes:
            history = existing.get("history", [])
            history.append({"status": old_status, "notes": body.notes, "date": now})
            existing["history"] = history
        for key, value in _optional_fields.items():
            if value:
                existing[key] = value
        result = existing
    else:
        entry = {
            "id": str(uuid4()),
            "program": body.program,
            "status": body.status,
            "notes": body.notes,
            "created_at": now,
            "updated_at": now,
            "history": [],
        }
        for key, value in _optional_fields.items():
            if value:
                entry[key] = value
        apps.append(entry)
        result = entry

    HOUSING_APPS_LOG.write_text(json.dumps(apps, indent=2))
    return result


@app.get("/api/housing/fair-chance-laws/{state}")
async def fair_chance_laws(state: str):
    """Return fair chance housing law data for a state."""
    state_upper = state.upper().strip()
    info = _FAIR_CHANCE_LAWS.get(state_upper)

    if info:
        return {
            "state": state_upper,
            "summary": info["summary"],
            "scope": info["scope"],
            "resource": info["resource"],
            "has_law": True,
        }

    return {
        "state": state_upper,
        "summary": (
            "No specific statewide fair chance housing law on record. "
            "Federal protections apply: HUD guidance (2016) says blanket criminal history "
            "bans may violate the Fair Housing Act if they have a disparate racial impact. "
            "Only lifetime sex offender registrants and meth production on federal premises "
            "are automatic federal bars."
        ),
        "scope": "Federal baseline",
        "resource": "https://www.lawhelp.org",
        "has_law": False,
    }


# ---------------------------------------------------------------------------
# WebSocket — chat with the orchestrator
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_chat(ws: WebSocket):
    await ws.accept()

    config = {
        "configurable": {"thread_id": f"threshold-ws-{DEFAULT_USER_ID}"},
        "recursion_limit": 75,
    }

    # Pre-warm the agent immediately on connect (don't wait for first message)
    import time
    t0 = time.monotonic()
    logger.info("[ws] connected — loading orchestrator...")
    agent = await _create_agent()
    logger.info("[ws] orchestrator ready (%.1fs)", time.monotonic() - t0)

    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = msg.get("type")

            if msg_type == "user_message":
                content = msg.get("content", "").strip()
                if not content:
                    continue

                await _handle_chat_message(ws, agent, config, content)

            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})

            else:
                await ws.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error("WebSocket error: %s\n%s", e, traceback.format_exc())
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


async def _create_agent():
    """Create the orchestrator agent. Runs in a thread because it loads
    models and reads the profile synchronously."""
    from threshold.agents.orchestrator import create_orchestrator
    return await asyncio.to_thread(create_orchestrator)


async def _handle_chat_message(ws: WebSocket, agent: Any, config: dict, content: str):
    """Send a user message to the orchestrator and stream the response back.

    Uses astream_events (v2) to capture events from ALL nested runnables,
    including subagent LLM calls, tool invocations, and reasoning.

    Emits `agent_step` events to the frontend for real-time trace display.
    """
    import time

    logger.info("=" * 70)
    logger.info("[user] %s", content[:200])

    step_counter = 0

    def _step_id() -> str:
        nonlocal step_counter
        step_counter += 1
        return f"step-{step_counter}"

    async def _send_step(
        step_type: str,
        status: str,
        label: str,
        *,
        step_id: str | None = None,
        detail: str | None = None,
        icon: str | None = None,
    ):
        payload: dict[str, Any] = {
            "type": "agent_step",
            "id": step_id or _step_id(),
            "step_type": step_type,
            "status": status,
            "label": label,
        }
        if detail:
            payload["detail"] = detail
        if icon:
            payload["icon"] = icon
        await ws.send_json(payload)

    await ws.send_json({"type": "thinking"})
    await _send_step("thinking", "started", "Analyzing your message...", icon="psychology")

    emitted_tokens = False
    token_count = 0
    t_start = time.monotonic()
    t_first_token: float | None = None

    orchestrator_tool: str | None = None
    in_subagent = False
    seen_nodes: set[str] = set()
    subagent_step_id: str | None = None
    active_tool_step_ids: dict[str, str] = {}
    pre_tool_buffer: list[str] = []  # accumulates text sent before any tool call

    try:
        async for event in agent.astream_events(
            {"messages": [{"role": "user", "content": content}]},
            config,
            version="v2",
        ):
            evt = event["event"]
            name = event.get("name", "")
            data = event.get("data", {})
            meta = event.get("metadata", {})
            node = meta.get("langgraph_node", "")
            tags = event.get("tags", [])

            # ── Node transitions ─────────────────────────────────────
            if node and node not in seen_nodes:
                seen_nodes.add(node)
                logger.info("[node] entered: %s", node)

            # ── LLM streaming tokens ────────────────────────────────
            if evt == "on_chat_model_stream":
                chunk = data.get("chunk")
                if not chunk:
                    continue

                raw = chunk.content if hasattr(chunk, "content") else ""

                if isinstance(raw, list):
                    for b in raw:
                        if isinstance(b, dict) and b.get("type") not in ("text", None):
                            reasoning = b.get("text", "")
                            if reasoning:
                                logger.info("[%s] reasoning: %s", node or name, reasoning[:300])
                    text = "".join(
                        b.get("text", "")
                        for b in raw
                        if isinstance(b, dict) and b.get("type") == "text"
                    )
                else:
                    text = str(raw) if raw else ""

                is_orchestrator = node == "model" or not in_subagent
                if text and is_orchestrator and not orchestrator_tool:
                    if t_first_token is None:
                        t_first_token = time.monotonic()
                        logger.info("[timing] first token in %.2fs", t_first_token - t_start)
                    await ws.send_json({"type": "token", "content": text})
                    pre_tool_buffer.append(text)
                    emitted_tokens = True
                    token_count += len(text)

                if text and in_subagent:
                    if not hasattr(_handle_chat_message, "_sub_buf"):
                        _handle_chat_message._sub_buf = ""
                    _handle_chat_message._sub_buf += text

                if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                    for tc_chunk in chunk.tool_call_chunks:
                        tc_name = tc_chunk.get("name", "")
                        if tc_name:
                            if in_subagent:
                                logger.info("[%s] calling tool: %s", node, tc_name)
                                sid = _step_id()
                                active_tool_step_ids[tc_name] = sid
                                await _send_step(
                                    "tool", "started",
                                    _tool_display_label(tc_name),
                                    step_id=sid,
                                    icon=_tool_icon(tc_name),
                                )
                            else:
                                # Reclassify pre-tool text as reasoning ONLY for
                                # intermediate tools (read_user_memory, etc.).
                                # Text before task() is the user-facing
                                # acknowledgment ("Let me look into that") — keep it.
                                is_subagent_call = tc_name == "task"
                                if emitted_tokens and pre_tool_buffer and not is_subagent_call:
                                    reasoning_text = "".join(pre_tool_buffer).strip()
                                    if reasoning_text:
                                        logger.info("[orchestrator] reclassifying %d chars as reasoning", len(reasoning_text))
                                        preview = reasoning_text[:120].replace("\n", " ")
                                        await _send_step(
                                            "reasoning", "completed",
                                            f"Thinking: {preview}{'...' if len(reasoning_text) > 120 else ''}",
                                            icon="psychology",
                                            detail=reasoning_text,
                                        )
                                    await ws.send_json({"type": "clear_stream"})
                                    pre_tool_buffer.clear()
                                    token_count = 0
                                    emitted_tokens = False

                                orchestrator_tool = tc_name
                                if tc_name == "task":
                                    logger.info("[orchestrator] delegating to subagent...")
                                    in_subagent = True
                                    _handle_chat_message._sub_buf = ""
                                    subagent_step_id = _step_id()
                                    await _send_step(
                                        "subagent", "started",
                                        "Delegating to specialist...",
                                        step_id=subagent_step_id,
                                        icon="smart_toy",
                                    )
                                    await ws.send_json({"type": "subagent_start"})
                                elif tc_name == "crisis_response":
                                    logger.info("[orchestrator] !!! crisis_response")
                                    await ws.send_json({"type": "crisis_response"})
                                    await ws.send_json({"type": "tool_start", "tool_name": tc_name})
                                else:
                                    logger.info("[orchestrator] calling tool: %s", tc_name)
                                    sid = _step_id()
                                    active_tool_step_ids[tc_name] = sid
                                    await _send_step(
                                        "tool", "started",
                                        _tool_display_label(tc_name),
                                        step_id=sid,
                                        icon=_tool_icon(tc_name),
                                    )
                                    await ws.send_json({"type": "tool_start", "tool_name": tc_name})

            # ── Tool start (from any level) ──────────────────────────
            elif evt == "on_tool_start":
                tool_input = data.get("input", {})
                input_preview = json.dumps(tool_input)[:300] if isinstance(tool_input, (dict, list)) else str(tool_input)[:300]
                if in_subagent and name == "task":
                    # This is the orchestrator-level task() call — in_subagent
                    # was already set when we detected the tool_call_chunk.
                    logger.info("[orchestrator] task(%s)", input_preview)
                    task_input = data.get("input", {})
                    task_desc = ""
                    subagent_type = ""
                    if isinstance(task_input, dict):
                        task_desc = task_input.get("description", "") or task_input.get("task", "")
                        subagent_type = task_input.get("subagent_type", "")
                    if task_desc and subagent_step_id:
                        await _send_step(
                            "subagent", "started",
                            _subagent_label(task_desc),
                            step_id=subagent_step_id,
                            icon="smart_toy",
                        )
                    if not emitted_tokens:
                        ack = _subagent_acknowledgment(subagent_type, task_desc)
                        await ws.send_json({"type": "token", "content": ack})
                        emitted_tokens = True
                elif in_subagent:
                    logger.info("[subagent] tool_start: %s(%s)", name, input_preview)
                else:
                    logger.info("[orchestrator] tool_start: %s(%s)", name, input_preview)

            # ── Tool end (from any level) ────────────────────────────
            elif evt == "on_tool_end":
                output = data.get("output", "")
                output_str = str(output.content) if hasattr(output, "content") else str(output)
                if in_subagent and name != "task":
                    logger.info("[subagent] tool_end: %s -> %s", name, output_str[:300])
                    sid = active_tool_step_ids.pop(name, None)
                    if sid:
                        await _send_step(
                            "tool", "completed",
                            _tool_display_label(name, done=True),
                            step_id=sid,
                            icon=_tool_icon(name),
                        )
                elif name == "task":
                    sub_buf = getattr(_handle_chat_message, "_sub_buf", "")
                    if sub_buf:
                        logger.info("[subagent] reasoning: %s", sub_buf[:500])
                    logger.info("[subagent] <<< returned (%d chars): %s", len(output_str), output_str[:300])
                    in_subagent = False
                    orchestrator_tool = None
                    if subagent_step_id:
                        await _send_step(
                            "subagent", "completed", "Specialist finished",
                            step_id=subagent_step_id, icon="smart_toy",
                        )
                    subagent_step_id = None
                    await ws.send_json({"type": "subagent_end"})
                else:
                    logger.info("[orchestrator] tool_end: %s -> %s", name, output_str[:300])
                    orchestrator_tool = None
                    sid = active_tool_step_ids.pop(name, None)
                    if sid:
                        await _send_step(
                            "tool", "completed",
                            _tool_display_label(name, done=True),
                            step_id=sid,
                            icon=_tool_icon(name),
                        )
                    await ws.send_json({"type": "tool_end"})

            # ── LLM start (log which model is being called) ──────────
            elif evt == "on_chat_model_start":
                model_name = name or "unknown"
                if in_subagent:
                    logger.info("[subagent] llm_start: %s (node=%s)", model_name, node)
                    await _send_step(
                        "reasoning", "started", "Specialist is thinking...",
                        icon="neurology",
                    )
                elif DEBUG_WS_STREAM:
                    logger.info("[orchestrator] llm_start: %s (node=%s)", model_name, node)

        if not emitted_tokens:
            await ws.send_json({
                "type": "token",
                "content": "I'm sorry, I wasn't able to process that. Could you try again?",
            })

        t_end = time.monotonic()
        logger.info(
            "[done] streamed %d chars in %.1fs (TTFT: %.2fs)",
            token_count, t_end - t_start, (t_first_token or t_end) - t_start,
        )
        logger.info("=" * 70)
        await _send_step("thinking", "completed", "Done", icon="check_circle")
        await ws.send_json({"type": "message_complete"})

    except Exception as e:
        logger.error("Agent error: %s\n%s", e, traceback.format_exc())
        await ws.send_json({
            "type": "error",
            "message": f"Something went wrong: {str(e)}",
        })


def _tool_display_label(name: str, *, done: bool = False) -> str:
    labels: dict[str, tuple[str, str]] = {
        "search_jobs": ("Searching for jobs...", "Job search complete"),
        "search_housing": ("Finding housing options...", "Housing search complete"),
        "read_user_memory": ("Reading your profile...", "Profile loaded"),
        "log_event": ("Logging activity...", "Logged"),
    }
    if name.startswith("check_") and name.endswith("_eligibility"):
        benefit = name.replace("check_", "").replace("_eligibility", "").replace("_", " ").title()
        return f"{benefit} eligibility checked" if done else f"Checking {benefit} eligibility..."
    pair = labels.get(name)
    if pair:
        return pair[1] if done else pair[0]
    pretty = name.replace("_", " ").title()
    return f"{pretty} done" if done else f"Running {pretty}..."


def _tool_icon(name: str) -> str:
    icons: dict[str, str] = {
        "search_jobs": "work",
        "search_housing": "home",
        "read_user_memory": "person",
        "log_event": "edit_note",
    }
    if name.startswith("check_") and name.endswith("_eligibility"):
        return "fact_check"
    return icons.get(name, "build")


def _subagent_label(description: str) -> str:
    desc_lower = description.lower()
    if "hous" in desc_lower:
        return "Housing specialist working..."
    if "employ" in desc_lower or "job" in desc_lower:
        return "Employment specialist working..."
    if "benefit" in desc_lower or "eligib" in desc_lower or "snap" in desc_lower:
        return "Benefits specialist working..."
    if "legal" in desc_lower:
        return "Legal specialist working..."
    return f"Specialist working: {description[:60]}..."


def _subagent_acknowledgment(subagent_type: str, description: str) -> str:
    messages: dict[str, str] = {
        "housing": "Let me look into housing options for you.\n\n",
        "benefits": "Let me check on benefits eligibility for you.\n\n",
        "employment": "Let me look into employment options for you.\n\n",
        "legal": "Let me look into that for you.\n\n",
        "form-filler": "Let me help fill out that form.\n\n",
    }
    return messages.get(subagent_type, "Let me look into that for you.\n\n")
