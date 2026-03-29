"""Cross-process shared interview state via a JSON file.

The voice bot and FastAPI server run as separate processes. This module
provides a tiny shared-state layer backed by a JSON file in data/ so
both processes can read/write the current interview phase without needing
IPC, Redis, or DB schema changes.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_STATE_FILE = Path(
    os.environ.get(
        "INTERVIEW_STATE_FILE",
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "interview_state.json"),
    )
)


def _read() -> dict[str, Any]:
    try:
        return json.loads(_STATE_FILE.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _write(state: dict[str, Any]) -> None:
    _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp = _STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state))
    tmp.replace(_STATE_FILE)


def set_phase(phase: str) -> None:
    state = _read()
    state["current_phase"] = phase
    state["active"] = True
    _write(state)
    logger.debug("[shared_state] phase → %s", phase)


def get_phase() -> str | None:
    return _read().get("current_phase")


def is_active() -> bool:
    return _read().get("active", False)


def mark_inactive() -> None:
    state = _read()
    state["active"] = False
    _write(state)
    logger.debug("[shared_state] session marked inactive")
