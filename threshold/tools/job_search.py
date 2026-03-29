from __future__ import annotations

import os
import re
from datetime import datetime, timedelta
from html import unescape

import httpx
from dotenv import load_dotenv
from langchain_core.tools import tool

from ..db.database import get_db
from ..db.profile_bridge import load_profile_from_db

load_dotenv()

DEFAULT_USER_ID = os.getenv("THRESHOLD_USER_ID", "default-user")

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
        # Retail & Grocery
        "amazon",
        "walmart",
        "target",
        "home depot",
        "lowe's",
        "lowes",
        "costco",
        "kroger",
        "meijer",
        "aldi",
        "whole foods",
        "cvs",
        "walgreens",
        "dollar general",
        "dollar tree",
        "gap",
        "old navy",
        "best buy",
        # Food Service & Hospitality
        "mcdonald's",
        "mcdonalds",
        "chipotle",
        "starbucks",
        "pizza hut",
        "taco bell",
        "wendy's",
        "wendys",
        "dunkin",
        "dunkin donuts",
        "panera",
        "panera bread",
        "subway",
        "hilton",
        "marriott",
        "hyatt",
        # Logistics & Transportation
        "fedex",
        "ups",
        "werner",
        "schneider",
        "swift transportation",
        "jb hunt",
        "j.b. hunt",
        "xpo logistics",
        "american airlines",
        "delta",
        "delta airlines",
        "united airlines",
        "uber",
        "lyft",
        "doordash",
        "instacart",
        # Technology
        "google",
        "facebook",
        "meta",
        "microsoft",
        "ibm",
        "slack",
        "salesforce",
        "linkedin",
        "dropbox",
        "pinterest",
        "square",
        "block",
        "intuit",
        # Banking & Finance
        "jpmorgan",
        "jp morgan",
        "chase",
        "bank of america",
        "citi",
        "citibank",
        "wells fargo",
        "american express",
        # Healthcare & Services
        "johns hopkins",
        "kaiser permanente",
        "hca healthcare",
        "goodwill",
        "volunteers of america",
        "salvation army",
        # Manufacturing & Food Production
        "tyson foods",
        "koch industries",
        "dave's killer bread",
        "greyston",
        "greyston bakery",
        "coca-cola",
        "pepsi",
        "pepsico",
        "general mills",
        # Other Major Employers
        "cintas",
        "aramark",
        "compass group",
        "sodexo",
        "wayfair",
        "kohl's",
        "kohls",
        "nordstrom",
        "tj maxx",
        "tjx",
        "ross",
        "burlington",
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


# ---------------------------------------------------------------------------
# Job application pipeline stages
# ---------------------------------------------------------------------------

_PIPELINE_STAGES = [
    "interested",           # Found the job, considering applying
    "preparing",            # Working on resume/cover letter for this role
    "applied",              # Application submitted
    "screening",            # Phone screen or initial recruiter contact
    "interview_scheduled",  # Interview date set
    "interviewed",          # Completed interview(s)
    "follow_up",            # Sent thank you / waiting for response
    "offer_received",       # Got an offer
    "negotiating",          # Negotiating terms
    "accepted",             # Accepted the offer
    "started",              # First day of work
    "rejected",             # Application rejected
    "withdrawn",            # User withdrew application
]

_STAGE_LABELS = {
    "interested": "Interested",
    "preparing": "Preparing Application",
    "applied": "Applied",
    "screening": "Phone Screen",
    "interview_scheduled": "Interview Scheduled",
    "interviewed": "Interviewed",
    "follow_up": "Following Up",
    "offer_received": "Offer Received",
    "negotiating": "Negotiating",
    "accepted": "Accepted",
    "started": "Started Work",
    "rejected": "Rejected",
    "withdrawn": "Withdrawn",
}

