from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from langchain_core.tools import tool

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
APPLICATIONS_LOG = DATA_DIR / "tracking" / "job_applications.json"

BAN_THE_BOX_STATES = {
    "CA", "CO", "CT", "DC", "HI", "IL", "MA", "MD", "MN", "NJ",
    "NM", "NY", "OR", "RI", "VT", "WA",
}

# TODO: Replace with real Adzuna API call (https://developer.adzuna.com/)
# Expected shape: GET /v1/api/jobs/{country}/search/{page}?app_id=...&app_key=...&what={query}&where={location}
MOCK_JOBS = [
    {
        "title": "Warehouse Associate",
        "company": "Amazon Fulfillment",
        "location": "Various locations",
        "salary": "$17-21/hr",
        "ban_the_box": True,
        "description": "Full-time warehouse roles. Background-friendly employer. Benefits after 90 days.",
        "apply_url": "https://www.amazon.jobs/",
    },
    {
        "title": "Line Cook",
        "company": "Greyston Bakery",
        "location": "Yonkers, NY",
        "salary": "$16-19/hr",
        "ban_the_box": True,
        "description": "Open hiring — no background check, no interview, no resume required.",
        "apply_url": "https://greyston.org/open-hiring/",
    },
    {
        "title": "CDL Truck Driver",
        "company": "Werner Enterprises",
        "location": "Nationwide",
        "salary": "$55,000-75,000/yr",
        "ban_the_box": True,
        "description": "Second-chance employer. CDL training available. Must be 1+ year post-release.",
        "apply_url": "https://www.werner.com/careers/",
    },
    {
        "title": "Maintenance Technician",
        "company": "Goodwill Industries",
        "location": "Various locations",
        "salary": "$15-18/hr",
        "ban_the_box": True,
        "description": "Fair-chance employer. Skills training and career advancement available.",
        "apply_url": "https://www.goodwill.org/jobs-training/",
    },
    {
        "title": "Customer Service Representative",
        "company": "Dave's Killer Bread",
        "location": "Milwaukie, OR",
        "salary": "$18-22/hr",
        "ban_the_box": True,
        "description": "Second Chance employer — one-third of employees have a criminal background. Full benefits.",
        "apply_url": "https://www.daveskillerbread.com/careers",
    },
]


@tool
def search_jobs(query: str, location: str = "") -> str:
    """Search for jobs relevant to the user's skills and situation.
    Prioritizes ban-the-box and second-chance employers.

    Args:
        query: Job search keywords (e.g. "warehouse", "food service", "construction")
        location: City/state to search in (e.g. "New York, NY")
    """
    query_lower = query.lower()
    results = []
    for job in MOCK_JOBS:
        title_lower = job["title"].lower()
        desc_lower = job["description"].lower()
        if any(
            term in title_lower or term in desc_lower
            for term in query_lower.split()
        ) or not query.strip():
            results.append(job)

    if not results:
        results = MOCK_JOBS[:3]

    lines = [f"**Job search results for '{query}'** (showing {len(results)} results):\n"]
    for i, job in enumerate(results, 1):
        btb = " [Ban-the-Box]" if job.get("ban_the_box") else ""
        lines.append(f"**{i}. {job['title']}** at {job['company']}{btb}")
        lines.append(f"   Location: {job['location']} | Pay: {job['salary']}")
        lines.append(f"   {job['description']}")
        lines.append(f"   Apply: {job['apply_url']}\n")

    lines.append(
        "*Note: These results prioritize employers known to be background-friendly. "
        "Always verify current hiring policies directly with the employer.*"
    )
    return "\n".join(lines)


@tool
def log_job_application(company: str, position: str, status: str, notes: str = "") -> str:
    """Log a job application for tracking.

    Args:
        company: Company name
        position: Job title applied for
        status: One of: applied, interview_scheduled, interviewed, offered, rejected, accepted
        notes: Any additional notes
    """
    APPLICATIONS_LOG.parent.mkdir(parents=True, exist_ok=True)
    apps = []
    if APPLICATIONS_LOG.exists():
        try:
            apps = json.loads(APPLICATIONS_LOG.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    apps.append({
        "id": str(uuid4()),
        "company": company,
        "position": position,
        "status": status,
        "notes": notes,
        "applied_at": datetime.now().isoformat(),
    })
    APPLICATIONS_LOG.write_text(json.dumps(apps, indent=2))

    from ..memory.observation_stream import log_observation

    log_observation(
        agent="employment",
        event_type="milestone",
        content=f"Job application: {position} at {company} — {status}",
        tags=["job_search", "application"],
    )
    return f"Application logged: {position} at {company} ({status})"


@tool
def get_ban_the_box_status(state: str) -> str:
    """Check if a state has ban-the-box laws for private employers.

    Args:
        state: Two-letter state code (e.g. "NY")
    """
    state = state.upper()
    if state in BAN_THE_BOX_STATES:
        return (
            f"**{state} has ban-the-box laws.**\n\n"
            "Private employers in this state are restricted from asking about criminal "
            "history on initial job applications. They can only inquire after a conditional "
            "offer or at a later stage in the hiring process.\n\n"
            "This applies to most private employers, though specific rules vary. "
            "Check your state's Fair Chance Act details for employer size thresholds."
        )
    return (
        f"**{state} does not have a statewide ban-the-box law for private employers.**\n\n"
        "However, some cities or counties within the state may have local ordinances. "
        "Many large employers have voluntarily adopted fair-chance hiring policies.\n\n"
        "Look for employers who are part of the Fair Chance Business Pledge."
    )
