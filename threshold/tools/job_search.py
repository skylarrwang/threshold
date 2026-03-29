from __future__ import annotations

import json
import os
import re
from datetime import datetime
from html import unescape
from pathlib import Path
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from langchain_core.tools import tool

from ..memory.profile import load_profile

load_dotenv()

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
APPLICATIONS_LOG = DATA_DIR / "tracking" / "job_applications.json"

ADZUNA_SEARCH_URL = "https://api.adzuna.com/v1/api/jobs/us/search/1"

# Stop words when deriving shorter retry queries (avoid over-narrow AND semantics).
_QUERY_STOP_WORDS = frozenset(
    {
        "a",
        "an",
        "and",
        "at",
        "for",
        "in",
        "near",
        "of",
        "or",
        "the",
        "to",
        "with",
    }
)


def _derive_narrower_queries(query: str) -> list[str]:
    """Return broader/shorter keyword strings to retry when the full query returns nothing."""
    raw = (query or "").strip()
    if not raw:
        return []
    words = [w for w in re.split(r"\s+", raw) if w]
    sig = [w for w in words if w.lower() not in _QUERY_STOP_WORDS and len(w) > 1]
    if not sig:
        sig = words
    out: list[str] = []
    seen: set[str] = {raw.lower()}
    for n in (4, 3, 2, 1):
        if len(sig) >= n:
            s = " ".join(sig[:n])
            key = s.lower()
            if key not in seen:
                out.append(s)
                seen.add(key)
    return out


def _location_fallback(where: str) -> str | None:
    """If `where` looks like City, ST, return two-letter state for a wider search."""
    w = (where or "").strip()
    if not w or "," not in w:
        return None
    st = _infer_state_code(w)
    if not st:
        return None
    if w.upper().replace(" ", "") == st.upper():
        return None
    return st


def _fetch_adzuna_results(
    *,
    what: str,
    where: str,
    app_id: str,
    app_key: str,
) -> list[dict]:
    params: dict[str, str | int] = {
        "app_id": app_id,
        "app_key": app_key,
        "what": what,
        "results_per_page": 10,
        "content-type": "application/json",
    }
    if where:
        params["where"] = where
    resp = httpx.get(ADZUNA_SEARCH_URL, params=params, timeout=30.0)
    resp.raise_for_status()
    payload = resp.json()
    raw_results = payload.get("results") if isinstance(payload, dict) else None
    if not isinstance(raw_results, list):
        return []
    return [j for j in raw_results if isinstance(j, dict)]

FAIR_CHANCE_EMPLOYERS = frozenset(
    {
        "amazon",
        "walmart",
        "target",
        "home depot",
        "fedex",
        "ups",
        "mcdonald's",
        "mcdonalds",
        "chipotle",
        "dave's killer bread",
        "greyston",
        "goodwill",
        "volunteers of america",
        "coca-cola",
        "jpmorgan",
        "jp morgan",
        "bank of america",
        "johns hopkins",
        "werner",
        "schneider",
        "swift transportation",
        "tyson foods",
        "koch industries",
        "wayfair",
        "cintas",
        "aramark",
        "compass group",
        "meijer",
        "bed bath beyond",
        "american airlines",
        "google",
        "facebook",
        "meta",
        "gap",
        "pizza hut",
        "cvs",
        "walgreens",
    }
)


def _norm_employer_text(s: str) -> str:
    s = (s or "").lower()
    for ch in "'’.,&()/-":
        s = s.replace(ch, " ")
    return " ".join(s.split())


def _company_is_fair_chance(company_display_name: str) -> bool:
    nc = _norm_employer_text(company_display_name)
    if not nc:
        return False
    for fc in FAIR_CHANCE_EMPLOYERS:
        fcn = _norm_employer_text(fc)
        if not fcn:
            continue
        if fcn == nc:
            return True
        if f" {fcn} " in f" {nc} ":
            return True
        if nc.startswith(fcn + " ") or nc.endswith(" " + fcn):
            return True
    return False


def _infer_state_code(home_state: str) -> str | None:
    """Best-effort two-letter state from profile `personal.home_state`."""
    s = (home_state or "").strip()
    if not s:
        return None
    up = s.upper()
    if len(up) == 2 and up.isalpha():
        return up
    if "," in up:
        tail = up.split(",")[-1].strip()
        if len(tail) == 2 and tail.isalpha():
            return tail
    return None


