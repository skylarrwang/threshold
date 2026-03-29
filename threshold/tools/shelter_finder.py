"""Emergency shelter and recovery housing finder.

Uses free APIs:
- SAMHSA Treatment Locator (no key required) — recovery/sober living housing
- HUD Emergency Shelter / CoC data via data.hud.gov (no key required)
"""

from __future__ import annotations

import re

import httpx
from langchain_core.tools import tool

# Reuse the city→ZIP table from housing_search
from .housing_search import _CITY_ZIP_TABLE


def _extract_zip(location: str) -> str | None:
    m = re.search(r"\b(\d{5})\b", location)
    if m:
        return m.group(1)
    normalized = location.lower()
    for city, zip_code in _CITY_ZIP_TABLE.items():
        if city in normalized:
            return zip_code
    return None


def _extract_state(location: str) -> str | None:
    """Try to pull a 2-letter state code from a location string."""
    m = re.search(r"\b([A-Z]{2})\b", location)
    if m:
        return m.group(1)
    # Common state names
    state_map = {
        "connecticut": "CT", "new york": "NY", "california": "CA",
        "massachusetts": "MA", "illinois": "IL", "texas": "TX",
        "florida": "FL", "ohio": "OH", "pennsylvania": "PA",
        "new jersey": "NJ", "georgia": "GA", "michigan": "MI",
        "washington": "WA", "oregon": "OR", "colorado": "CO",
        "minnesota": "MN", "maryland": "MD", "virginia": "VA",
    }
    lower = location.lower()
    for name, code in state_map.items():
        if name in lower:
            return code
    return None


def _query_samhsa(zip_code: str, limit: int = 8) -> list[dict]:
    """Query SAMHSA treatment locator for recovery housing near a ZIP.

    SAMHSA's locator API is free and requires no key.
    We filter for facilities offering housing services.
    """
    url = "https://findtreatment.samhsa.gov/locator/listing"
    try:
        resp = httpx.get(
            url,
            params={
                "sZip": zip_code,
                "sDistance": "25",
                "sType": "SA",  # Substance abuse facilities
                "sHousing": "1",  # Must offer housing
                "pageSize": str(limit),
                "page": "1",
                "sort": "distance",
            },
            headers={"Accept": "application/json"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("rows", data.get("results", []))
    except (httpx.HTTPError, ValueError, KeyError):
        return []


def _query_hud_shelters(state: str) -> list[dict]:
    """Query HUD Continuum of Care shelter inventory for a state.

    Uses the public HUD CKAN dataset API (no key required).
    Returns emergency shelters and transitional housing from the
    HUD Housing Inventory Count (HIC).
    """
    # HUD's public datasets on data.hud.gov
    url = "https://data.hud.gov/Housing_Counselor/searchByState"
    try:
        resp = httpx.get(
            url,
            params={"State": state},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list):
            return data
        return []
    except (httpx.HTTPError, ValueError, KeyError):
        return []


@tool
def find_emergency_shelter(location: str) -> str:
    """Find emergency shelters, transitional housing, and recovery housing near a location.

    This searches multiple databases to find immediate housing options.
    Results include shelters, transitional programs, and sober living facilities.

    Args:
        location: City and state, or ZIP code (e.g. "Hartford, CT" or "06103")
    """
    zip_code = _extract_zip(location)
    state = _extract_state(location)
    lines: list[str] = []

    lines.append(f"## Emergency & Transitional Housing near {location}\n")

    # --- Immediate action items ---
    lines.append("### Immediate Steps")
    lines.append("1. **Call 211** (dial 2-1-1) — they have real-time shelter bed availability")
    lines.append("2. **Call the CT Coordinated Access Network (CAN):** 1-888-774-2900 (if in CT)")
    lines.append("3. **Text HOME to 741741** if you're in crisis\n")

    # --- SAMHSA recovery housing ---
    samhsa_results = _query_samhsa(zip_code) if zip_code else []
    if samhsa_results:
        lines.append("### Recovery & Sober Living Housing\n")
        lines.append("*These facilities offer housing as part of recovery programs. "
                      "Many accept people with criminal records.*\n")
        count = 0
        for facility in samhsa_results:
            name = (facility.get("name2")
                    or facility.get("name1")
                    or facility.get("facilityName", "Unknown Facility"))
            city = facility.get("city", "")
            st = facility.get("state", "")
            phone = facility.get("phone", "")
            website = facility.get("website", "")
            distance = facility.get("distance", "")
            intake = facility.get("intake1", facility.get("intake", ""))
            services = []
            if facility.get("detox"):
                services.append("Detox")
            if facility.get("transitionalHousing") or facility.get("sHousing"):
                services.append("Transitional Housing")
            if facility.get("residentialTreatment"):
                services.append("Residential Treatment")

            dist_str = f" ({distance} mi)" if distance else ""
            lines.append(f"**{name}**{dist_str}")
            if city or st:
                lines.append(f"   {', '.join(filter(None, [city, st]))}")
            if phone:
                lines.append(f"   Phone: {phone}")
            if intake and intake != phone:
                lines.append(f"   Intake Line: {intake}")
            if website:
                lines.append(f"   Website: {website}")
            if services:
                lines.append(f"   Services: {', '.join(services)}")
            lines.append("")
            count += 1
            if count >= 6:
                break
    else:
        lines.append("### Recovery Housing\n")
        lines.append("*Could not reach SAMHSA locator. Search directly at: "
                      "https://findtreatment.gov*\n")

    # --- HUD counseling agencies that do shelter referrals ---
    if zip_code:
        from .housing_search import _query_hud_counseling
        hud = _query_hud_counseling(zip_code, limit=5)
        shelter_agencies = [a for a in hud if any(
            kw in str(a.get("services", "")).lower()
            for kw in ("homeless", "shelter", "emergency", "transitional")
        )]
        if shelter_agencies:
            lines.append("### Housing Counseling Agencies (Shelter Referrals)\n")
            for agency in shelter_agencies[:4]:
                name = agency.get("nme", agency.get("name", "Unknown"))
                phone = agency.get("phone1", agency.get("phone", ""))
                lines.append(f"**{name}**")
                if phone:
                    lines.append(f"   Phone: {phone}")
                lines.append("")

    # --- CT-specific resources ---
    if state and state.upper() == "CT":
        lines.append("### Connecticut-Specific Resources\n")
        lines.append("**CT Reentry Collaborative** — 860-560-5600")
        lines.append("   Coordinates transitional housing for people leaving incarceration\n")
        lines.append("**Community Partners in Action (CPA)** — 860-566-2030")
        lines.append("   Transitional housing, case management, employment support")
        lines.append("   Website: https://www.cpaonline.org\n")
        lines.append("**Columbus House** — 203-401-4400 (New Haven)")
        lines.append("   Emergency shelter + rapid rehousing programs\n")
        lines.append("**Mercy Housing & Shelter** — 860-808-2100 (Hartford)")
        lines.append("   Emergency shelter beds + transitional housing\n")
        lines.append("**Open Hearth** — 860-525-3447 (Hartford)")
        lines.append("   Men's shelter + transitional housing for reentry\n")

    lines.append("---")
    lines.append("*Shelter availability changes daily. Call 211 or visit [211ct.org](https://211ct.org) "
                  "for real-time bed counts. Many programs have waitlists — apply to multiple.*")
    return "\n".join(lines)
