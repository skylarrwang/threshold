"""Headed-browser job application assist: orient (phase A) + safe field fill (phase B).

Does not click submit. Requires explicit user confirmation before opening a URL.
"""

from __future__ import annotations

import re
import time
from urllib.parse import urlparse

from langchain_core.tools import tool
from playwright.sync_api import Page, sync_playwright

from ..memory.profile import load_profile
from .form_filler.safety import filter_profile_for_form

_DISPLAY_WIDTH = 1280
_DISPLAY_HEIGHT = 720

_CAPTCHA_HINTS = (
    "recaptcha",
    "hcaptcha",
    "g-recaptcha",
    "data-callback",
    "captcha",
    "turnstile",
    "cf-turnstile",
)

_LOGIN_HINTS = (
    "sign in",
    "log in",
    "login to",
    "create an account",
    "register to apply",
)

_BOT_CHECK_HINTS = (
    "checking your browser",
    "just a moment",
    "ddos protection",
)


def _is_adzuna_url(url: str) -> bool:
    try:
        host = (urlparse(url).netloc or "").lower()
    except Exception:
        return False
    return host == "adzuna.com" or host.endswith(".adzuna.com")


def _dismiss_adzuna_email_alert(page: Page) -> bool:
    """Close the 'similar jobs' email modal (best-effort)."""
    for _ in range(2):
        for getter in (
            lambda: page.get_by_role("button", name=re.compile(r"no,?\s*thanks", re.I)),
            lambda: page.get_by_role("link", name=re.compile(r"no,?\s*thanks", re.I)),
        ):
            try:
                loc = getter()
                if loc.count() > 0:
                    first = loc.first
                    if first.is_visible():
                        first.click(timeout=3_000)
                        return True
            except Exception:
                pass
        try:
            t = page.get_by_text(re.compile(r"^no,?\s*thanks\.?$", re.I))
            if t.count() > 0 and t.first.is_visible():
                t.first.click(timeout=2_000)
                return True
        except Exception:
            pass
        try:
            page.keyboard.press("Escape")
            time.sleep(0.25)
        except Exception:
            pass
    return False


def _adzuna_apply_locator(page: Page):
    """Primary CTA on listing pages: green Apply for this job."""
    btn = page.get_by_role("button", name=re.compile(r"apply\s+for\s+this\s+job", re.I))
    if btn.count() > 0:
        return btn
    return page.get_by_role("link", name=re.compile(r"apply\s+for\s+this\s+job", re.I))


def _adzuna_click_apply_and_follow(page: Page) -> tuple[Page, bool]:
    """Click Adzuna apply CTA; follow same-tab redirect or a new tab. Returns (page, clicked)."""
    loc = _adzuna_apply_locator(page)
    if loc.count() == 0:
        return page, False
    target = loc.first
    if not target.is_visible():
        return page, False

    old_url = page.url
    initial_pages = list(page.context.pages)

    try:
        target.click(timeout=8_000)
    except Exception:
        return page, False

    deadline = time.time() + 20.0
    while time.time() < deadline:
        extras = [p for p in page.context.pages if p not in initial_pages]
        if extras:
            np = extras[-1]
            try:
                np.wait_for_load_state("domcontentloaded", timeout=15_000)
            except Exception:
                pass
            try:
                np.bring_to_front()
            except Exception:
                pass
            return np, True
        try:
            if page.url != old_url:
                try:
                    page.wait_for_load_state("domcontentloaded", timeout=8_000)
                except Exception:
                    pass
                return page, True
        except Exception:
            pass
        time.sleep(0.12)

    return page, True


def _prepare_adzuna_listing_if_needed(page: Page) -> tuple[Page, list[str]]:
    """On Adzuna listing pages: dismiss email modal, click through to employer apply flow."""
    notes: list[str] = []
    try:
        url = page.url
    except Exception:
        return page, notes
    if not _is_adzuna_url(url):
        return page, notes

    if _dismiss_adzuna_email_alert(page):
        notes.append("Closed the Adzuna email-alert popup (No, thanks).")
        time.sleep(0.35)

    new_page, clicked = _adzuna_click_apply_and_follow(page)
    if clicked:
        notes.append(
            "Clicked **Apply for this job** and moved to the next page (employer or ATS). "
            "Autofill below targets that page."
        )
    else:
        notes.append(
            "Could not find a visible **Apply for this job** control on this Adzuna page — "
            "continuing orientation/autofill on the listing page."
        )
    return new_page, notes


def _validate_apply_url(url: str) -> str | None:
    url = (url or "").strip()
    if not url:
        return "No URL provided."
    try:
        parsed = urlparse(url)
    except Exception:
        return "Invalid URL."
    if parsed.scheme not in ("https", "http"):
        return "URL must use http or https."
    if not parsed.netloc:
        return "URL is missing a host (e.g. example.com)."
    return None


def _split_name(full: str) -> tuple[str, str]:
    full = full.strip()
    if not full:
        return "", ""
    parts = full.split(None, 1)
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


