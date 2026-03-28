from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from langchain_core.tools import tool

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
HOUSING_APPS_LOG = DATA_DIR / "tracking" / "housing_applications.json"

# TODO: Replace with real 211.org API or web scraping
# Expected: GET https://api.211.org/search?location={location}&category=housing
MOCK_HOUSING = [
    {
        "name": "The Fortune Society — Castle Gardens",
        "type": "transitional",
        "location": "New York, NY",
        "contact": "(212) 691-7554",
        "website": "https://fortunesociety.org",
        "description": "Supportive housing for people in re-entry. Case management, job training, and mental health services included.",
        "background_check": False,
        "accepts_sex_offenses": False,
    },
    {
        "name": "Delancey Street Foundation",
        "type": "transitional",
        "location": "San Francisco, CA",
        "contact": "(415) 512-5104",
        "website": "https://www.delanceystreetfoundation.org",
        "description": "Residential self-help program. No background check. Vocational training, education, and housing for 2-4 years.",
        "background_check": False,
        "accepts_sex_offenses": False,
    },
    {
        "name": "Pioneer Human Services",
        "type": "transitional",
        "location": "Seattle, WA",
        "contact": "(206) 766-7000",
        "website": "https://pioneerhumanservices.org",
        "description": "Housing, employment, and treatment for people in re-entry. Multiple locations across Washington state.",
        "background_check": False,
        "accepts_sex_offenses": False,
    },
    {
        "name": "Salvation Army Adult Rehabilitation Centers",
        "type": "shelter",
        "location": "Nationwide",
        "contact": "Call 211 for local center",
        "website": "https://www.salvationarmyusa.org",
        "description": "Emergency and transitional housing. Work therapy program included. No background check for most locations.",
        "background_check": False,
        "accepts_sex_offenses": True,
    },
    {
        "name": "Local Section 8 / Housing Choice Voucher",
        "type": "voucher",
        "location": "Contact local PHA",
        "contact": "Find your PHA at hud.gov/program_offices/public_indian_housing/pha/contacts",
        "website": "https://www.hud.gov/topics/housing_choice_voucher_program_section_8",
        "description": "Federal rental assistance. Long waitlists in most areas. HUD only bars lifetime sex offender registration and meth production convictions.",
        "background_check": True,
        "accepts_sex_offenses": False,
    },
]


@tool
def search_housing(location: str, housing_type: str = "") -> str:
    """Search for housing options for people in re-entry.

    Args:
        location: City and/or state (e.g. "New York, NY")
        housing_type: Optional filter: transitional, shelter, voucher, or leave empty for all
    """
    results = MOCK_HOUSING
    if housing_type:
        filtered = [h for h in results if h["type"] == housing_type.lower()]
        if filtered:
            results = filtered

    lines = [f"**Housing options** (showing {len(results)} results):\n"]
    for i, h in enumerate(results, 1):
        bg = "No background check" if not h["background_check"] else "Background check required"
        lines.append(f"**{i}. {h['name']}** [{h['type']}]")
        lines.append(f"   Location: {h['location']} | {bg}")
        lines.append(f"   {h['description']}")
        lines.append(f"   Contact: {h['contact']}")
        if h.get("website"):
            lines.append(f"   Website: {h['website']}")
        lines.append("")

    lines.append(
        "*Call 211 for the most current local housing options in your area. "
        "These listings are general examples and availability changes frequently.*"
    )
    return "\n".join(lines)


@tool
def log_housing_application(program: str, status: str, notes: str = "") -> str:
    """Log a housing application for tracking.

    Args:
        program: Housing program or landlord name
        status: One of: applied, waitlisted, interview_scheduled, approved, denied
        notes: Any additional notes
    """
    HOUSING_APPS_LOG.parent.mkdir(parents=True, exist_ok=True)
    apps = []
    if HOUSING_APPS_LOG.exists():
        try:
            apps = json.loads(HOUSING_APPS_LOG.read_text())
        except (json.JSONDecodeError, OSError):
            pass

    apps.append({
        "id": str(uuid4()),
        "program": program,
        "status": status,
        "notes": notes,
        "applied_at": datetime.now().isoformat(),
    })
    HOUSING_APPS_LOG.write_text(json.dumps(apps, indent=2))

    from ..memory.observation_stream import log_observation

    log_observation(
        agent="housing",
        event_type="milestone",
        content=f"Housing application: {program} — {status}",
        tags=["housing", "application"],
    )
    return f"Housing application logged: {program} ({status})"