def _strip_html_snippet(raw: str, limit: int = 200) -> str:
    text = unescape(re.sub(r"<[^>]+>", " ", raw or ""))
    text = " ".join(text.split())
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "…"


def _format_salary_range(job: dict) -> str:
    lo = job.get("salary_min")
    hi = job.get("salary_max")
    if lo is None and hi is None:
        return "Not listed"
    if lo is not None and hi is not None and lo == hi:
        return f"${lo:,.0f}"
    if lo is not None and hi is not None:
        return f"${lo:,.0f} – ${hi:,.0f}"
    if lo is not None:
        return f"From ${lo:,.0f}"
    return f"Up to ${hi:,.0f}"


def _company_display_name(job: dict) -> str:
    co = job.get("company")
    if isinstance(co, dict):
        return str(co.get("display_name") or "").strip()
    if co is None:
        return ""
    return str(co).strip()


def _location_display(job: dict) -> str:
    loc = job.get("location")
    if isinstance(loc, dict):
        return str(loc.get("display_name") or "").strip()
    if loc is None:
        return ""
    return str(loc).strip()


def _apply_url(job: dict) -> str:
    return str(job.get("redirect_url") or "").strip()


def _score_job(job: dict, *, user_state: str | None, ban_the_box_states: frozenset[str]) -> int:
    score = 0
    if _company_is_fair_chance(_company_display_name(job)):
        score += 50
    if user_state and user_state in ban_the_box_states:
        score += 12
    sal_min = job.get("salary_min")
    if sal_min is not None and isinstance(sal_min, (int, float)) and sal_min > 0:
        score += 10
    if job.get("contract_time") == "full_time":
        score += 8
    if job.get("contract_type") == "permanent":
        score += 5
    return score