_NEXT_ACTIONS: dict[str, str] = {
    "interested": (
        "Review the job posting carefully. Check if they're a fair-chance employer. "
        "Prepare your resume and cover letter for this specific role."
    ),
    "preparing": (
        "Tailor your resume to match keywords in the job posting. Write a cover letter "
        "that addresses the gap honestly if they ask. Use the cover_letter workflow."
    ),
    "applied": (
        "Mark your calendar to follow up in 5-7 business days if you haven't heard back. "
        "Keep applying to other positions — never wait on just one application."
    ),
    "screening": (
        "Prepare your 'elevator pitch' — 30 seconds on who you are and why this role. "
        "Have your work history dates ready. Practice answering 'Tell me about yourself.'"
    ),
    "interview_scheduled": (
        "Research the company. Prepare 3-5 questions to ask them. Plan your route and "
        "arrive 10-15 minutes early. Bring copies of your resume."
    ),
    "interviewed": (
        "Send a thank-you email within 24 hours. Mention something specific from the "
        "conversation. If you haven't heard back in a week, one polite follow-up is OK."
    ),
    "follow_up": (
        "Wait at least a week between follow-ups. If no response after 2-3 attempts, "
        "the position may be filled. Keep applying elsewhere."
    ),
    "offer_received": (
        "Review the offer carefully: salary, benefits, start date, background check timing. "
        "Ask for the offer in writing. You can negotiate — most employers expect it."
    ),
    "negotiating": (
        "Be professional and specific about what you're asking for. Research market rates. "
        "Consider the whole package: PTO, health insurance, schedule flexibility."
    ),
    "accepted": (
        "Get the start date confirmed in writing. Ask about onboarding paperwork, dress code, "
        "and first-day logistics. Update your parole/probation officer if required."
    ),
    "started": (
        "Congratulations! Focus on learning and being reliable. Update your profile with "
        "your new employment status. This is a huge milestone."
    ),
    "rejected": (
        "It happens — don't take it personally. Ask for feedback if appropriate. "
        "Apply to more positions. Every application is practice."
    ),
    "withdrawn": (
        "No problem. Focus on the opportunities that are a better fit. "
        "Keep the company in mind for future openings."
    ),
}

# Terminal statuses — these are "done" and don't need follow-ups
_TERMINAL_STATUSES = {"accepted", "started", "rejected", "withdrawn"}


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

    db = get_db()
    try:
        profile = load_profile_from_db(db)
    finally:
        db.close()
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
def log_job_application(
    company: str,
    position: str,
    status: str,
    notes: str = "",
    apply_url: str = "",
    follow_up_date: str = "",
    deadline: str = "",
    contact_name: str = "",
    contact_email: str = "",
    contact_phone: str = "",
    interview_date: str = "",
    interview_time: str = "",
    interview_location: str = "",
    interview_type: str = "",
    salary_offered: str = "",
    rejection_reason: str = "",
    source: str = "",
    fair_chance_employer: bool | None = None,
) -> str:
    """Log or update a job application in the pipeline tracker.

    If an application for the same company + position already exists, updates it
    instead of creating a duplicate. Always call get_job_application_status() first
    to see what's already tracked before logging.

    Args:
        company: Company name (use exact name from pipeline if updating)
        position: Job title applied for
        status: One of: interested, preparing, applied, screening, interview_scheduled,
            interviewed, follow_up, offer_received, negotiating, accepted, started,
            rejected, withdrawn
        notes: Any additional notes (what happened, next steps, etc.)
        apply_url: Direct link to the job posting or application portal
        follow_up_date: When to follow up (YYYY-MM-DD format)
        deadline: Application deadline if known (YYYY-MM-DD format)
        contact_name: Name of recruiter or hiring manager
        contact_email: Email for follow-up
        contact_phone: Phone number for follow-up
        interview_date: Interview date (YYYY-MM-DD format)
        interview_time: Interview time (e.g. "10:00 AM")
        interview_location: Interview address, "phone", "video", or specific platform
        interview_type: Type of interview: phone, video, in_person, panel
        salary_offered: Salary or pay rate if known
        rejection_reason: Reason given for rejection (useful for learning)
        source: Where you found this job: adzuna, indeed, referral, company_website, etc.
        fair_chance_employer: Whether this is a known fair-chance employer
    """
    from ..db.crud import upsert_job_application
    from ..db.database import get_db

    db = get_db()
    try:
        result_dict = upsert_job_application(
            db, DEFAULT_USER_ID, company, position, status,
            notes=notes, apply_url=apply_url, follow_up_date=follow_up_date,
            deadline=deadline, contact_name=contact_name, contact_email=contact_email,
            contact_phone=contact_phone, interview_date=interview_date,
            interview_time=interview_time, interview_location=interview_location,
            interview_type=interview_type, salary_offered=salary_offered,
            rejection_reason=rejection_reason, source=source,
            fair_chance_employer=fair_chance_employer,
        )
    finally:
        db.close()

    history = result_dict.get("history", [])
    action = "updated" if history else "created"

    from ..memory.observation_stream import log_observation

    log_observation(
        agent="employment",
        event_type="milestone",
        content=f"Job application: {position} at {company} — {status} ({action})",
        tags=["job_search", "application"],
    )

    next_action = _NEXT_ACTIONS.get(status, "")
    label = _STAGE_LABELS.get(status, status)
    result = f"**{position}** at **{company}** — {label} ({action})"
    if action == "updated" and history:
        result += f"\n*Updated existing entry (was: {history[-1].get('from_status', '')})*"
    if next_action:
        result += f"\n**Next step:** {next_action}"
    if follow_up_date:
        result += f"\n**Follow up by:** {follow_up_date}"
    if deadline:
        result += f"\n**Deadline:** {deadline}"
    if interview_date:
        interview_str = f"\n**Interview:** {interview_date}"
        if interview_time:
            interview_str += f" at {interview_time}"
        if interview_location:
            interview_str += f" — {interview_location}"
        result += interview_str
    if apply_url:
        result += f"\n**Apply:** {apply_url}"
    return result