def _body_sample(page: Page, max_chars: int = 4500) -> str:
    try:
        raw = page.locator("body").inner_text(timeout=10_000)
    except Exception:
        return ""
    text = " ".join(raw.split())
    return text if len(text) <= max_chars else text[:max_chars] + "…"


def _gather_phase_a(page: Page) -> dict:
    title = ""
    try:
        title = page.title() or ""
    except Exception:
        pass
    current_url = ""
    try:
        current_url = page.url
    except Exception:
        pass
    sample = _body_sample(page)
    low = sample.lower()

    warnings: list[str] = []
    if any(h in low for h in _CAPTCHA_HINTS):
        warnings.append("Possible CAPTCHA / bot challenge on the page — autofilling may be incomplete.")
    if any(h in low for h in _LOGIN_HINTS):
        warnings.append("Page may require sign-in or account creation before applying.")
    if any(h in low for h in _BOT_CHECK_HINTS):
        warnings.append("Possible intermediary / bot-check page — wait for the real form to load.")

    try:
        n_fields = page.locator("input:visible, textarea:visible, select:visible").count()
    except Exception:
        n_fields = -1

    return {
        "title": title.strip(),
        "url": current_url,
        "text_sample": sample,
        "warnings": warnings,
        "visible_field_count": n_fields,
    }


def _try_fill_label(page: Page, pattern: re.Pattern[str], value: str, filled: list[str], tag: str) -> None:
    if not value.strip() or tag in filled:
        return
    try:
        loc = page.get_by_label(pattern).first
        if loc.count() == 0:
            return
        if not loc.is_visible():
            return
        loc.fill(value, timeout=2_500)
        filled.append(tag)
    except Exception:
        return


def _try_fill_autocomplete(page: Page, token: str, value: str, filled: list[str], tag: str) -> None:
    if not value.strip():
        return
    if tag in filled:
        return
    try:
        loc = page.locator(f'input:visible[autocomplete="{token}"]').first
        if loc.count() == 0:
            return
        loc.fill(value, timeout=2_500)
        filled.append(tag)
    except Exception:
        return


def _try_fill_first_matching_selector(
    page: Page,
    selectors: list[str],
    value: str,
    filled: list[str],
    tag: str,
) -> None:
    if not value.strip():
        return
    if tag in filled:
        return
    for sel in selectors:
        try:
            loc = page.locator(sel).first
            if loc.count() == 0:
                continue
            if not loc.is_visible():
                continue
            loc.fill(value, timeout=2_000)
            filled.append(tag)
            return
        except Exception:
            continue


def _phase_b_fill(page: Page, data: dict[str, str]) -> list[str]:
    """Fill only low-risk contact / location fields. Never password or submit."""
    filled: list[str] = []
    first, last = data.get("first_name", ""), data.get("last_name", "")
    full = data.get("name", "")

    label_specs: list[tuple[str, re.Pattern[str], str]] = [
        ("email", re.compile(r"e-?mail", re.I), data.get("email", "")),
        ("phone", re.compile(r"phone|mobile|cell|telephone", re.I), data.get("phone", "")),
        ("first_name", re.compile(r"first\s*name|given\s*name", re.I), first),
        ("last_name", re.compile(r"last\s*name|surname|family\s*name", re.I), last),
        ("full_name", re.compile(r"full\s*name|your\s*name|applicant\s*name|name\s*\(as", re.I), full),
        ("city", re.compile(r"^city$|\bcity\b", re.I), data.get("city", "")),
        ("state", re.compile(r"\bstate\b|\bprovince\b", re.I), data.get("state", "")),
        ("zip", re.compile(r"zip|postal\s*code", re.I), data.get("zip", "")),
        ("street", re.compile(r"address\s*line\s*1|street\s*address|mailing\s*address", re.I), data.get("street", "")),
    ]

    for tag, pattern, val in label_specs:
        if tag in filled:
            continue
        _try_fill_label(page, pattern, val, filled, tag)

    _try_fill_autocomplete(page, "email", data.get("email", ""), filled, "email")
    _try_fill_autocomplete(page, "tel", data.get("phone", ""), filled, "phone")
    _try_fill_autocomplete(page, "given-name", first, filled, "first_name")
    _try_fill_autocomplete(page, "family-name", last, filled, "last_name")
    _try_fill_autocomplete(page, "name", full, filled, "full_name")
    _try_fill_autocomplete(page, "address-line1", data.get("street", ""), filled, "street")
    _try_fill_autocomplete(page, "address-level2", data.get("city", ""), filled, "city")
    _try_fill_autocomplete(page, "address-level1", data.get("state", ""), filled, "state")
    _try_fill_autocomplete(page, "postal-code", data.get("zip", ""), filled, "zip")

    email = data.get("email", "")
    if email and "email" not in filled:
        _try_fill_first_matching_selector(
            page,
            [
                'input:visible[type="email"]',
                'input:visible[name*="email" i]',
                'input:visible[id*="email" i]',
            ],
            email,
            filled,
            "email",
        )

    phone = data.get("phone", "")
    if phone and "phone" not in filled:
        _try_fill_first_matching_selector(
            page,
            [
                'input:visible[type="tel"]',
                'input:visible[name*="phone" i]',
                'input:visible[id*="phone" i]',
            ],
            phone,
            filled,
            "phone",
        )

    return filled


