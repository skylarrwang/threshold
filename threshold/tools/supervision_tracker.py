from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from langchain_core.tools import tool

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
SUPERVISION_LOG = DATA_DIR / "tracking" / "supervision_log.json"


def _load_log() -> dict:
    if not SUPERVISION_LOG.exists():
        return {"conditions": [], "check_ins": []}
    try:
        return json.loads(SUPERVISION_LOG.read_text())
    except (json.JSONDecodeError, OSError):
        return {"conditions": [], "check_ins": []}


def _save_log(data: dict) -> None:
    SUPERVISION_LOG.parent.mkdir(parents=True, exist_ok=True)
    SUPERVISION_LOG.write_text(json.dumps(data, indent=2))


@tool
def add_condition(condition_text: str, condition_type: str) -> str:
    """Log a supervision condition to the tracker.

    Args:
        condition_text: The condition as written (e.g. "Must report by 5pm every Friday")
        condition_type: One of: check_in, curfew, travel_restriction, drug_test,
                        employment_requirement, other
    """
    data = _load_log()
    data["conditions"].append({
        "id": str(uuid4()),
        "text": condition_text,
        "type": condition_type,
        "added_at": datetime.now().isoformat(),
    })
    _save_log(data)
    return f"Condition logged: {condition_text}"


@tool
def log_check_in(date: str, check_in_type: str, outcome: str, notes: str = "") -> str:
    """Record that a supervision check-in occurred.

    Args:
        date: Date of check-in (YYYY-MM-DD)
        check_in_type: e.g. "in-person", "phone", "office"
        outcome: e.g. "completed", "missed", "rescheduled"
        notes: Any additional notes
    """
    data = _load_log()
    data["check_ins"].append({
        "id": str(uuid4()),
        "date": date,
        "type": check_in_type,
        "outcome": outcome,
        "notes": notes,
        "logged_at": datetime.now().isoformat(),
    })
    _save_log(data)
    return f"Check-in recorded: {date} — {outcome}"


@tool
def get_upcoming_requirements(days: int = 7) -> str:
    """Return supervision requirements due in the next N days.

    Args:
        days: Look-ahead window in days (default 7)
    """
    data = _load_log()
    conditions = data.get("conditions", [])
    check_ins = data.get("check_ins", [])

    if not conditions and not check_ins:
        return "No supervision conditions or check-ins on file."

    lines = ["**Supervision Summary:**\n"]

    if conditions:
        lines.append("**Active conditions:**")
        for c in conditions:
            lines.append(f"- [{c['type']}] {c['text']}")

    if check_ins:
        recent = sorted(check_ins, key=lambda x: x.get("date", ""))[-5:]
        lines.append("\n**Recent check-ins:**")
        for ci in recent:
            status = ci.get("outcome", "unknown")
            lines.append(f"- {ci['date']}: {ci['type']} — {status}")
            if ci.get("notes"):
                lines.append(f"  Notes: {ci['notes']}")

    now = datetime.now()
    upcoming_date = (now + timedelta(days=days)).strftime("%Y-%m-%d")
    lines.append(
        f"\n*Showing conditions and check-ins through {upcoming_date}. "
        f"Set reminders for recurring conditions.*"
    )

    return "\n".join(lines)
