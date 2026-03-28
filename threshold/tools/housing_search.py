from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from uuid import uuid4

import httpx
from langchain_core.tools import tool

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
HOUSING_APPS_LOG = DATA_DIR / "tracking" / "housing_applications.json"

HUD_API_KEY = os.getenv("HUD_API_KEY", "")
API_211_KEY = os.getenv("API_211_KEY", "")
_211_BASE = "https://data.211support.org/api/v2"

# City → ZIP lookup for common locations
_CITY_ZIP_TABLE: dict[str, str] = {
    # Connecticut
    "hartford": "06103",
    "bridgeport": "06604",
    "new haven": "06510",
    "stamford": "06901",
    "waterbury": "06702",
    "norwalk": "06851",
    "danbury": "06810",
    "new britain": "06051",
    "west hartford": "06107",
    "meriden": "06450",
    "new london": "06320",
    "bristol": "06010",
    # New York
    "new york": "10001",
    "brooklyn": "11201",
    "bronx": "10451",
    "queens": "11354",
    # Other major cities
    "chicago": "60601",
    "los angeles": "90001",
    "houston": "77001",
    "philadelphia": "19103",
    "phoenix": "85001",
    "atlanta": "30303",
    "boston": "02101",
    "seattle": "98101",
    "denver": "80201",
    "miami": "33101",
}

_PHA_KEYWORDS = {"section 8", "public housing", "pha", "housing authority", "voucher program"}

_FAIR_CHANCE_LAWS: dict[str, dict[str, str]] = {
    "CA": {
        "summary": (
            "AB 1929 (2024): Landlords cannot ask about or consider criminal history before making "
            "a conditional offer. After the offer, they must conduct an individualized assessment "
            "weighing the nature of the offense, time elapsed, and evidence of rehabilitation."
        ),
        "scope": "Statewide",
        "resource": "https://www.courts.ca.gov/selfhelp-housing.htm",
    },
    "CT": {
        "summary": (
            "Conn. Gen. Stat. § 8-45a prohibits state-assisted housing programs from using certain "
            "convictions as an absolute bar. Landlords must conduct individualized assessments. "
            "Hartford and New Haven have additional local ordinances restricting criminal history "
            "inquiries until after a conditional offer."
        ),
        "scope": "State-assisted housing + Hartford and New Haven local ordinances",
        "resource": "https://www.cga.ct.gov/current/pub/chap_128.htm",
    },
    "DC": {
        "summary": (
            "DC Fair Criminal Record Screening for Housing Act: Landlords cannot ask about criminal "
            "history until after a conditional offer has been made. Individualized assessment required "
            "before rejection. Enforced by the DC Office of Human Rights."
        ),
        "scope": "Citywide (Washington DC)",
        "resource": "https://ohr.dc.gov/page/housing",
    },
    "IL": {
        "summary": (
            "Chicago Fair Chance Housing Ordinance (2021): Landlords cannot ask about criminal history "
            "during the initial application process. An individualized assessment is required before "
            "a rental denial based on criminal history."
        ),
        "scope": "Chicago only",
        "resource": "https://www.chicago.gov/city/en/depts/doh/supp_info/fair-chance-housing.html",
    },
    "MA": {
        "summary": (
            "CORI reform law requires landlords who use background checks to conduct individualized "
            "assessments. Seven-year look-back limit for most felony convictions; three years for "
            "misdemeanors. Sealed records cannot be used against applicants."
        ),
        "scope": "Statewide",
        "resource": "https://www.masslegalhelp.org/housing/tenants/ch1/cori",
    },
    "MN": {
        "summary": (
            "Minnesota Fair Chance in Housing Act (2023): Landlords cannot screen for arrest records, "
            "certain dismissed charges, or convictions older than three years for most offenses. "
            "Exceptions exist for federally restricted housing and certain violent offenses."
        ),
        "scope": "Statewide",
        "resource": "https://www.ag.state.mn.us/Office/Communications/2023/06/FairChance.asp",
    },
    "NJ": {
        "summary": (
            "Newark Fair Chance in Housing Ordinance bans criminal history inquiry until the "
            "conditional offer stage. The statewide Law Against Discrimination (LAD) also requires "
            "individualized assessment and prohibits blanket bans that have a disparate racial impact."
        ),
        "scope": "Newark ordinance + statewide LAD",
        "resource": "https://www.lsnj.org/LegalTopics/Housing",
    },
    "NY": {
        "summary": (
            "NYC Fair Chance Act (2015, expanded 2021): Landlords and rental brokers cannot ask about "
            "or consider criminal history until after a conditional offer. NYC Commission on Human Rights "
            "enforces. Requires individualized assessment using the Article 23-A factors."
        ),
        "scope": "New York City only (statewide Article 23-A applies to employment)",
        "resource": "https://www.nyc.gov/site/cchr/law/housing.page",
    },
    "OR": {
        "summary": (
            "Portland FAIR (Fair Access in Renting) Act: Criminal history screening is prohibited until "
            "after the landlord has accepted the application and verified income eligibility. "
            "Individualized assessment required; arrests without conviction cannot be used."
        ),
        "scope": "Portland only",
        "resource": "https://www.portland.gov/phb/rental-services/landlords/fair-access-renting",
    },
    "WA": {
        "summary": (
            "Seattle Fair Chance Housing Ordinance (2017): Landlords generally cannot inquire about or "
            "take adverse action based on criminal history, with narrow exceptions for recent sex offenses "
            "and drug offenses on the property. One of the strongest local ordinances in the country."
        ),
        "scope": "Seattle only",
        "resource": "https://www.seattle.gov/civilrights/civil-rights/housing/fair-chance-housing",
    },
}


