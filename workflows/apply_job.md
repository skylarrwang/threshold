# Job Application Workflow

Use this when the user **wants to apply** for a job, **picks a listing** from search results,
says "help me apply," "I want that job," "walk me through applying," or is ready to move
from **browsing** to **submitting**. Follow stages in order; skip what does not apply.

If they only want **ideas** or **search** (no apply intent yet), you can run a lighter path:
just `search_jobs()` and coaching — still read their profile first.

---

## Stage 1: Load Context

Call `read_user_memory()` (or rely on what you already have from the same session).

From **UserProfile**, prioritize:

| Area | Fields useful for jobs |
|------|-------------------------|
| **Personal** | `name`, `home_state`, `release_date` (for framing, not for pasting into forms unless asked) |
| **Situation** | `employment_status`, `immediate_needs`, `supervision_type` / `supervision_end_date` (sensitive — see below) |
| **Goals** | `short_term_goals`, `long_term_goals`, `strengths`, `values` |
| **Support** | `case_worker_name` if relevant for referrals |

**Not in the encrypted profile today:** email, phone, street address, city, ZIP. You must **ask the user**
(or confirm they want them used) before passing these into `autofill_job_application()`.

**Sensitive fields (offense category, supervision details, conviction narrative):**

- Do **not** push these into browser autofill tools.
- If the application asks about criminal history, help the user **think through** honest,
  concise answers in chat — they type or paste themselves unless they explicitly want drafted text
  saved to a file for them to copy.

---

## Stage 2: Clarify Intent and Target

**Do they already have a specific role?**

- **Yes** (company + title or an **Apply URL** from a prior `search_jobs` result) → go to Stage 3.
- **No** → run `search_jobs(query, location)`:
  - **`query`:** skills or job type (e.g. warehouse, cook, driver, retail).
  - **`location`:** city/state string; if empty, the tool uses `personal.home_state` from the loaded profile when available.
- Present results clearly. Point out **✓ Fair-Chance** badges and any **ban-the-box** note at the top of the tool output
  (those come from `search_jobs()` — explain that badges are a curated match, not a guarantee).

Ask which **one listing** they want to pursue first. **Recommend applying to several employers in parallel** over time,
like the housing pipeline — one application is fragile.

---

## Stage 3: Prepare Materials

Before they hit the employer site:

1. **Resume** — If they need one or it is stale: `read_file("workflows/resume.md")` and follow it.
   Save under `data/documents/` as that workflow specifies.

2. **Cover letter** — If the posting or employer warrants it: `read_file("workflows/cover_letter.md")` and follow it.

3. **Autofill contact bundle** — For `autofill_job_application()`, collect and confirm:
   - `applicant_email`, `applicant_phone`
   - Optional: `street_address`, `city`, `zip_code` (many forms ask for these)

The autofill tool also uses **safe profile slices** for name/state (via the same safety rules as other form tools:
no offense/supervision stuffing into generic contact autofill).

---

## Stage 4: Browser Assist

Use this when the user wants help **opening the listing and pre-filling safe fields** on the employer or job-board site.

**Apply URL:** Use the **Apply** link from `search_jobs()` output (`redirect_url` from Adzuna — shown as **Apply:** in the markdown).

**Call autofill_job_application:**
```
autofill_job_application(
    apply_url=<the job URL>,
    applicant_email=<their email>,
    applicant_phone=<their phone>,
    city=<their city>,
    ...
)
```

**What the tool does:**

- **Phase A:** Opens a **headed** browser, summarizes page title, URL, a text sample, visible field count, and **warnings**
  (e.g. possible CAPTCHA, login wall, bot-check page).
- **Phase B:** Best-effort fill for **email, phone, name, address-style** fields only.
- **Never** clicks Submit/Apply. The user **always** reviews and submits themselves.

**If the tool reports login required, CAPTCHA, or zero fields filled:** coach manual steps — sign in, complete CAPTCHA,
then they fill the rest; offer to help phrase answers in chat.

**Not the right tool for:** arbitrary government benefit forms → delegate to **form-filler** subagent with the exact URL.

---

## Stage 5: They Submit and You Track

After they actually apply (or send the application):

```
log_job_application(company="...", position="...", status="applied", notes="...")
```

**`status` values** (from the tool contract): `applied`, `interview_scheduled`, `interviewed`, `offered`, `rejected`, `accepted`.

Use **`notes`** for portal name, confirmation number, or follow-up date.

Also use `log_event()` for milestones (e.g. drafted documents, interview scheduled).

---

## Stage 6: Follow-Up and Next Applications

- Encourage **multiple active applications** — help them pick a next listing from `search_jobs` or a saved URL.
- **Interview prep:** strengths from profile, ban-the-box / fair-chance framing if they ask about disclosure timing
  (general information, not legal advice).
- When status changes, update with `log_job_application(...)` again or new notes.

---

## Key Principles

- **Never submit for them** — the product design leaves final click with the user.
- **Privacy** — treat offense and supervision as high-sensitivity; default is chat guidance, not automated pasting.
- **Honesty** — encourage truthful applications; help with **how** to say things, not what to hide on required legal questions.
- **Parallel effort** — one job application is not enough; stack several.

---

## Quick Reference: Tools

| Step | Tool |
|------|------|
| Memory | `read_user_memory()` |
| Find listings | `search_jobs(query, location="")` |
| Open URL + safe autofill | `autofill_job_application(apply_url, ...)` |
| Track pipeline | `log_job_application(company, position, status, notes="")` |
| Milestones | `log_event(...)` |

Related workflows: `workflows/resume.md`, `workflows/cover_letter.md`.
