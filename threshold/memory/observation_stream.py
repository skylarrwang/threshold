from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
STREAM_PATH = DATA_DIR / "memory" / "observation_stream.json"

IMPORTANCE_KEYWORDS: dict[str, float] = {
    "crisis": 1.0,
    "suicid": 1.0,
    "self-harm": 1.0,
    "milestone": 0.8,
    "job_offer": 0.9,
    "hired": 0.9,
    "housing_secured": 0.9,
    "rejection": 0.6,
    "check_in": 0.5,
    "cover_letter": 0.5,
    "resume": 0.5,
    "application": 0.5,
    "benefits": 0.4,
    "reflection": 0.3,
}


class Observation(BaseModel):
    observation_id: str = Field(default_factory=lambda: str(uuid4()))
    timestamp: datetime = Field(default_factory=datetime.now)
    agent: str = "orchestrator"
    event_type: Literal["user_message", "tool_result", "milestone", "check_in", "reflection"] = "tool_result"
    content: str = ""
    importance: float = 0.5
    tags: list[str] = Field(default_factory=list)


def score_importance(content: str) -> float:
    """Heuristic importance scoring based on keyword matching."""
    lower = content.lower()
    best = 0.3
    for keyword, score in IMPORTANCE_KEYWORDS.items():
        if keyword in lower:
            best = max(best, score)
    return best


def _load_stream() -> list[dict]:
    if not STREAM_PATH.exists():
        return []
    try:
        return json.loads(STREAM_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return []


def _save_stream(data: list[dict]) -> None:
    STREAM_PATH.parent.mkdir(parents=True, exist_ok=True)
    STREAM_PATH.write_text(json.dumps(data, indent=2, default=str))


def log_observation(
    agent: str = "orchestrator",
    event_type: str = "tool_result",
    content: str = "",
    importance: Optional[float] = None,
    tags: Optional[list[str]] = None,
) -> None:
    if importance is None:
        importance = score_importance(content)
    obs = Observation(
        agent=agent,
        event_type=event_type,
        content=content,
        importance=importance,
        tags=tags or [],
    )
    stream = _load_stream()
    stream.append(obs.model_dump(mode="json"))
    _save_stream(stream)


def get_recent_observations(n: int = 20, agent: str | None = None) -> list[Observation]:
    stream = _load_stream()
    if agent:
        stream = [o for o in stream if o.get("agent") == agent]
    recent = stream[-n:]
    return [Observation.model_validate(o) for o in recent]


def get_observations_by_tag(tags: list[str], limit: int = 10) -> list[Observation]:
    stream = _load_stream()
    tag_set = set(tags)
    matched = [o for o in stream if tag_set & set(o.get("tags", []))]
    return [Observation.model_validate(o) for o in matched[-limit:]]
