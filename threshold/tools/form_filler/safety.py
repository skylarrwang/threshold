from __future__ import annotations

from fnmatch import fnmatch
from urllib.parse import urlparse

from ...memory.profile import UserProfile

ALLOWED_URL_PATTERNS: list[str] = [
    "*.gov",
    "*.gov/*",
    "*.benefits.gov/*",
    "*.healthcare.gov/*",
    "*.ssa.gov/*",
    "*.211.org/*",
]

REDACTED_FIELDS = frozenset({
    "offense_category",
    "time_served",
    "supervision_type",
    "supervision_end_date",
    "concerns",
})


def is_url_allowed(url: str) -> bool:
    """Check if a URL is on the allowlist of trusted domains."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
        full = f"{hostname}{parsed.path}"
    except Exception:
        return False

    for pattern in ALLOWED_URL_PATTERNS:
        if fnmatch(hostname, pattern) or fnmatch(full, pattern):
            return True
    return False


def filter_profile_for_form(profile: UserProfile) -> dict[str, str]:
    """Extract only safe, non-sensitive fields from the user profile."""
    safe: dict[str, str] = {}

    p = profile.personal
    if p.name:
        safe["name"] = p.name
    if p.first_name:
        safe["first_name"] = p.first_name
    if p.last_name:
        safe["last_name"] = p.last_name
    if p.date_of_birth:
        safe["date_of_birth"] = p.date_of_birth
    if p.address:
        safe["address"] = p.address
    if p.city:
        safe["city"] = p.city
    if p.zip_code:
        safe["zip_code"] = p.zip_code
    if p.height:
        safe["height"] = p.height
    if p.eye_color:
        safe["eye_color"] = p.eye_color
    if p.gender:
        safe["gender"] = p.gender
    if p.phone:
        safe["phone"] = p.phone
    if p.email:
        safe["email"] = p.email
    if p.home_state:
        safe["state"] = p.home_state
    if p.age_range:
        safe["age_range"] = p.age_range

    s = profile.situation
    if s.housing_status and s.housing_status != "unknown":
        safe["housing_status"] = s.housing_status
    if s.employment_status:
        safe["employment_status"] = s.employment_status

    g = profile.goals
    if g.strengths:
        safe["strengths"] = ", ".join(g.strengths)

    sup = profile.support
    if sup.case_worker_name:
        safe["case_worker"] = sup.case_worker_name

    return safe