@tool
def search_jobs(query: str, location: str = "") -> str:
    """Search for jobs relevant to the user's skills and situation.
    Results are ranked with extra weight for known fair-chance employers and
    helpful job attributes (salary listed, full-time, permanent).

    Args:
        query: Job search keywords (e.g. "warehouse", "food service", "construction")
        location: City/state to search in (e.g. "New York, NY"). If omitted, uses
            the profile's home state/location when available.
    """
    ban_the_box_states = frozenset(
        {
            "CA",
            "CO",
            "CT",
            "DC",
            "HI",
            "IL",
            "MA",
            "MD",
            "MN",
            "NJ",
            "NM",
            "NY",
            "OR",
            "RI",
            "VT",
            "WA",
        }
    )

    profile = load_profile()
    where = (location or "").strip()
    if not where and profile is not None:
        where = (profile.personal.home_state or "").strip()

    user_state = None
    if profile is not None:
        user_state = _infer_state_code(profile.personal.home_state)
    if user_state is None and where:
        user_state = _infer_state_code(where)

    app_id = os.getenv("ADZUNA_APP_ID", "").strip()
    app_key = os.getenv("ADZUNA_APP_KEY", "").strip()
    if not app_id or not app_key:
        return (
            "**Job search unavailable.**\n\n"
            "Adzuna API credentials are not configured. Add `ADZUNA_APP_ID` and "
            "`ADZUNA_APP_KEY` to your environment (e.g. `.env`), then try again."
        )

    # Build ordered retry attempts: original query, then shorter keyword sets, then state-only location.
    narrow = _derive_narrower_queries(query)
    attempt_specs: list[tuple[str, str]] = [(query, where)]
    for q in narrow:
        if q.lower() != query.strip().lower():
            attempt_specs.append((q, where))
    state_only = _location_fallback(where)
    if state_only:
        for q in (query, *narrow):
            attempt_specs.append((q, state_only))

    seen_attempt: set[tuple[str, str]] = set()
    ordered: list[tuple[str, str]] = []
    for what, loc in attempt_specs:
        key = (what.strip().lower(), loc.strip().lower() if loc else "")
        if key in seen_attempt:
            continue
        seen_attempt.add(key)
        ordered.append((what, loc))

    raw_results: list[dict] = []
    used_what = query
    used_where = where
    attempts_tried: list[str] = []

    try:
        for what, loc in ordered:
            attempts_tried.append(f"*\"{what}\"*{f' near *{loc}*' if loc else ''}")
            raw_results = _fetch_adzuna_results(
                what=what,
                where=loc,
                app_id=app_id,
                app_key=app_key,
            )
            if raw_results:
                used_what = what
                used_where = loc
                break
    except httpx.HTTPStatusError as e:
        return (
            "**Job search failed** (API error).\n\n"
            f"HTTP {e.response.status_code}. Please try again later or adjust your search terms."
        )
    except (httpx.RequestError, json.JSONDecodeError, ValueError) as e:
        return f"**Job search failed.**\n\n{type(e).__name__}: {e}"

    if not raw_results:
        tried_block = "\n".join(f"- {t}" for t in attempts_tried[:12])
        if len(attempts_tried) > 12:
            tried_block += f"\n- …and {len(attempts_tried) - 12} more variant(s)"
        return (
            "**No job listings** after automatic retries with simpler keywords and (if applicable) "
            "state-wide location.\n\n"
            "**Attempts tried:**\n"
            f"{tried_block}\n\n"
            "**What you should do next:** Call **search_jobs** again with a **shorter** query "
            "(1–2 concrete terms, e.g. `warehouse`, `forklift`, `stock clerk`) and/or a **different** "
            "`location` (another city or pass `\"\"` to use profile state only). Do not invent listings."
        )

    broadened_note = ""
    if used_what.strip().lower() != query.strip().lower() or (
        where and used_where.strip().lower() != where.strip().lower()
    ):
        loc_orig = f" near *{where}*" if where else ""
        loc_used = f" near *{used_where}*" if used_where else ""
        broadened_note = (
            f"*Search was broadened automatically.* You asked for *{query}*{loc_orig}; "
            f"these results use *{used_what}*{loc_used}."
        )

    scored: list[tuple[int, dict]] = []
    for job in raw_results:
        if not isinstance(job, dict):
            continue
        pts = _score_job(job, user_state=user_state, ban_the_box_states=ban_the_box_states)
        scored.append((pts, job))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:10]

    lines: list[str] = []
    if broadened_note:
        lines.append(broadened_note)
        lines.append("")

    if user_state and user_state in ban_the_box_states:
        lines.append(
            f"**Ban-the-box:** **{user_state}** restricts when many private employers may ask "
            "about criminal history on initial applications (details vary by state law and "
            "employer size). Confirm current rules with official sources.\n"
        )

    loc_label = used_where if used_where else "your area"
    lines.append(
        f"**Job search results for** *{used_what}* **near** *{loc_label}* "
        f"(top {len(top)} by relevance score):\n"
    )

    for i, (_, job) in enumerate(top, 1):
        title = str(job.get("title") or "Untitled role").strip()
        company = _company_display_name(job)
        loc = _location_display(job) or "Location not listed"
        salary = _format_salary_range(job)
        desc = _strip_html_snippet(str(job.get("description") or ""))
        url = _apply_url(job)
        fc_badge = " ✓ **Fair-Chance**" if _company_is_fair_chance(company) else ""

        lines.append(f"**{i}. {title}** at {company or 'Company not listed'}{fc_badge}")
        lines.append(f"   - **Location:** {loc}")
        lines.append(f"   - **Pay:** {salary}")
        lines.append(f"   - **Description:** {desc}")
        if url:
            lines.append(f"   - **Apply:** {url}")
        else:
            lines.append("   - **Apply:** (no link in listing)")
        lines.append("")

    lines.append(
        "*Fair-Chance badge* = employer name matched a curated fair-chance list; verify "
        "current hiring policies with the employer. Listing data comes from Adzuna."
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
def log_employment_event(event_type: str, content: str, tags: list[str]) -> str:
    """Log a non-application employment milestone to the observation stream (agent=employment).

    Use for drafted resumes/cover letters, completed job searches, interview prep, etc.
    For submitted applications and status changes, prefer log_job_application().

    Args:
        event_type: One of: user_message, tool_result, milestone, check_in, reflection
        content: Plain text description of what happened
        tags: Topic tags e.g. ["job_search", "cover_letter", "resume"]
    """
    from ..memory.observation_stream import log_observation

    log_observation(
        agent="employment",
        event_type=event_type,
        content=content,
        tags=tags,
    )
    return "Logged."
