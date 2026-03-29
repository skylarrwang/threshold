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

logger = logging.getLogger(__name__)

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
from threshold.tools.housing_search import _FAIR_CHANCE_LAWS, _PIPELINE_STAGES, _STAGE_LABELS, _NEXT_ACTIONS


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
    active = [a for a in apps if a.get("status") not in ("denied", "moved_in")]
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


class HousingApplicationCreate(BaseModel):
    program: str
    status: str
    notes: str = ""
    follow_up_date: str = ""
    contact_name: str = ""
    contact_phone: str = ""


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

    if existing:
        old_status = existing.get("status", "")
        existing["status"] = body.status
        existing["updated_at"] = now
        if body.notes:
            history = existing.get("history", [])
            history.append({"status": old_status, "notes": body.notes, "date": now})
            existing["history"] = history
        if body.follow_up_date:
            existing["follow_up_date"] = body.follow_up_date
        if body.contact_name:
            existing["contact_name"] = body.contact_name
        if body.contact_phone:
            existing["contact_phone"] = body.contact_phone
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
        if body.follow_up_date:
            entry["follow_up_date"] = body.follow_up_date
        if body.contact_name:
            entry["contact_name"] = body.contact_name
        if body.contact_phone:
            entry["contact_phone"] = body.contact_phone
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
    logger.info("WebSocket connected")

    agent = None
    config = {"configurable": {"thread_id": f"threshold-ws-{DEFAULT_USER_ID}"}}

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

                # Lazy-init the orchestrator (expensive, do once per connection)
                if agent is None:
                    agent = await _create_agent()

                await _handle_chat_message(ws, agent, config, content)

            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})

            else:
                await ws.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
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
    """Send a user message to the orchestrator and stream the response back."""
    from langchain_core.messages import AIMessageChunk, ToolMessage

    await ws.send_json({"type": "thinking"})

    active_tool: str | None = None
    emitted_tokens = False

    try:
        async for msg, metadata in agent.astream(
            {"messages": [{"role": "user", "content": content}]},
            config,
            stream_mode="messages",
        ):
            if DEBUG_WS_STREAM:
                logger.debug(
                    "[ws-stream] node=%s type=%s repr=%s",
                    metadata.get("langgraph_node"),
                    type(msg).__name__,
                    repr(msg)[:200],
                )

            if isinstance(msg, AIMessageChunk):
                # Text tokens — handle both plain strings and Gemini block lists
                raw = msg.content
                if isinstance(raw, list):
                    text = "".join(
                        b.get("text", "") if isinstance(b, dict) else str(b)
                        for b in raw
                    )
                else:
                    text = str(raw) if raw else ""

                if text:
                    await ws.send_json({"type": "token", "content": text})
                    emitted_tokens = True

                # Tool call starting — emit on first chunk that carries a name
                if msg.tool_call_chunks:
                    name = msg.tool_call_chunks[0].get("name", "")
                    if name and active_tool is None:
                        active_tool = name
                        if name == "task":
                            await ws.send_json({"type": "subagent_start"})
                        elif name == "crisis_response":
                            await ws.send_json({"type": "crisis_response"})
                            await ws.send_json({"type": "tool_start", "tool_name": name})
                        else:
                            await ws.send_json({"type": "tool_start", "tool_name": name})

            elif isinstance(msg, ToolMessage):
                if active_tool == "task":
                    await ws.send_json({"type": "subagent_end"})
                else:
                    await ws.send_json({"type": "tool_end"})
                active_tool = None

        if not emitted_tokens:
            await ws.send_json({
                "type": "token",
                "content": "I'm sorry, I wasn't able to process that. Could you try again?",
            })
        await ws.send_json({"type": "message_complete"})

    except Exception as e:
        logger.error("Agent error: %s\n%s", e, traceback.format_exc())
        await ws.send_json({
            "type": "error",
            "message": f"Something went wrong: {str(e)}",
        })