@tool
def get_job_application_status() -> str:
    """Show the status of all job applications in the pipeline.

    Returns a summary of every job the user has tracked, organized by
    pipeline stage, with next actions for each.
    """
    from ..db.crud import get_job_applications
    from ..db.database import get_db

    db = get_db()
    try:
        apps = get_job_applications(db, DEFAULT_USER_ID)
    finally:
        db.close()

    if not apps:
        return (
            "**No job applications tracked yet.**\n\n"
            "Start your job search:\n"
            "1. Use `search_jobs()` to find openings\n"
            "2. When you find one you like, use `log_job_application(company, position, 'interested')`\n"
            "3. As you progress, update the status: preparing → applied → screening → interviewed → etc.\n\n"
            "*Tip: Apply to multiple jobs in parallel. Don't wait on one application.*"
        )

    # Group by stage
    by_stage: dict[str, list[dict]] = {}
    for app in apps:
        stage = app.get("status", "interested")
        by_stage.setdefault(stage, []).append(app)

    lines = ["## Your Job Application Pipeline\n"]

    # Count active applications
    active = [a for a in apps if a.get("status") not in _TERMINAL_STATUSES]
    successful = [a for a in apps if a.get("status") in ("accepted", "started")]
    lines.append(f"**{len(active)} active** | **{len(apps)} total** | "
                 f"**{len(successful)} accepted/started**\n")

    today_str = datetime.now().strftime("%Y-%m-%d")

    # Show pipeline in stage order
    for stage in _PIPELINE_STAGES:
        stage_apps = by_stage.get(stage, [])
        if not stage_apps:
            continue

        label = _STAGE_LABELS.get(stage, stage)
        lines.append(f"### {label} ({len(stage_apps)})\n")

        for app in stage_apps:
            company = app.get("company", "Unknown")
            position = app.get("position", "Unknown")
            fc_badge = " ✓ Fair-Chance" if app.get("fair_chance_employer") else ""
            lines.append(f"**{position}** at {company}{fc_badge}")
            if app.get("source"):
                lines.append(f"   Source: {app['source']}")
            if app.get("contact_name"):
                contact_info = f"   Contact: {app['contact_name']}"
                if app.get("contact_email"):
                    contact_info += f" — {app['contact_email']}"
                if app.get("contact_phone"):
                    contact_info += f" — {app['contact_phone']}"
                lines.append(contact_info)
            if app.get("apply_url"):
                lines.append(f"   Apply: {app['apply_url']}")
            if app.get("follow_up_date"):
                fu = app["follow_up_date"]
                overdue = fu < today_str
                lines.append(f"   Follow up by: {fu}" + (" ⚠ OVERDUE" if overdue else ""))
            if app.get("deadline"):
                dl = app["deadline"]
                urgent = dl <= today_str
                lines.append(f"   Deadline: {dl}" + (" ⚠ PAST DUE" if urgent else ""))
            # Interview details
            if app.get("interview_date"):
                interview_str = f"   Interview: {app['interview_date']}"
                if app.get("interview_time"):
                    interview_str += f" at {app['interview_time']}"
                if app.get("interview_location"):
                    interview_str += f" — {app['interview_location']}"
                if app.get("interview_type"):
                    interview_str += f" ({app['interview_type']})"
                lines.append(interview_str)
            # Offer/salary
            if app.get("salary_offered"):
                lines.append(f"   Salary offered: {app['salary_offered']}")
            # Rejection reason
            if stage == "rejected" and app.get("rejection_reason"):
                lines.append(f"   Rejection reason: {app['rejection_reason']}")
            if app.get("notes"):
                lines.append(f"   Notes: {app['notes']}")
            updated = app.get("updated_at", app.get("created_at", ""))
            if updated:
                lines.append(f"   Last updated: {updated[:10]}")
            next_action = _NEXT_ACTIONS.get(stage, "")
            if next_action and stage not in _TERMINAL_STATUSES:
                lines.append(f"   **Next:** {next_action}")
            lines.append("")

    # Follow-up reminders
    follow_ups = [
        a for a in apps
        if a.get("follow_up_date") and a.get("status") not in _TERMINAL_STATUSES
    ]
    if follow_ups:
        follow_ups.sort(key=lambda a: a.get("follow_up_date", ""))
        lines.append("### Upcoming Follow-ups\n")
        for app in follow_ups:
            fu = app["follow_up_date"]
            overdue = " ⚠ OVERDUE" if fu < today_str else ""
            lines.append(
                f"- **{fu}**{overdue} — {app['position']} at {app['company']} "
                f"({_STAGE_LABELS.get(app['status'], app['status'])})"
            )
        lines.append("")

    # Upcoming interviews
    interviews = [
        a for a in apps
        if a.get("interview_date") and a.get("status") not in _TERMINAL_STATUSES
    ]
    if interviews:
        interviews.sort(key=lambda a: a.get("interview_date", ""))
        lines.append("### Upcoming Interviews\n")
        for app in interviews:
            idate = app["interview_date"]
            interview_str = f"- **{idate}**"
            if app.get("interview_time"):
                interview_str += f" at {app['interview_time']}"
            interview_str += f" — {app['position']} at {app['company']}"
            if app.get("interview_location"):
                interview_str += f" ({app['interview_location']})"
            lines.append(interview_str)
        lines.append("")

    # Deadline warnings
    deadlines = [
        a for a in apps
        if a.get("deadline") and a.get("status") not in _TERMINAL_STATUSES
    ]
    if deadlines:
        deadlines.sort(key=lambda a: a.get("deadline", ""))
        lines.append("### Approaching Deadlines\n")
        for app in deadlines:
            dl = app["deadline"]
            try:
                days_left = (datetime.strptime(dl, "%Y-%m-%d") - datetime.now()).days
                urgency = f" ({days_left} days left)" if days_left >= 0 else " ⚠ PAST DUE"
            except ValueError:
                urgency = ""
            lines.append(
                f"- **{dl}**{urgency} — {app['position']} at {app['company']} "
                f"({_STAGE_LABELS.get(app['status'], app['status'])})"
            )
        lines.append("")

    lines.append("---")
    lines.append("*Apply to multiple jobs in parallel. Don't wait on one application. "
                 "The more applications out there, the faster you find work.*")
    return "\n".join(lines)


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


