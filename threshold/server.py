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
    # Let the frontend know we're processing
    await ws.send_json({"type": "thinking"})

    try:
        # Run the synchronous agent.invoke in a thread pool
        result = await asyncio.to_thread(
            agent.invoke,
            {"messages": [{"role": "user", "content": content}]},
            config,
        )

        messages = result.get("messages", [])
        if not messages:
            await ws.send_json({
                "type": "token",
                "content": "I'm sorry, I wasn't able to process that. Could you try again?",
            })
            await ws.send_json({"type": "message_complete"})
            return

        # Get the last assistant message — Gemini returns content as a list
        # of block objects like [{"type": "text", "text": "..."}] instead of
        # a plain string, so we need to extract the text.
        last = messages[-1]
        raw = last.content if hasattr(last, "content") else str(last)
        if isinstance(raw, list):
            response_text = "".join(
                block.get("text", "") if isinstance(block, dict) else str(block)
                for block in raw
            )
        else:
            response_text = str(raw)

        # Stream character-by-character for a natural feel
        chunk_size = 4
        for i in range(0, len(response_text), chunk_size):
            chunk = response_text[i:i + chunk_size]
            await ws.send_json({"type": "token", "content": chunk})
            await asyncio.sleep(0.01)

        await ws.send_json({"type": "message_complete"})

    except Exception as e:
        logger.error("Agent error: %s\n%s", e, traceback.format_exc())
        await ws.send_json({
            "type": "error",
            "message": f"Something went wrong: {str(e)}",
        })
