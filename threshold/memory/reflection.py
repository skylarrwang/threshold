from __future__ import annotations

import json
import os
from datetime import datetime, timedelta
from pathlib import Path

from .observation_stream import Observation, get_recent_observations
from .profile import UserProfile

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
REFLECTIONS_PATH = DATA_DIR / "memory" / "reflections.json"


def build_memory_context(profile: UserProfile) -> str:
    """Build a formatted string of profile + reflections + observations for prompt injection.

    The profile is expected to come from profile_bridge.load_profile_from_db(),
    which already reads all fixed-schema fields from the DB.
    """
    lines = []

    p = profile.personal
    name = p.name or "the user"
    lines.append(f"Name: {name}")
    if p.home_state:
        lines.append(f"Location: {p.home_state}")
    if p.release_date:
        lines.append(f"Release date: {p.release_date}")
    if p.offense_category and p.offense_category != "other":
        lines.append(f"Offense category: {p.offense_category}")

    s = profile.situation
    lines.append(f"Housing: {s.housing_status}")
    lines.append(f"Employment: {s.employment_status}")
    if s.supervision_type != "none":
        sup = f"Supervision: {s.supervision_type}"
        if s.supervision_end_date:
            sup += f" (ends {s.supervision_end_date})"
        lines.append(sup)
    if s.immediate_needs:
        lines.append(f"Immediate needs: {', '.join(s.immediate_needs)}")
    if s.benefits_enrolled:
        lines.append(f"Benefits enrolled: {', '.join(s.benefits_enrolled)}")

    f = profile.financial
    if f.household_size > 1 or f.is_employed or f.income.job_income_monthly > 0:
        lines.append(f"\nHousehold size: {f.household_size}")
        total_income = sum(
            getattr(f.income, field_name)
            for field_name in f.income.model_fields
        )
        if total_income > 0:
            lines.append(f"Monthly income: ~${total_income:,.0f}")
        if f.is_employed:
            lines.append("Currently employed")
        if f.housing.rent_or_mortgage > 0:
            lines.append(f"Rent/mortgage: ${f.housing.rent_or_mortgage:,.0f}/mo")

    g = profile.goals
    if g.short_term_goals:
        lines.append(f"Short-term goals: {', '.join(g.short_term_goals)}")
    if g.long_term_goals:
        lines.append(f"Long-term goals: {', '.join(g.long_term_goals)}")
    if g.strengths:
        lines.append(f"Strengths: {', '.join(g.strengths)}")

    sup_ctx = profile.support
    if sup_ctx.has_case_worker:
        lines.append(f"Case worker: {sup_ctx.case_worker_name or 'Yes'}")

    pref = profile.preferences
    lines.append(f"Communication style: {pref.communication_style}")

    reflections = load_recent_reflections(days=7)
    if reflections:
        lines.append("\n### Recent Reflections")
        for r in reflections[-5:]:
            lines.append(f"- {r}")

    recent_obs = get_recent_observations(n=5)
    if recent_obs:
        lines.append("\n### Recent Events")
        for obs in recent_obs:
            lines.append(f"- [{obs.event_type}] {obs.content}")

    return "\n".join(lines)


def synthesize_reflections(
    profile: UserProfile, recent_obs: list[Observation]
) -> list[str]:
    """Synthesize observations into reflections. Uses LLM if available, otherwise heuristic."""
    try:
        from langchain_openai import ChatOpenAI

        model = ChatOpenAI(
            model=os.getenv("THRESHOLD_MODEL", "grok-4-1-fast"),
            base_url="https://api.x.ai/v1",
            api_key=os.getenv("XAI_API_KEY", "not-set"),
        )
        obs_text = "\n".join(
            f"- [{o.event_type}] {o.content}" for o in recent_obs
        )
        context = build_memory_context(profile)
        prompt = (
            f"Given this person's situation:\n{context}\n\n"
            f"And these recent events:\n{obs_text}\n\n"
            "What are the 3-5 most important insights or patterns you notice? "
            "Focus on progress, challenges, and emerging needs. "
            "Return each insight as a single line."
        )
        response = model.invoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)
        return [line.strip().lstrip("- ") for line in text.strip().split("\n") if line.strip()]
    except Exception:
        reflections = []
        if recent_obs:
            milestones = [o for o in recent_obs if o.event_type == "milestone"]
            if milestones:
                reflections.append(
                    f"Made progress: {milestones[-1].content}"
                )
            check_ins = [o for o in recent_obs if o.event_type == "check_in"]
            if check_ins:
                reflections.append(
                    f"Recent check-in activity: {check_ins[-1].content}"
                )
            if not reflections:
                reflections.append(
                    f"Active with {len(recent_obs)} recent events."
                )
        return reflections or ["No recent activity to reflect on."]


def save_reflections(reflections: list[str]) -> None:
    REFLECTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
    existing = []
    if REFLECTIONS_PATH.exists():
        try:
            existing = json.loads(REFLECTIONS_PATH.read_text())
        except (json.JSONDecodeError, OSError):
            pass
    entry = {
        "timestamp": datetime.now().isoformat(),
        "reflections": reflections,
    }
    existing.append(entry)
    REFLECTIONS_PATH.write_text(json.dumps(existing, indent=2))


def load_recent_reflections(days: int = 7) -> list[str]:
    if not REFLECTIONS_PATH.exists():
        return []
    try:
        entries = json.loads(REFLECTIONS_PATH.read_text())
    except (json.JSONDecodeError, OSError):
        return []

    cutoff = datetime.now() - timedelta(days=days)
    recent: list[str] = []
    for entry in entries:
        try:
            ts = datetime.fromisoformat(entry["timestamp"])
            if ts >= cutoff:
                recent.extend(entry["reflections"])
        except (KeyError, ValueError):
            continue
    return recent
