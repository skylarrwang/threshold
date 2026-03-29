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
import re as _re
import traceback
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from threshold.db.crud import (
    create_user,
    get_completion_status,
    get_completion_summary,
    get_full_profile,
    get_intake_status,
    get_populated_fields,
    get_profile_field_matrix,
    get_uploaded_document_by_id,
    get_uploaded_documents,
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

# ── Workflow update: tool → (stage, label) for each domain ────────────────
_HOUSING_TOOL_STAGES: dict[str, tuple[int, str]] = {
    "read_user_memory": (2, "Understanding your situation"),
    "search_housing": (3, "Searching HUD counseling agencies"),
    "find_reentry_housing": (3, "Searching reentry housing programs"),
    "find_emergency_shelter": (3, "Finding emergency shelters"),
    "get_pha_guide": (3, "Looking up public housing authorities"),
    "get_fair_chance_housing_laws": (3, "Checking fair chance housing laws"),
    "get_fair_market_rents": (3, "Looking up fair market rents"),
    "prepare_housing_application": (4, "Preparing application checklist"),
    "log_housing_application": (5, "Tracking housing application"),
    "get_housing_pipeline_status": (0, "Checking pipeline status"),
}

_DOMAIN_TOOL_STAGES: dict[str, dict[str, tuple[int, str]]] = {
    "housing": _HOUSING_TOOL_STAGES,
}


def _parse_tool_output(tool_name: str, output_str: str) -> dict:
    """Extract structured data from tool markdown output for workflow updates."""
    payload: dict = {}

    # Count programs/agencies found in search results
    if tool_name in ("search_housing", "find_reentry_housing", "find_emergency_shelter", "get_pha_guide"):
        # Look for markdown headers (## Program Name) or numbered items
        headers = _re.findall(r"^#{1,3}\s+(.+)$", output_str, _re.MULTILINE)
        numbered = _re.findall(r"^\d+\.\s+\*\*(.+?)\*\*", output_str, _re.MULTILINE)
        programs = headers or numbered
        # Also try to find a count statement like "Found 4 agencies"
        count_match = _re.search(r"[Ff]ound\s+(\d+)", output_str)
        count = int(count_match.group(1)) if count_match else len(programs)
        payload["count"] = count
        if programs:
            payload["programs"] = programs[:10]  # cap at 10

    elif tool_name == "log_housing_application":
        # Extract program name and status
        prog_match = _re.search(r"\*\*(.+?)\*\*", output_str)
        status_match = _re.search(r"Status:\s*(\w+)", output_str) or _re.search(r"→\s*(\w+)", output_str)
        if prog_match:
            payload["program"] = prog_match.group(1)
        if status_match:
            payload["status"] = status_match.group(1)
        payload["action"] = "updated" if "updated" in output_str.lower() else "created"

    elif tool_name == "prepare_housing_application":
        # Count checklist items
        items = _re.findall(r"^[-*]\s+\[[ x]\]", output_str, _re.MULTILINE)
        if items:
            payload["checklist_count"] = len(items)

    return payload


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
    """Check if the user has completed initial setup (has a name)."""
    db = get_db()
    try:
        populated = get_populated_fields(db, DEFAULT_USER_ID)
        # A user "exists" only if they've set their name (via onboarding).
        # Default fields like preferred_language="en" don't count.
        identity = populated.get("identity", {})
        has_data = bool(identity.get("legal_name"))
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

_MIME_EXT = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "application/pdf": ".pdf",
}