def get_pending_job_follow_ups() -> dict:
    """Check for overdue and upcoming job application follow-ups. Called at session start."""
    from ..db.crud import get_job_applications
    from ..db.database import get_db

    db = get_db()
    try:
        apps = get_job_applications(db, DEFAULT_USER_ID)
    finally:
        db.close()

    if not apps:
        return {"overdue": [], "upcoming_7_days": [], "interviews_upcoming": [], "deadlines_soon": []}

    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    week_out = (today + timedelta(days=7)).strftime("%Y-%m-%d")

    active = [a for a in apps if a.get("status") not in _TERMINAL_STATUSES]

    overdue = []
    upcoming_7_days = []
    interviews_upcoming = []
    deadlines_soon = []

    for app in active:
        company = app.get("company", "Unknown")
        position = app.get("position", "Unknown")
        status = app.get("status", "")
        contact_email = app.get("contact_email", "")

        # Follow-up dates
        fu = app.get("follow_up_date", "")
        if fu:
            if fu < today_str:
                try:
                    days_overdue = (today - datetime.strptime(fu, "%Y-%m-%d")).days
                except ValueError:
                    days_overdue = 0
                overdue.append({
                    "company": company,
                    "position": position,
                    "follow_up_date": fu,
                    "status": status,
                    "days_overdue": days_overdue,
                    "contact_email": contact_email,
                })
            elif fu <= week_out:
                try:
                    days_until = (datetime.strptime(fu, "%Y-%m-%d") - today).days
                except ValueError:
                    days_until = 0
                upcoming_7_days.append({
                    "company": company,
                    "position": position,
                    "follow_up_date": fu,
                    "status": status,
                    "days_until": days_until,
                })

        # Upcoming interviews
        idate = app.get("interview_date", "")
        if idate and idate >= today_str:
            interviews_upcoming.append({
                "company": company,
                "position": position,
                "interview_date": idate,
                "interview_time": app.get("interview_time", ""),
                "interview_location": app.get("interview_location", ""),
                "interview_type": app.get("interview_type", ""),
            })

        # Approaching deadlines
        dl = app.get("deadline", "")
        if dl:
            try:
                days_left = (datetime.strptime(dl, "%Y-%m-%d") - today).days
            except ValueError:
                days_left = 999
            if days_left <= 14:
                deadlines_soon.append({
                    "company": company,
                    "position": position,
                    "deadline": dl,
                    "days_left": days_left,
                    "status": status,
                })

    return {
        "overdue": sorted(overdue, key=lambda x: x.get("days_overdue", 0), reverse=True),
        "upcoming_7_days": sorted(upcoming_7_days, key=lambda x: x.get("follow_up_date", "")),
        "interviews_upcoming": sorted(interviews_upcoming, key=lambda x: x.get("interview_date", "")),
        "deadlines_soon": sorted(deadlines_soon, key=lambda x: x.get("days_left", 0)),
    }