def _extract_zip(location: str) -> str | None:
    """Extract a 5-digit ZIP from a location string, or look up by city name."""
    m = re.search(r"\b(\d{5})\b", location)
    if m:
        return m.group(1)
    normalized = location.lower()
    for city, zip_code in _CITY_ZIP_TABLE.items():
        if city in normalized:
            return zip_code
    return None


def _query_hud_counseling(zip_code: str, limit: int = 8) -> list[dict]:
    """Query HUD Housing Counseling API for agencies near a ZIP code."""
    url = f"https://data.hud.gov/Housing_Counselor/{zip_code}.json"
    try:
        resp = httpx.get(url, params={"limit": limit, "distance": 25}, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except (httpx.HTTPError, ValueError, KeyError):
        return []


def _query_211(location: str, keywords: str = "transitional housing reentry") -> list[dict]:
    """Query the national 211 API (data.211support.org) for housing services near a location."""
    if not API_211_KEY:
        return []
    try:
        resp = httpx.get(
            f"{_211_BASE}/search",
            params={"key": API_211_KEY, "search": keywords, "location": location, "distance": 25},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        # Response may be a list or {"ProgramAtSites": [...]} depending on endpoint
        if isinstance(data, list):
            return data
        return (
            data.get("ProgramAtSites")
            or data.get("Programs")
            or data.get("results")
            or []
        )
    except (httpx.HTTPError, ValueError, KeyError):
        return []


def _is_pha_program(name: str, extra: str = "") -> bool:
    text = (name + " " + extra).lower()
    return any(kw in text for kw in _PHA_KEYWORDS)


@tool
def search_housing(location: str, housing_type: str = "", offense_category: str = "") -> str:
    """Search for housing options near a location for people in re-entry.

    Args:
        location: City, state, or ZIP code (e.g. "Hartford, CT" or "06103")
        housing_type: Optional filter: transitional, shelter, voucher, or leave empty for all
        offense_category: User's offense category from their profile — used to filter ineligible programs
    """
    zip_code = _extract_zip(location)
    sex_offense = offense_category.lower() in ("sex_offense", "sex offense")
    drug_offense = offense_category.lower() in ("drug", "drug offense")

    lines: list[str] = []

    # --- Eligibility note ---
    if sex_offense:
        lines.append(
            "> **Note:** Federally-assisted housing programs (Section 8, PHAs) are excluded from "
            "results based on your offense category. Private market and transitional programs are shown.\n"
        )
    elif drug_offense:
        lines.append(
            "> **Note on drug convictions:** Federal law does not automatically bar you from PHAs, "
            "but individual Housing Authorities have discretion. Always ask about their specific policy.\n"
        )

    # --- HUD Housing Counseling API ---
    hud_agencies = _query_hud_counseling(zip_code) if zip_code else []

    if hud_agencies:
        lines.append(f"### HUD-Approved Housing Counseling Agencies near {location}\n")
        lines.append(
            "*These agencies specialize in housing navigation and can connect you to local "
            "reentry housing programs, emergency shelter, and rental assistance.*\n"
        )
        count = 0
        for agency in hud_agencies:
            name = agency.get("nme", agency.get("name", "Unknown Agency"))
            city = agency.get("city", "")
            state = agency.get("statecd", agency.get("state", ""))
            zipcd = agency.get("zipcd", agency.get("zip", ""))
            phone = agency.get("phone1", agency.get("phone", ""))
            distance = agency.get("distance", "")
            services = agency.get("services", "")
            website = agency.get("weburl", agency.get("website", ""))

            if sex_offense and _is_pha_program(name, str(services)):
                continue

            dist_str = f" ({distance} miles)" if distance else ""
            lines.append(f"**{name}**{dist_str}")
            addr = ", ".join(filter(None, [city, state, zipcd]))
            if addr:
                lines.append(f"   {addr}")
            if phone:
                lines.append(f"   Phone: {phone}")
            if website:
                lines.append(f"   Website: {website}")
            lines.append("")
            count += 1
            if count >= 6:
                break

        if count == 0:
            lines.append("*No matching agencies found after filtering. Try a nearby ZIP code.*\n")
    elif zip_code:
        lines.append(
            f"*Could not reach HUD housing counseling database for ZIP {zip_code}. "
            f"Visit [data.hud.gov](https://data.hud.gov) or call **211** for local options.*\n"
        )
    else:
        lines.append(
            f"*Could not identify a ZIP code for \"{location}\". "
            f"Try entering a 5-digit ZIP code for more accurate results.*\n"
        )

    # --- 211 National Data Platform ---
    search_terms = "transitional housing reentry"
    if housing_type:
        search_terms = f"{housing_type} housing reentry"
    results_211 = _query_211(zip_code or location, keywords=search_terms)
    if results_211:
        lines.append(f"\n### 211 Housing Programs near {location}\n")
        for svc in results_211[:5]:
            name = svc.get("name", svc.get("AgencyName", "Unknown Program"))
            description = svc.get("description", svc.get("Description", ""))
            phone = svc.get("phone", svc.get("Phone", ""))
            email = svc.get("email", svc.get("Email", ""))
            url = svc.get("url", svc.get("Website", ""))
            address = svc.get("address", svc.get("Address", ""))
            if sex_offense and _is_pha_program(name, description):
                continue
            lines.append(f"**{name}**")
            if description:
                lines.append(f"   {description[:200].rstrip()}")
            if address:
                lines.append(f"   Address: {address}")
            if phone:
                lines.append(f"   Phone: {phone}")
            if email:
                lines.append(f"   Email: {email}")
            if url:
                lines.append(f"   Website: {url}")
            lines.append("")

    lines.append("---")
    lines.append(
        "*Call **211** or visit [211.org](https://www.211.org) for a full list of local housing "
        "resources. Use `get_fair_chance_housing_laws()` to check renter protections in your state.*"
    )
    return "\n".join(lines)


@tool
def get_fair_market_rents(state: str, county: str = "") -> str:
    """Look up HUD Fair Market Rents for a state or county — useful for budgeting and voucher holders.

    Args:
        state: Two-letter state abbreviation (e.g. "CT", "NY")
        county: Optional county name to filter results (e.g. "Hartford County")
    """
    if not HUD_API_KEY:
        return (
            "**Fair Market Rents lookup requires a HUD API key.**\n\n"
            "To enable this tool:\n"
            "1. Register at https://www.huduser.gov/hudapi/public/register\n"
            "2. Generate a token and add `HUD_API_KEY=<your_token>` to your `.env`\n\n"
            "You can also browse FMRs directly: "
            "https://www.huduser.gov/portal/datasets/fmr.html"
        )

    state_upper = state.upper().strip()
    url = f"https://www.huduser.gov/hudapi/public/fmr/statedata/{state_upper}"
    try:
        resp = httpx.get(
            url,
            headers={"Authorization": f"Bearer {HUD_API_KEY}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError as e:
        return (
            f"*Could not retrieve Fair Market Rents (HUD API error: {e}). "
            f"Try visiting https://www.huduser.gov/portal/datasets/fmr.html*"
        )
    except ValueError:
        return "*Could not parse Fair Market Rents response from HUD.*"

    items: list[dict] = []
    if isinstance(data, dict):
        inner = data.get("data", data)
        if isinstance(inner, dict):
            items = inner.get("counties", inner.get("metroareas", []))
        elif isinstance(inner, list):
            items = inner

    if not items:
        return f"*No Fair Market Rents data found for {state_upper}.*"

    if county:
        county_lower = county.lower()
        filtered = [
            i for i in items
            if county_lower in str(i.get("county_name", "")).lower()
            or county_lower in str(i.get("areaname", "")).lower()
        ]
        if filtered:
            items = filtered

    lines = [f"### HUD Fair Market Rents — {state_upper}"]
    if county:
        lines[0] += f" ({county})"
    lines.append("")

    for item in items[:15]:
        area = item.get("county_name") or item.get("areaname") or item.get("metro_name", "Unknown")
        year = item.get("year", "")
        eff = item.get("Efficiency") or item.get("efficiency", "—")
        br1 = item.get("One_Bedroom") or item.get("one_bedroom", "—")
        br2 = item.get("Two_Bedroom") or item.get("two_bedroom", "—")
        br3 = item.get("Three_Bedroom") or item.get("three_bedroom", "—")
        lines.append(f"**{area}** (FY{year})")
        lines.append(f"  Studio: ${eff} | 1BR: ${br1} | 2BR: ${br2} | 3BR: ${br3}")
        lines.append("")

    lines.append(
        "*Fair Market Rents are HUD's estimate of the 40th percentile gross rents for standard units. "
        "Housing Choice Vouchers (Section 8) typically cover rents up to the FMR for the area.*"
    )
    return "\n".join(lines)


@tool
def get_fair_chance_housing_laws(state: str) -> str:
    """Look up fair chance housing laws and renter protections for people with criminal records.

    Args:
        state: Two-letter state abbreviation (e.g. "CT", "NY", "CA")
    """
    state_upper = state.upper().strip()
    info = _FAIR_CHANCE_LAWS.get(state_upper)

    if info:
        lines = [
            f"### Fair Chance Housing — {state_upper}\n",
            f"**Scope:** {info['scope']}\n",
            f"{info['summary']}\n",
            f"**Resource:** {info['resource']}\n",
        ]
    else:
        lines = [
            f"### Fair Chance Housing — {state_upper}\n",
            f"*No specific statewide fair chance housing law is on record for {state_upper}.*\n",
            "The following federal protections apply in every state:\n",
            "- HUD guidance (2016): blanket criminal history bans in rental housing may violate "
            "the Fair Housing Act if they have a disparate racial impact.\n",
            "- HUD federally-assisted housing only bars **lifetime sex offender registrants** "
            "and people convicted of **methamphetamine production** on federal premises.\n",
            "- Local ordinances (city or county) may provide additional protections.\n",
            "\nCheck with your local legal aid office: https://www.lawhelp.org\n",
        ]

    lines.append("---")
    lines.append(
        "*This is general information, not legal advice. "
        "Laws change — verify current protections with a housing attorney or legal aid organization.*"
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