@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload a document image for OCR extraction.

    Accepts JPEG, PNG, WebP, HEIC, or PDF. Extracts structured fields
    via Gemini Flash, maps to the DB schema, and writes to the profile.
    The uploaded file is saved to data/documents/.
    """
    if not file.content_type:
        return {"ok": False, "error": "No content type specified"}

    allowed = {"image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"}
    if file.content_type not in allowed:
        return {"ok": False, "error": f"Unsupported file type: {file.content_type}"}

    image_data = await file.read()

    # Save file to disk
    docs_dir = DATA_DIR / "documents"
    docs_dir.mkdir(parents=True, exist_ok=True)
    ext = _MIME_EXT.get(file.content_type, "")
    file_id = str(uuid4())
    file_name = f"{file_id}{ext}"
    file_on_disk = docs_dir / file_name
    file_on_disk.write_bytes(image_data)

    try:
        result = await asyncio.to_thread(
            process_document, image_data, DEFAULT_USER_ID, file.content_type,
            str(file_on_disk), file.content_type,
        )
        return {"ok": True, **result}
    except Exception as e:
        logger.error("OCR processing failed: %s", e)
        return {"ok": False, "error": str(e)}


@app.get("/api/documents")
async def list_generated_documents():
    """List generated documents (cover letters, resumes, etc.) from data/documents/."""
    docs_dir = DATA_DIR / "documents"
    if not docs_dir.exists():
        return []

    TYPE_PREFIXES = {
        "cover_letter": "cover_letter",
        "resume": "resume",
        "housing_letter": "housing_letter",
        "legal_letter": "legal_letter",
    }

    results = []
    for fp in sorted(docs_dir.rglob("*"), key=lambda f: f.stat().st_mtime, reverse=True):
        if fp.is_dir() or fp.suffix not in (".md", ".txt"):
            continue

        content = fp.read_text(encoding="utf-8", errors="replace")
        stem = fp.stem.lower()
        doc_type = "cover_letter"  # default
        for prefix, dtype in TYPE_PREFIXES.items():
            if prefix in stem:
                doc_type = dtype
                break

        title = content.split("\n", 1)[0].lstrip("# ").strip() or fp.stem.replace("_", " ").title()

        results.append({
            "id": fp.stem,
            "type": doc_type,
            "title": title,
            "content": content,
            "createdAt": datetime.fromtimestamp(fp.stat().st_mtime).isoformat(),
            "wordCount": len(content.split()),
        })

    return results


@app.get("/api/documents/uploads")
async def list_uploaded_documents():
    """List all previously uploaded documents (OCR results, no image data)."""
    db = get_db()
    try:
        return get_uploaded_documents(db, DEFAULT_USER_ID)
    finally:
        db.close()


@app.get("/api/documents/uploads/{doc_id}")
async def get_uploaded_document(doc_id: str):
    """Get a single uploaded document with full extraction details."""
    db = get_db()
    try:
        doc = get_uploaded_document_by_id(db, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        return doc
    finally:
        db.close()


@app.get("/api/documents/uploads/{doc_id}/file")
async def get_uploaded_document_file(doc_id: str):
    """Serve the original uploaded file for a document."""
    from fastapi.responses import FileResponse

    db = get_db()
    try:
        doc = get_uploaded_document_by_id(db, doc_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
    finally:
        db.close()

    fp = doc.get("file_path")
    if not fp or not Path(fp).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(fp, media_type=doc.get("mime_type", "application/octet-stream"))


# ---------------------------------------------------------------------------
# Generated documents (resumes, cover letters, etc.)
# ---------------------------------------------------------------------------

from threshold.tools.document_writer import list_generated_documents, get_generated_document


@app.get("/api/documents/generated")
async def list_generated_docs():
    """List all generated documents (resumes, cover letters, etc.)."""
    return list_generated_documents()


@app.get("/api/documents/generated/{doc_id}")
async def get_generated_doc(doc_id: str):
    """Get a specific generated document with content."""
    doc = get_generated_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.get("/api/documents/generated/{doc_id}/download")
async def download_generated_doc(doc_id: str, format: str = "pdf"):
    """Download a generated document as a file.

    Args:
        doc_id: The document ID
        format: Output format - "pdf" (default), "md", or "txt"
    """
    from fastapi.responses import FileResponse, Response

    doc = get_generated_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    fp = doc.get("file_path")
    if not fp or not Path(fp).exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    file_path = Path(fp)
    base_filename = file_path.stem  # filename without extension

    # If format is PDF and source is markdown, convert
    if format.lower() == "pdf" and file_path.suffix == ".md":
        from threshold.tools.pdf_converter import convert_resume_to_pdf

        try:
            pdf_bytes = convert_resume_to_pdf(file_path)
            pdf_filename = f"{base_filename}.pdf"
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": f"attachment; filename={pdf_filename}"},
            )
        except Exception as e:
            logger.error(f"PDF conversion failed: {e}")
            raise HTTPException(status_code=500, detail=f"PDF conversion failed: {e}")

    # Return markdown file as-is
    if format.lower() == "md" and file_path.suffix == ".md":
        return FileResponse(
            fp,
            media_type="text/markdown",
            filename=doc.get("filename", f"{doc_id}.md"),
            headers={"Content-Disposition": f"attachment; filename={doc.get('filename', f'{doc_id}.md')}"},
        )

    # Default: return as plain text
    filename = doc.get("filename", f"{doc_id}.txt")
    return FileResponse(
        fp,
        media_type="text/plain",
        filename=filename,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@app.get("/api/profile/completion/fields")
async def profile_completion_fields():
    """Per-field completion status: {section: {field: bool}}."""
    db = get_db()
    try:
        return get_completion_status(db, DEFAULT_USER_ID)
    finally:
        db.close()


@app.get("/api/profile/completion/matrix")
async def profile_completion_matrix():
    """Curated profile field matrix with human labels and conditional logic."""
    db = get_db()
    try:
        return get_profile_field_matrix(db, DEFAULT_USER_ID)
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Housing pipeline
# ---------------------------------------------------------------------------

# Import constants from housing tools (not file I/O)
from threshold.tools.housing_search import (
    _FAIR_CHANCE_LAWS, _PIPELINE_STAGES, _STAGE_LABELS, _NEXT_ACTIONS,
    _TERMINAL_STATUSES, get_pending_follow_ups,
)
from threshold.db.crud import (
    delete_housing_application,
    delete_job_application,
    get_housing_applications,
    get_job_applications,
    update_housing_application,
    update_job_application,
    upsert_housing_application,
    upsert_job_application,
)
from threshold.tools.job_search import (
    _PIPELINE_STAGES as JOB_PIPELINE_STAGES,
    _STAGE_LABELS as JOB_STAGE_LABELS,
    _NEXT_ACTIONS as JOB_NEXT_ACTIONS,
    _TERMINAL_STATUSES as JOB_TERMINAL_STATUSES,
    get_pending_job_follow_ups,
)


@app.get("/api/housing/pipeline")
async def housing_pipeline():
    """Return the full housing application pipeline as structured JSON."""
    db = get_db()
    try:
        apps = get_housing_applications(db, DEFAULT_USER_ID)
    finally:
        db.close()

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


class HousingApplicationUpdate(BaseModel):
    program: str | None = None
    status: str | None = None
    notes: str | None = None
    follow_up_date: str | None = None
    contact_name: str | None = None
    contact_phone: str | None = None
    application_url: str | None = None
    deadline: str | None = None
    interview_date: str | None = None
    interview_time: str | None = None
    interview_location: str | None = None
    denial_reason: str | None = None
    documents_submitted: str | None = None
    housing_type: str | None = None


@app.post("/api/housing/applications")
async def create_housing_application(body: HousingApplicationCreate):
    """Log or update a housing application."""
    db = get_db()
    try:
        result = upsert_housing_application(
            db, DEFAULT_USER_ID, body.program, body.status,
            notes=body.notes, follow_up_date=body.follow_up_date,
            contact_name=body.contact_name, contact_phone=body.contact_phone,
            application_url=body.application_url, deadline=body.deadline,
            interview_date=body.interview_date, interview_time=body.interview_time,
            interview_location=body.interview_location, denial_reason=body.denial_reason,
            documents_submitted=body.documents_submitted, housing_type=body.housing_type,
        )
    finally:
        db.close()
    return result


@app.patch("/api/housing/applications/{app_id}")
async def edit_housing_application(app_id: str, body: HousingApplicationUpdate):
    """Update a housing application by ID (partial update)."""
    db = get_db()
    try:
        result = update_housing_application(db, app_id, body.model_dump(exclude_none=True))
    finally:
        db.close()
    if result is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return result


@app.delete("/api/housing/applications/{app_id}")
async def remove_housing_application(app_id: str):
    """Delete a housing application by ID."""
    db = get_db()
    try:
        deleted = delete_housing_application(db, app_id)
    finally:
        db.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"ok": True}


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
# Employment pipeline
# ---------------------------------------------------------------------------

@app.get("/api/employment/pipeline")
async def employment_pipeline():
    """Return the full job application pipeline as structured JSON."""
    db = get_db()
    try:
        apps = get_job_applications(db, DEFAULT_USER_ID)
    finally:
        db.close()

    active = [a for a in apps if a.get("status") not in JOB_TERMINAL_STATUSES]
    successful = [a for a in apps if a.get("status") in ("accepted", "started")]

    # Find next follow-up
    follow_ups = sorted(
        [a for a in apps if a.get("follow_up_date") and a.get("status") not in JOB_TERMINAL_STATUSES],
        key=lambda a: a.get("follow_up_date", ""),
    )
    next_follow_up = None
    if follow_ups:
        next_follow_up = {
            "company": follow_ups[0]["company"],
            "position": follow_ups[0]["position"],
            "date": follow_ups[0]["follow_up_date"],
        }

    # Add next_action and stage_label to each application
    for app_item in apps:
        app_item["next_action"] = JOB_NEXT_ACTIONS.get(app_item.get("status", ""), "")
        app_item["stage_label"] = JOB_STAGE_LABELS.get(app_item.get("status", ""), app_item.get("status", ""))

    return {
        "applications": apps,
        "active_count": len(active),
        "total_count": len(apps),
        "successful_count": len(successful),
        "next_follow_up": next_follow_up,
        "stages": [{"key": s, "label": JOB_STAGE_LABELS.get(s, s)} for s in JOB_PIPELINE_STAGES],
    }


@app.get("/api/employment/alerts")
async def employment_alerts():
    """Return pending follow-ups, upcoming interviews, and approaching deadlines."""
    return get_pending_job_follow_ups()


class JobApplicationCreate(BaseModel):
    company: str
    position: str
    status: str = "interested"
    notes: str = ""
    apply_url: str = ""
    follow_up_date: str = ""
    deadline: str = ""
    contact_name: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    interview_date: str = ""
    interview_time: str = ""
    interview_location: str = ""
    interview_type: str = ""
    offer_salary: str = ""
    offer_details: str = ""
    rejection_reason: str = ""
    source: str = ""


class JobApplicationUpdate(BaseModel):
    company: str | None = None
    position: str | None = None
    status: str | None = None
    notes: str | None = None
    apply_url: str | None = None
    follow_up_date: str | None = None
    deadline: str | None = None
    contact_name: str | None = None
    contact_email: str | None = None
    contact_phone: str | None = None
    interview_date: str | None = None
    interview_time: str | None = None
    interview_location: str | None = None
    interview_type: str | None = None
    offer_salary: str | None = None
    offer_details: str | None = None
    rejection_reason: str | None = None
    source: str | None = None


@app.post("/api/employment/applications")
async def create_job_application(body: JobApplicationCreate):
    """Log or update a job application."""
    db = get_db()
    try:
        result = upsert_job_application(
            db, DEFAULT_USER_ID, body.company, body.position, body.status,
            notes=body.notes, apply_url=body.apply_url, follow_up_date=body.follow_up_date,
            deadline=body.deadline, contact_name=body.contact_name,
            contact_email=body.contact_email, contact_phone=body.contact_phone,
            interview_date=body.interview_date, interview_time=body.interview_time,
            interview_location=body.interview_location, interview_type=body.interview_type,
            offer_salary=body.offer_salary, offer_details=body.offer_details,
            rejection_reason=body.rejection_reason, source=body.source,
        )
    finally:
        db.close()
    return result


@app.patch("/api/employment/applications/{job_id}")
async def edit_job_application(job_id: str, body: JobApplicationUpdate):
    """Update a job application by ID (partial update)."""
    db = get_db()
    try:
        result = update_job_application(db, job_id, body.model_dump(exclude_none=True))
    finally:
        db.close()
    if result is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return result


@app.delete("/api/employment/applications/{job_id}")
async def remove_job_application(job_id: str):
    """Delete a job application by ID."""
    db = get_db()
    try:
        deleted = delete_job_application(db, job_id)
    finally:
        db.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Application not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# WebSocket — chat with the orchestrator
# ---------------------------------------------------------------------------

@app.websocket("/ws")
async def websocket_chat(ws: WebSocket):
    await ws.accept()

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

                conv_id = msg.get("conversation_id", "default")
                config = {
                    "configurable": {"thread_id": f"threshold-{DEFAULT_USER_ID}-{conv_id}"},
                    "recursion_limit": 75,
                }
                await _handle_chat_message(ws, agent, config, content)

            elif msg_type == "ping":
                await ws.send_json({"type": "pong"})

            else:
                await ws.send_json({
                    "type": "error",
                    "message": f"Unknown message type: {msg_type}",
                })

    except WebSocketDisconnect:
        logger.info("[ws] client disconnected")
    except Exception as e:
        logger.error("WebSocket error: %s\n%s", e, traceback.format_exc())
        try:
            await ws.send_json({"type": "error", "message": str(e)})
        except (WebSocketDisconnect, RuntimeError):
            # Client already disconnected, ignore
            pass
        except Exception:
            pass


_checkpointer = None

async def _get_checkpointer():
    global _checkpointer
    if _checkpointer is None:
        import aiosqlite
        db_path = os.path.join(os.getenv("THRESHOLD_DATA_DIR", "./data"), "checkpoints.db")
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        conn = await aiosqlite.connect(db_path)
        from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
        _checkpointer = AsyncSqliteSaver(conn)
        await _checkpointer.setup()
    return _checkpointer


async def _create_agent():
    """Create the orchestrator agent. Runs in a thread because it loads
    models and reads the profile synchronously."""
    from threshold.agents.orchestrator import create_orchestrator
    checkpointer = await _get_checkpointer()
    return await asyncio.to_thread(create_orchestrator, checkpointer=checkpointer)


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

    # Track if client disconnected mid-processing
    disconnected = False

    async def _safe_send(payload: dict):
        """Send JSON to WebSocket, silently ignoring if disconnected."""
        nonlocal disconnected
        if disconnected:
            return
        try:
            await ws.send_json(payload)
        except (WebSocketDisconnect, RuntimeError):
            disconnected = True

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
        await _safe_send(payload)

    await _safe_send({"type": "thinking"})
    await _send_step("thinking", "started", "Analyzing your message...", icon="psychology")

    emitted_tokens = False
    token_count = 0
    total_token_count = 0
    t_start = time.monotonic()
    t_first_token: float | None = None

    orchestrator_tool: str | None = None
    in_subagent = False
    active_domain: str | None = None  # tracks which domain subagent is active for workflow_update
    subagent_completed = False  # True after task() returns - don't reclassify post-subagent text
    seen_nodes: set[str] = set()
    subagent_step_id: str | None = None
    active_tool_step_ids: dict[str, str] = {}
    pre_tool_buffer: list[str] = []  # accumulates text sent before any tool call
    sub_buf = ""  # accumulates subagent reasoning text (local, not shared across connections)
    active_reasoning_step_id: str | None = None  # tracks subagent reasoning step to complete later

    def _pop_tool_step(tool_name: str) -> str | None:
        """Pop a tool step ID by exact match only."""
        return active_tool_step_ids.pop(tool_name, None)

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
                    await _safe_send({"type": "token", "content": text})
                    pre_tool_buffer.append(text)
                    emitted_tokens = True
                    token_count += len(text)
                    total_token_count += len(text)

                if text and in_subagent:
                    sub_buf += text

                if hasattr(chunk, "tool_call_chunks") and chunk.tool_call_chunks:
                    for tc_chunk in chunk.tool_call_chunks:
                        tc_name = tc_chunk.get("name", "")
                        if tc_name:
                            if in_subagent:
                                # Complete any active reasoning step — LLM is done thinking
                                if active_reasoning_step_id:
                                    await _send_step(
                                        "reasoning", "completed", "Finished thinking",
                                        step_id=active_reasoning_step_id, icon="neurology",
                                    )
                                    active_reasoning_step_id = None
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
                                # Also don't reclassify text AFTER a subagent returns —
                                # that's the orchestrator's summary of the subagent's work.
                                is_subagent_call = tc_name == "task"
                                if emitted_tokens and pre_tool_buffer and not is_subagent_call and not subagent_completed:
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
                                    await _safe_send({"type": "clear_stream"})
                                    pre_tool_buffer.clear()
                                    token_count = 0
                                    emitted_tokens = False

                                orchestrator_tool = tc_name
                                if tc_name == "task":
                                    logger.info("[orchestrator] delegating to subagent...")
                                    in_subagent = True
                                    sub_buf = ""
                                    subagent_step_id = _step_id()
                                    await _send_step(
                                        "subagent", "started",
                                        "Delegating to specialist...",
                                        step_id=subagent_step_id,
                                        icon="smart_toy",
                                    )
                                    await _safe_send({"type": "subagent_start"})
                                elif tc_name == "crisis_response":
                                    logger.info("[orchestrator] !!! crisis_response")
                                    await _safe_send({"type": "crisis_response"})
                                    await _safe_send({
                                        "type": "workflow_update",
                                        "domain": "crisis",
                                        "workflow_event": "crisis",
                                        "label": "Crisis protocol activated",
                                    })
                                    await _safe_send({"type": "tool_start", "tool_name": tc_name})
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
                                    await _safe_send({"type": "tool_start", "tool_name": tc_name})

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
                    # Track domain for workflow_update events
                    if subagent_type and subagent_type in _DOMAIN_TOOL_STAGES:
                        active_domain = subagent_type
                        await _safe_send({
                            "type": "workflow_update",
                            "domain": active_domain,
                            "workflow_event": "start",
                            "workflow_stage": 0,
                            "label": f"Starting {active_domain} specialist...",
                        })
                    if task_desc and subagent_step_id:
                        await _send_step(
                            "subagent", "started",
                            _subagent_label(task_desc),
                            step_id=subagent_step_id,
                            icon="smart_toy",
                        )
                    if not emitted_tokens:
                        ack = _subagent_acknowledgment(subagent_type)
                        await _safe_send({"type": "token", "content": ack})
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
                    sid = _pop_tool_step(name)
                    if sid:
                        await _send_step(
                            "tool", "completed",
                            _tool_display_label(name, done=True),
                            step_id=sid,
                            icon=_tool_icon(name),
                        )
                    else:
                        logger.warning("[subagent] tool_end without matching start for: %s (known: %s)", name, list(active_tool_step_ids.keys()))
                    # Emit workflow_update if inside a tracked domain
                    if active_domain and active_domain in _DOMAIN_TOOL_STAGES:
                        stage_map = _DOMAIN_TOOL_STAGES[active_domain]
                        if name in stage_map:
                            stage_num, stage_label = stage_map[name]
                            payload = _parse_tool_output(name, output_str)
                            label = stage_label
                            if payload.get("count"):
                                label = f"{stage_label} — found {payload['count']}"
                            elif payload.get("program"):
                                label = f"{stage_label}: {payload['program']}"
                            await _safe_send({
                                "type": "workflow_update",
                                "domain": active_domain,
                                "workflow_event": "tool_result",
                                "tool": name,
                                "workflow_stage": stage_num,
                                "label": label,
                                "payload": payload,
                            })
                elif name == "task":
                    # Complete any active reasoning step before ending subagent
                    if active_reasoning_step_id:
                        await _send_step(
                            "reasoning", "completed", "Finished thinking",
                            step_id=active_reasoning_step_id, icon="neurology",
                        )
                        active_reasoning_step_id = None
                    sub_buf_snapshot = sub_buf
                    if sub_buf_snapshot:
                        logger.info("[subagent] reasoning: %s", sub_buf_snapshot[:500])
                    sub_buf = ""
                    logger.info("[subagent] <<< returned (%d chars): %s", len(output_str), output_str[:300])
                    in_subagent = False
                    subagent_completed = True  # Don't reclassify post-subagent text as reasoning
                    orchestrator_tool = None
                    if subagent_step_id:
                        await _send_step(
                            "subagent", "completed", "Specialist finished",
                            step_id=subagent_step_id, icon="smart_toy",
                        )
                    subagent_step_id = None
                    # Emit workflow_update end for domain dashboards
                    if active_domain:
                        await _safe_send({
                            "type": "workflow_update",
                            "domain": active_domain,
                            "workflow_event": "end",
                            "label": f"{active_domain.title()} specialist finished",
                        })
                        active_domain = None
                    await _safe_send({"type": "subagent_end"})
                else:
                    logger.info("[orchestrator] tool_end: %s -> %s", name, output_str[:300])
                    orchestrator_tool = None
                    sid = _pop_tool_step(name)
                    if sid:
                        await _send_step(
                            "tool", "completed",
                            _tool_display_label(name, done=True),
                            step_id=sid,
                            icon=_tool_icon(name),
                        )
                    else:
                        logger.warning("[orchestrator] tool_end without matching start for: %s (known: %s)", name, list(active_tool_step_ids.keys()))
                    await _safe_send({"type": "tool_end"})

            # ── LLM start (log which model is being called) ──────────
            elif evt == "on_chat_model_start":
                model_name = name or "unknown"
                if in_subagent:
                    logger.info("[subagent] llm_start: %s (node=%s)", model_name, node)
                    # Complete previous reasoning step if still active
                    if active_reasoning_step_id:
                        await _send_step(
                            "reasoning", "completed", "Finished thinking",
                            step_id=active_reasoning_step_id, icon="neurology",
                        )
                    active_reasoning_step_id = _step_id()
                    await _send_step(
                        "reasoning", "started", "Threshold is thinking...",
                        step_id=active_reasoning_step_id, icon="neurology",
                    )
                elif DEBUG_WS_STREAM:
                    logger.info("[orchestrator] llm_start: %s (node=%s)", model_name, node)

        if not emitted_tokens:
            await _safe_send({
                "type": "token",
                "content": "I'm sorry, I wasn't able to process that. Could you try again?",
            })

        t_end = time.monotonic()
        logger.info(
            "[done] streamed %d chars in %.1fs (TTFT: %.2fs)",
            total_token_count, t_end - t_start, (t_first_token or t_end) - t_start,
        )
        logger.info("=" * 70)
        await _send_step("thinking", "completed", "Done", icon="check_circle")
        await _safe_send({"type": "message_complete"})

    except Exception as e:
        logger.error("Agent error: %s\n%s", e, traceback.format_exc())
        await _safe_send({
            "type": "error",
            "message": f"Something went wrong: {str(e)}",
        })
        # Signal completion so the frontend cleans up any stuck steps
        await _safe_send({"type": "message_complete"})


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


def _subagent_acknowledgment(subagent_type: str) -> str:
    messages: dict[str, str] = {
        "housing": "Let me look into housing options for you.\n\n",
        "benefits": "Let me check on benefits eligibility for you.\n\n",
        "employment": "Let me look into employment options for you.\n\n",
        "legal": "Let me look into that for you.\n\n",
        "form-filler": "Let me help fill out that form.\n\n",
    }
    return messages.get(subagent_type, "Let me look into that for you.\n\n")
