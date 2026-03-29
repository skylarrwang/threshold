"""Post-interview synthesis — generates person-centered summary, highlight
reel, and care plan seed from interview data.
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any

from threshold.db.crud import get_full_profile, get_intake_status
from threshold.db.database import get_db
from threshold.memory.observation_stream import get_recent_observations

logger = logging.getLogger(__name__)

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
DEFAULT_USER_ID = "default-user"


async def synthesize_interview(flow_state: dict[str, Any]) -> dict[str, Any]:
    """Run the full post-interview synthesis pipeline.

    Args:
        flow_state: The FlowManager state dict containing fields_saved,
            observations, and needs_help lists.

    Returns a dict with: summary, highlights, care_plan, and stats.
    """
    db = get_db()
    try:
        profile = get_full_profile(db, DEFAULT_USER_ID)
        intake = get_intake_status(db, DEFAULT_USER_ID)
    finally:
        db.close()

    observations = flow_state.get("observations", [])
    fields_saved = flow_state.get("fields_saved", [])
    needs_help = flow_state.get("needs_help", [])

    summary = await _generate_summary(profile, observations)
    highlights = _extract_highlights(observations, needs_help)
    care_plan = _generate_care_plan(profile, intake, needs_help)

    _update_agents_md(summary)

    return {
        "summary": summary,
        "highlights": highlights,
        "care_plan": care_plan,
        "stats": {
            "fields_captured": len(fields_saved),
            "observations_logged": len(observations),
            "needs_help_count": len(needs_help),
            "completion_pct": intake["overall_pct"],
        },
    }


async def _generate_summary(
    profile: dict[str, Any],
    observations: list[dict],
) -> str:
    """Generate a person-centered summary using an LLM.

    Falls back to a structured summary if the LLM is unavailable.
    """
    obs_text = "\n".join(
        f"- [{o['category']}] {o['content']}" for o in observations
    )

    name = profile.get("identity", {}).get("legal_name", "the person")
    housing = profile.get("housing", {}).get("housing_status", "unknown")
    supervision = profile.get("supervision", {}).get("supervision_type", "unknown")
    employment = profile.get("employment", {}).get("employment_status", "unknown")

    prompt = (
        f"You just conducted an intake interview with {name}. Based on these "
        f"observations from the conversation, write a brief person-centered "
        f"summary (3-5 sentences) in natural language. Write it as if you're "
        f"briefing a colleague who will be working with this person next. "
        f"Use their name. Focus on what matters to them, what they're worried "
        f"about, their strengths, and anything that stood out about their "
        f"demeanor or attitude. Do NOT use clinical language or bullet points.\n\n"
        f"Context: Housing={housing}, Supervision={supervision}, "
        f"Employment={employment}\n\n"
        f"Observations:\n{obs_text}\n\n"
        f"Summary:"
    )

    try:
        from langchain_openai import ChatOpenAI

        model = ChatOpenAI(
            model=os.getenv("THRESHOLD_MODEL", "grok-4-1-fast"),
            base_url="https://api.x.ai/v1",
            api_key=os.getenv("XAI_API_KEY", "not-set"),
        )
        response = model.invoke(prompt)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as e:
        logger.warning("LLM summary generation failed, using fallback: %s", e)
        return _fallback_summary(name, observations, profile)


def _fallback_summary(
    name: str, observations: list[dict], profile: dict
) -> str:
    parts = [f"{name} completed an intake interview."]

    goals = [o for o in observations if o["category"] == "goals"]
    if goals:
        parts.append(f"Their main focus: {goals[0]['content']}")

    strengths = [o for o in observations if o["category"] == "strengths"]
    if strengths:
        parts.append(f"Notable strength: {strengths[0]['content']}")

    personality = [o for o in observations if o["category"] == "personality"]
    if personality:
        parts.append(f"Impression: {personality[0]['content']}")

    return " ".join(parts)


def _extract_highlights(
    observations: list[dict],
    needs_help: list[dict],
) -> dict[str, list[str]]:
    highlights: dict[str, list[str]] = {
        "goals": [],
        "strengths": [],
        "concerns": [],
        "needs_follow_up": [],
    }

    for obs in observations:
        cat = obs["category"]
        content = obs["content"]
        if cat == "goals":
            highlights["goals"].append(content)
        elif cat == "strengths":
            highlights["strengths"].append(content)
        elif cat in ("trauma", "substance_use", "attitude"):
            highlights["concerns"].append(content)

    for item in needs_help:
        highlights["needs_follow_up"].append(
            f"{item['section']}.{item['field']}: {item.get('reason', 'needs help')}"
        )

    return highlights


def _generate_care_plan(
    profile: dict[str, Any],
    intake: dict[str, Any],
    needs_help: list[dict],
) -> list[dict[str, str]]:
    """Generate actionable first steps based on profile data."""
    actions: list[dict[str, str]] = []

    health = profile.get("health", {})
    if health.get("insurance_gap") or health.get("has_active_medicaid") is False:
        actions.append({
            "priority": "high",
            "action": "Get Medicaid coverage sorted",
            "reason": "Insurance gap detected — medication continuity is at risk",
            "subagent": "benefits",
        })

    if health.get("current_medications") and health.get("insurance_gap"):
        actions.append({
            "priority": "urgent",
            "action": "Ensure medication access",
            "reason": "Active medications without insurance — lapse is a crisis trigger",
            "subagent": "benefits",
        })

    housing = profile.get("housing", {})
    if housing.get("housing_status") in ("unhoused", "shelter", "couch_surfing"):
        actions.append({
            "priority": "high",
            "action": "Search for stable housing options",
            "reason": "Currently in unstable housing",
            "subagent": "housing",
        })

    employment = profile.get("employment", {})
    skills = employment.get("trade_skills")
    if isinstance(skills, str):
        try:
            skills = json.loads(skills)
        except (json.JSONDecodeError, TypeError):
            skills = []
    if skills and employment.get("employment_status") in ("actively_looking", None):
        skill_list = ", ".join(skills[:3]) if isinstance(skills, list) else str(skills)
        actions.append({
            "priority": "medium",
            "action": f"Search for jobs matching skills: {skill_list}",
            "reason": "Has valuable trade skills and is looking for work",
            "subagent": "employment",
        })

    supervision = profile.get("supervision", {})
    if supervision.get("next_reporting_date"):
        actions.append({
            "priority": "medium",
            "action": "Set up supervision check-in reminders",
            "reason": f"Next check-in: {supervision['next_reporting_date']}",
            "subagent": "legal",
        })

    for item in needs_help:
        actions.append({
            "priority": "medium",
            "action": f"Help find: {item['field'].replace('_', ' ')}",
            "reason": item.get("reason", "User needs help looking this up"),
            "subagent": _field_to_subagent(item["section"]),
        })

    return actions


def _field_to_subagent(section: str) -> str:
    mapping = {
        "identity": "legal",
        "supervision": "legal",
        "housing": "housing",
        "employment": "employment",
        "health": "benefits",
        "benefits": "benefits",
        "documents": "legal",
        "preferences": "legal",
    }
    return mapping.get(section, "legal")


def _update_agents_md(summary: str):
    """Append the interview summary to AGENTS.md."""
    agents_path = Path("./AGENTS.md")
    if not agents_path.exists():
        return

    try:
        content = agents_path.read_text()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
        insert = (
            f"\n## Voice Interview Summary ({timestamp})\n"
            f"{summary}\n"
        )

        marker = "## Recent Progress"
        if marker in content:
            content = content.replace(
                marker, f"{marker}\n{insert}", 1
            )
        else:
            content += insert

        agents_path.write_text(content)
        logger.info("[post-interview] AGENTS.md updated with interview summary")
    except Exception as e:
        logger.error("[post-interview] failed to update AGENTS.md: %s", e)