def _build_fill_data(
    *,
    applicant_email: str,
    applicant_phone: str,
    street_address: str,
    city: str,
    zip_code: str,
) -> dict[str, str]:
    profile = load_profile()
    base: dict[str, str] = {}
    if profile is not None:
        base = filter_profile_for_form(profile)

    name = (base.get("name") or "").strip()
    first, last = _split_name(name)
    state = (base.get("state") or "").strip()

    data: dict[str, str] = {
        "name": name,
        "first_name": first,
        "last_name": last,
        "state": state,
        "email": applicant_email.strip(),
        "phone": applicant_phone.strip(),
        "street": street_address.strip(),
        "city": city.strip(),
        "zip": zip_code.strip(),
    }
    return data


@tool
def autofill_job_application(
    apply_url: str,
    user_confirmed: bool = False,
    applicant_email: str = "",
    applicant_phone: str = "",
    street_address: str = "",
    city: str = "",
    zip_code: str = "",
) -> str:
    """Open a job application URL in a visible browser, summarize the page (phase A),
    then fill only safe contact/location fields from the profile and provided details (phase B).

    On **Adzuna** listing pages, dismisses the email-alert popup and clicks **Apply for this job**
    so the headed browser reaches the employer/ATS page before orientation and fill.

    Never submits the final application — the user must review and submit themselves.

    Args:
        apply_url: Listing or apply URL (e.g. Adzuna redirect_url).
        user_confirmed: Must be True after the user explicitly agrees to open this URL
            and allow autofilling. If False, returns instructions only (no browser).
        applicant_email: Email to use (not stored on UserProfile by default).
        applicant_phone: Phone number to use.
        street_address: Mailing / street line if the form asks for it.
        city: City if the form asks for it.
        zip_code: ZIP / postal code if the form asks for it.
    """
    err = _validate_apply_url(apply_url)
    if err:
        return f"**Cannot open application link.** {err}"

    if not user_confirmed:
        return (
            "**Confirmation required.**\n\n"
            "This tool opens the employer or job-board site in a **visible browser** and may "
            "fill **contact fields only** (email, phone, name, address). It **never** submits "
            "the application.\n\n"
            "Ask the user if they want to proceed with this specific URL. If they agree, call "
            "again with **`user_confirmed=True`** and the same `apply_url`.\n\n"
            f"Pending URL: {apply_url}"
        )

    data = _build_fill_data(
        applicant_email=applicant_email,
        applicant_phone=applicant_phone,
        street_address=street_address,
        city=city,
        zip_code=zip_code,
    )

    # Local Playwright session (mirrors form_filler BrowserSession.start); keep process alive
    # so the headed window stays open for the user — same intentional leak as BrowserSession.close no-op.
    pw = sync_playwright().start()
    browser = None
    try:
        browser = pw.chromium.launch(headless=False)
        page = browser.new_page(
            viewport={"width": _DISPLAY_WIDTH, "height": _DISPLAY_HEIGHT},
        )
        page.goto(apply_url, wait_until="domcontentloaded", timeout=30_000)
        time.sleep(1)
        page, adzuna_notes = _prepare_adzuna_listing_if_needed(page)
        time.sleep(0.5)
    except Exception as e:
        try:
            if browser is not None:
                browser.close()
        except Exception:
            pass
        try:
            pw.stop()
        except Exception:
            pass
        return f"**Could not open the page.**\n\n{type(e).__name__}: {e}"
    phase_a = _gather_phase_a(page)
    warnings = list(phase_a["warnings"])
    filled_tags = _phase_b_fill(page, data)

    lines: list[str] = [
        "## Job application assist",
        "",
    ]
    if adzuna_notes:
        lines.append("### Adzuna listing")
        for n in adzuna_notes:
            lines.append(f"- {n}")
        lines.append("")
    lines.extend(
        [
            "### Phase A — Page orientation",
            f"- **Title:** {phase_a['title'] or '(none)'}",
            f"- **Current URL:** {phase_a['url']}",
            f"- **Visible inputs / textareas / selects (approx.):** {phase_a['visible_field_count']}",
            "",
        ]
    )
    if warnings:
        lines.append("**Warnings:**")
        for w in warnings:
            lines.append(f"- {w}")
        lines.append("")
    lines.append("**Page text sample (truncated):**")
    sample = phase_a["text_sample"] or "(could not read body text)"
    lines.append(f"> {sample[:1200]}{'…' if len(sample) > 1200 else ''}")
    lines.append("")

    lines.append("### Phase B — Safe autofill")
    if filled_tags:
        lines.append("Filled (best-effort, review in the browser):")
        for t in filled_tags:
            lines.append(f"- {t.replace('_', ' ')}")
    else:
        lines.append(
            "No matching fields were filled automatically. The form may use custom controls, "
            "shadow DOM, a login wall, or labels this tool does not recognize."
        )
    lines.append("")
    lines.append(
        "The **browser window stays open** so you can check every field, complete anything "
        "missing, and **submit the application yourself** when ready."
    )
    return "\n".join(lines)
