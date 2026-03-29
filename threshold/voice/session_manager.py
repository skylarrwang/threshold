"""Voice interview session lifecycle management.

Tracks session state and broadcasts events to frontend WebSocket clients.
No external API calls — SmallWebRTCTransport handles connections peer-to-peer.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import uuid4

from .post_interview import synthesize_interview

logger = logging.getLogger(__name__)


@dataclass
class InterviewSession:
    session_id: str
    user_id: str
    created_at: str
    status: str = "active"
    current_phase: str = "welcome"
    completion_pct: float = 0.0
    engagement_score: float = 0.7
    post_interview_result: dict | None = None
    _ws_connections: list = field(default_factory=list, repr=False)


_sessions: dict[str, InterviewSession] = {}


def register_local_session(user_id: str = "default-user") -> InterviewSession:
    """Register a new interview session (no external API calls needed)."""
    session = InterviewSession(
        session_id=str(uuid4()),
        user_id=user_id,
        created_at=datetime.now().isoformat(),
    )
    _sessions[session.session_id] = session

    logger.info("[session] registered %s", session.session_id)
    return session


def get_session(session_id: str) -> InterviewSession | None:
    return _sessions.get(session_id)


def get_active_session() -> InterviewSession | None:
    """Get the most recently created active session."""
    for session in reversed(list(_sessions.values())):
        if session.status == "active":
            return session
    return None


async def end_session(session_id: str, flow_state: dict | None = None) -> dict | None:
    """End a session and run post-interview synthesis."""
    session = _sessions.get(session_id)
    if not session:
        return None

    session.status = "completed"

    if flow_state:
        result = await synthesize_interview(flow_state)
        session.post_interview_result = result
        logger.info(
            "[session] %s completed — %d fields, %d observations",
            session_id,
            result["stats"]["fields_captured"],
            result["stats"]["observations_logged"],
        )
        return result

    return None


def register_ws(session_id: str, ws):
    """Register a WebSocket connection for real-time event broadcasting."""
    session = _sessions.get(session_id)
    if session:
        session._ws_connections.append(ws)


def unregister_ws(session_id: str, ws):
    session = _sessions.get(session_id)
    if session and ws in session._ws_connections:
        session._ws_connections.remove(ws)


async def broadcast_event(session_id: str, event_type: str, data: dict):
    """Broadcast a real-time event to all connected WebSocket clients."""
    session = _sessions.get(session_id)
    if not session:
        return

    if event_type == "field_saved":
        session.completion_pct = data.get("completion_pct", session.completion_pct)
    elif event_type == "engagement_update":
        session.engagement_score = data.get("score", session.engagement_score)
    elif event_type == "phase_changed":
        session.current_phase = data.get("phase", session.current_phase)

    payload = json.dumps({"type": event_type, **data})
    dead: list = []
    for ws in session._ws_connections:
        try:
            await ws.send_text(payload)
        except Exception:
            dead.append(ws)

    for ws in dead:
        session._ws_connections.remove(ws)


def make_event_callback(session_id: str):
    """Create an event callback bound to a specific session."""
    async def callback(event_type: str, data: dict):
        await broadcast_event(session_id, event_type, data)
    return callback
