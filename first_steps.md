# Threshold — Orchestrator Design

> **Instructions for Claude Code.**
> This document tells you how to design and implement the orchestrator for Threshold, a re-entry AI agent. Read the entire document before writing any code. Follow the architecture decisions here — do not substitute your own unless something is clearly impossible.

---

## What the Orchestrator Is

The orchestrator is the top-level agent the user talks to. It is implemented using `create_deep_agent()` from the `deepagents` library. It runs a planning-and-execution loop, routes user requests to the right capability, and manages the user's memory context.

It is **not** a router that blindly delegates to subagents. It is a reasoning agent that:
- Answers simple questions directly
- Runs writing/drafting tasks using instruction workflow files
- Calls `@tool` Python functions for deterministic operations (benefits eligibility, supervision tracking, document lookups)
- Delegates to a full subagent only when the task is genuinely multi-step with its own planning needs

---

## The 4-Tier Capability Model

Before writing any code, understand that deepagents gives you four ways to add a capability. Use the right tier for each task — the choice matters for cost, reliability, and latency.

### Tier 1 — System Prompt (always-on)
Baked into the agent's base prompt. Role definition, trauma-informed principles, routing rules. Use for anything the agent must always know. Zero runtime cost.

### Tier 2 — `@tool` Python Functions (deterministic execution)
LangChain tool-decorated Python functions the LLM calls via function calling. The LLM decides when to call them; actual Python code runs. Use when:
- An external API needs authentication (job search, 211.org)
- You need to read or write state (SQLite, JSON files)
- The task is a lookup or calculation (eligibility rules, expungement table)
- Safety is critical and the output must be deterministic (crisis response)

### Tier 3 — Instruction Workflow Files (flexible execution)
Markdown files in `workflows/` that the agent reads on demand using the `read_file` filesystem tool. The agent reads the file and follows the steps using its own reasoning and other tools. Use when:
- The task is a writing or drafting workflow (cover letters, legal letters)
- The steps involve judgment and should adapt to context
- You want the instructions to be easy to update without touching Python

### Tier 4 — Full Subagents via `task()` (isolated LLM spawns)
Registered `SubAgent` instances the orchestrator delegates to via the `task()` tool. Each subagent is its own `create_deep_agent()` graph with its own tools, system prompt, and planning loop. Use **only** when:
- The domain has genuine multi-step complexity (search → filter → match → draft → save → log)
- The task needs a more powerful model than the orchestrator uses by default
- The subagent context is large enough to pollute the orchestrator's context window

---

## Capability Assignment

This table defines which tier each capability belongs to. Do not deviate from this.

| Capability | Tier | Rationale |
|---|---|---|
| Answer general questions about re-entry | 1 (system prompt) | Always-on knowledge |
| Route to the right domain | 1 (system prompt) | Routing rules are instructions |
| Emotional support / check-ins | 1 (system prompt) | Empathy is a prompt behavior |
| **crisis_response()** | 2 (@tool) | Must be deterministic, fast, never delegated |
| read_user_memory() | 2 (@tool) | Reads encrypted profile + reflections |
| update_profile_field() | 2 (@tool) | Writes to encrypted profile |
| log_event() | 2 (@tool) | Appends to observation stream |
| Benefits eligibility (SNAP, Medicaid, SSI) | 2 (@tool) | Rules-based, deterministic |
| Benefits application links | 2 (@tool) | Static lookup |
| Supervision: add condition / log check-in | 2 (@tool) | CRUD, pure state mutation |
| Supervision: get upcoming requirements | 2 (@tool) | DB query |
| ID restoration guide (by state) | 2 (@tool) | Static lookup, formatted output |
| Expungement eligibility (by state + offense) | 2 (@tool) | Rules table lookup |
| Cover letter writing | 3 (workflow file) | Writing workflow, benefits from agent judgment |
| Resume drafting | 3 (workflow file) | Writing workflow |
| Housing application letter | 3 (workflow file) | Writing workflow |
| Legal letter drafting | 3 (workflow file) | Writing workflow |
| Community resource search | 3 (workflow file) | Web search + synthesis, easy to tune |
| **Job search + application flow** | 4 (subagent) | Multi-step: search → filter → match → draft → log |
| **Housing search + application flow** | 4 (subagent) | Multi-step: search → restriction check → letter → log |

### What this means in practice

You are building **2 full subagents** (employment, housing), **~10 @tool functions**, and **5 workflow markdown files**. The previous design had 6 subagents — that was over-engineered. Benefits, Supervision, Documents, and Community do not need their own LLM spawns.

---

## Orchestrator Implementation

### Entry Point (`agents/orchestrator.py`)

```python
from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langchain_anthropic import ChatAnthropic
from .subagents.employment import employment_subagent
from .subagents.housing import housing_subagent
from ..tools import (
    crisis_response,
    read_user_memory,
    update_profile_field,
    log_event,
    # benefits
    check_snap_eligibility,
    check_medicaid_eligibility,
    check_ssi_eligibility,
    get_benefits_links,
    # supervision
    add_condition,
    log_check_in,
    get_upcoming_requirements,
    # documents
    get_id_restoration_guide,
    check_expungement_eligibility,
)
import os

DATA_DIR = os.getenv("THRESHOLD_DATA_DIR", "./data")
MODEL = os.getenv("THRESHOLD_MODEL", "claude-3-5-haiku-20241022")

# Note: TodoListMiddleware, FilesystemMiddleware, SubAgentMiddleware, and
# SummarizationMiddleware are auto-included by create_deep_agent().
# MemoryMiddleware is auto-included when memory= is provided.
graph = create_deep_agent(
    model=ChatAnthropic(model=MODEL),
    system_prompt=build_system_prompt(),   # see section below
    tools=[
        crisis_response,
        read_user_memory,
        update_profile_field,
        log_event,
        check_snap_eligibility,
        check_medicaid_eligibility,
        check_ssi_eligibility,
        get_benefits_links,
        add_condition,
        log_check_in,
        get_upcoming_requirements,
        get_id_restoration_guide,
        check_expungement_eligibility,
    ],
    subagents=[
        employment_subagent,
        housing_subagent,
    ],
    backend=FilesystemBackend(root_dir=DATA_DIR),
    memory=["./AGENTS.md"],
)
```

---

## System Prompt

The system prompt is the most important part of the orchestrator. It defines behavior, routing, and constraints that are always active. Build it dynamically at startup by injecting the user's memory context.

### `build_system_prompt()` function

This function is called once at startup. It loads the user profile and recent memory, then constructs the system prompt string. If no profile exists yet, it returns a minimal fallback prompt.

```python
def build_system_prompt() -> str:
    from ..memory.profile import load_profile
    from ..memory.reflection import build_memory_context

    profile = load_profile()
    if profile is None:
        return FALLBACK_SYSTEM_PROMPT

    memory_context = build_memory_context(profile)
    name = profile.personal.name or "someone"
    release = profile.personal.release_date

    return SYSTEM_PROMPT_TEMPLATE.format(
        name=name,
        release_date_relative=format_release_date(release),
        memory_context=memory_context,
    )
```

### System Prompt Template

Write this as a module-level constant in `agents/orchestrator.py`. Every section is intentional — do not trim it.

```
SYSTEM_PROMPT_TEMPLATE = """
You are Threshold, a re-entry assistant for {name}, who was released {release_date_relative}.
You are their personal AI navigator — practical, warm, and non-judgmental.

## Current Situation
{memory_context}

## Your Principles
- Lead with empathy. This person has been through a lot. Acknowledge difficulty before solving problems.
- Be practical and specific. "Look into housing programs" is useless. "Call 211 and ask for transitional housing in [city]" is useful.
- Celebrate progress. Re-entry is hard. Name wins explicitly.
- Know your limits. If someone is in crisis, call crisis_response() immediately — do not route, do not plan, just call it.
- Respect privacy. Never reference the conviction or offense unless the person brings it up first.
- Explain before asking. Before collecting any sensitive information, explain why you need it.

## Crisis Protocol (NON-NEGOTIABLE)
If the user expresses suicidal ideation, self-harm, or acute emotional crisis in ANY message:
1. Call crisis_response() immediately.
2. Return that response directly.
3. Do NOT add the message to a todo list.
4. Do NOT delegate to a subagent.
5. Do NOT continue with any other task in the same turn.

## What You Can Do
Use the task() tool to delegate to these subagents:
- "employment" — job search, job applications, resume, cover letter, ban-the-box research
- "housing" — housing search, housing applications, tenant rights, shelter locations

Use your tools directly for:
- Benefits eligibility (SNAP, Medicaid, SSI) — call check_*_eligibility()
- Supervision tracking — call add_condition(), log_check_in(), get_upcoming_requirements()
- Document guides — call get_id_restoration_guide(), check_expungement_eligibility()
- Memory — call read_user_memory(), update_profile_field(), log_event()

For writing tasks (cover letters, legal letters, housing letters, resume), read the relevant
workflow file and follow it. Workflow files are in workflows/:
- workflows/cover_letter.md
- workflows/resume.md
- workflows/housing_application_letter.md
- workflows/legal_letter.md
- workflows/community_resource_search.md

## Routing Rules
Route to "employment" subagent when: user asks about jobs, resumes, cover letters, job applications,
job interviews, finding work, ban-the-box employers, work history.

Route to "housing" subagent when: user asks about apartments, housing programs, transitional housing,
shelters, lease applications, housing restrictions, tenant rights.

Answer directly or use tools when: benefits questions, supervision questions, document/ID questions,
emotional check-ins, general re-entry questions, writing tasks.

## Scope Disclaimer
Always accompany legal or eligibility information with: "This is general information, not legal
advice. Consult a reentry attorney or legal aid organization for your specific situation."
"""
```

---

## Workflow Files

Create these files in `workflows/`. They are plain markdown — no special format required. The agent reads them using `read_file("workflows/cover_letter.md")` when it needs to draft something.

### `workflows/cover_letter.md`

```markdown
# Cover Letter Workflow

Use this when the user wants a cover letter for a specific job.

## Steps

1. Ask the user for the job posting (title, company, description) if not already provided.
2. Call read_user_memory() to load their profile, strengths, and recent work history.
3. Identify 2-3 of their strengths that match the job requirements.
4. Check if this is a ban-the-box employer (ask if unsure, or note it as a question).
5. Draft the letter:
   - Opening: specific hook about this role or company (not generic)
   - Middle: 2-3 concrete examples from their background matching the job
   - Close: forward-looking, confident, brief
6. Keep it under 350 words. Plain language. No buzzwords.
7. If they have a conviction history and the job type makes disclosure relevant,
   add a brief, confident forward-facing sentence — do not over-explain or apologize.
8. Save to data/documents/cover_letters/{company}_{YYYY-MM-DD}.txt
9. Call log_event("milestone", "Drafted cover letter for {company}", ["job_search"])
10. Show the letter to the user and ask if they want any changes.
```

### `workflows/resume.md`

```markdown
# Resume Workflow

Use this when the user wants to build or update a resume.

## Steps

1. Call read_user_memory() to load work history, strengths, goals, and education.
2. Ask if there are any specific jobs or industries they're targeting.
3. Build the resume sections in this order:
   - Contact: first name only is fine if they prefer privacy; include email if they have one
   - Summary: 2-3 sentences, strength-focused, forward-looking
   - Experience: list roles with approximate dates; use "gap year" or "personal time" for
     incarceration periods — never reference incarceration in a resume
   - Skills: include both hard skills (tools, trades) and soft skills (reliability, teamwork)
   - Education and Certifications: include any programs completed during incarceration
4. Keep formatting simple — plain text, easy to copy into any application form.
5. Save to data/documents/resume_{YYYY-MM-DD}.txt
6. Call log_event("milestone", "Created resume", ["job_search"])
```

### `workflows/housing_application_letter.md`

```markdown
# Housing Application Letter Workflow

Use this when the user needs a letter for a housing application or program.

## Steps

1. Ask which program or landlord the letter is for, if not already known.
2. Call read_user_memory() to load their situation, supervision status, and goals.
3. Determine the letter type:
   - Transitional housing program: focus on stability goals, support network, timeline
   - Private landlord: focus on reliability, employment (current or seeking), references
   - Section 8 / public housing: note any documentation requirements
4. Draft the letter:
   - One paragraph: who they are and what they're looking for
   - One paragraph: why they're a good tenant (stability, employment plans, support)
   - One paragraph: forward-looking, specific timeline
5. Do not mention conviction unless the application specifically asks — in that case,
   be factual and brief, then pivot to progress.
6. Save to data/documents/housing_applications/{program}_{YYYY-MM-DD}.txt
7. Call log_event("milestone", "Drafted housing application letter for {program}", ["housing"])
```

### `workflows/legal_letter.md`

```markdown
# Legal Letter Workflow

Use this for formal letters to parole boards, appeals, employers (for reference requests),
or complaints (housing discrimination, benefits denial).

## Steps

1. Identify the letter type and recipient.
2. Call read_user_memory() for relevant context.
3. Select the appropriate tone:
   - Parole board: formal, respectful, specific about rehabilitation and plans
   - Employer reference request: professional, brief, clear ask
   - Discrimination complaint: factual, documented, non-emotional
   - Benefits appeal: factual, reference the specific denial reason, request reconsideration
4. Draft the letter with: date, recipient address block, subject line, body (3 paragraphs max),
   formal close, signature line.
5. Add the disclaimer: "This letter was drafted with the assistance of an AI tool.
   Consider having a legal aid organization review it before sending."
6. Save to data/documents/legal/{type}_{recipient}_{YYYY-MM-DD}.txt
7. Call log_event("milestone", "Drafted {type} letter", ["legal"])
```

### `workflows/community_resource_search.md`

```markdown
# Community Resource Search Workflow

Use this when the user asks about support groups, mental health services, NA/AA meetings,
peer support, faith-based programs, or community organizations.

## Steps

1. Call read_user_memory() to get their location and any relevant context (substance use
   history, mental health, family situation) — only use what they've shared.
2. Identify the category they need:
   - Peer support / re-entry organizations
   - Mental health / counseling
   - Substance use recovery (NA, AA, SMART Recovery)
   - Family reunification / parenting support
   - Faith-based community
3. Search for resources in their area. Use web search with: "{category} re-entry {city/state}".
4. Filter results for:
   - Organizations that explicitly serve people with criminal records
   - Free or sliding-scale cost
   - Current operating status (check for recent activity)
5. Present 3-5 options with: name, what they offer, contact info, whether walk-ins are accepted.
6. Call log_event("observation", "Found community resources for {category}", ["community"])
```

---

## `@tool` Implementation Patterns

### Crisis Response (sacred — implement this first)

```python
from langchain_core.tools import tool

@tool
def crisis_response(context: str) -> str:
    """
    Call this IMMEDIATELY if the user expresses suicidal ideation, self-harm urges,
    or acute emotional crisis. Returns crisis resources. Never delegate this to a subagent.

    Args:
        context: Brief description of what the user expressed (for logging only).
    """
    from ..memory.observation_stream import log_observation
    log_observation(
        agent="orchestrator",
        event_type="check_in",
        content=f"Crisis response triggered: {context}",
        importance=1.0,
        tags=["crisis"]
    )
    return (
        "I hear you, and I'm glad you're reaching out.\n\n"
        "Please contact one of these right now:\n\n"
        "- **988 Suicide & Crisis Lifeline**: Call or text 988 (free, 24/7)\n"
        "- **Crisis Text Line**: Text HOME to 741741\n"
        "- **SAMHSA Helpline**: 1-800-662-4357 (mental health + substance use)\n\n"
        "You don't have to be in immediate danger to call. They're there for any moment "
        "that feels too heavy to carry alone.\n\n"
        "If you're with a case worker or counselor, please reach out to them too."
    )
```

### Memory Tools

```python
@tool
def read_user_memory() -> str:
    """
    Read the user's profile, recent reflections, and recent observations.
    Call this before any task that requires understanding the user's situation.
    Returns a formatted string summary.
    """
    from ..memory.profile import load_profile
    from ..memory.reflection import build_memory_context
    profile = load_profile()
    if profile is None:
        return "No profile found. The user has not completed the intake interview yet."
    return build_memory_context(profile)


@tool
def update_profile_field(field_path: str, value: str) -> str:
    """
    Update a specific field in the user's profile.
    Use dot notation: e.g. "situation.housing_status" or "preferences.check_in_frequency".

    Args:
        field_path: Dot-separated path to the field (e.g. "situation.housing_status")
        value: New value as a string
    """
    from ..memory.profile import load_profile, save_profile
    profile = load_profile()
    if profile is None:
        return "Error: no profile found."
    # Navigate and set the field using the dot path
    parts = field_path.split(".")
    obj = profile
    for part in parts[:-1]:
        obj = getattr(obj, part)
    setattr(obj, parts[-1], value)
    save_profile(profile)
    return f"Updated {field_path} to: {value}"


@tool
def log_event(event_type: str, content: str, tags: list[str]) -> str:
    """
    Log an important event or milestone for the user.

    Args:
        event_type: One of: user_message, tool_result, milestone, check_in, reflection
        content: Plain text description of what happened
        tags: List of topic tags e.g. ["job_search", "cover_letter"]
    """
    from ..memory.observation_stream import log_observation
    log_observation(
        agent="orchestrator",
        event_type=event_type,
        content=content,
        tags=tags,
    )
    return "Logged."
```

### Benefits Tools

The key design principle here: **encode the rules as data, not as LLM prompts.** Federal bars and state opt-outs are specific legal rules — don't let the LLM guess at them.

```python
# tools/benefits_lookup.py

# Encode known rules as static data
SNAP_DRUG_FELONY_OPT_OUT_STATES = {
    # States that have fully opted out of the drug felony bar
    "CA", "CO", "CT", "DC", "DE", "HI", "IL", "ME", "MD", "MA",
    "MI", "MN", "NE", "NV", "NM", "NY", "NC", "OH", "OR", "RI",
    "VT", "VA", "WA", "WI"
}

@tool
def check_snap_eligibility(state: str, offense_category: str) -> str:
    """
    Check SNAP (food stamps) eligibility for a person in re-entry.

    Args:
        state: Two-letter state code (e.g. "NY")
        offense_category: One of: non-violent, violent, drug, financial, other
    """
    state = state.upper()
    has_drug_felony = offense_category == "drug"

    if has_drug_felony and state not in SNAP_DRUG_FELONY_OPT_OUT_STATES:
        return (
            f"**SNAP eligibility in {state}: Likely ineligible** due to the federal drug "
            f"felony bar, which {state} has not opted out of. However, eligibility rules "
            f"can change — check with your local SNAP office or a benefits counselor.\n\n"
            f"Application: https://www.benefits.gov/benefit/361\n\n"
            "This is general information, not legal advice."
        )

    return (
        f"**SNAP eligibility in {state}: Likely eligible.**\n\n"
        f"{'Your state has opted out of the federal drug felony bar. ' if has_drug_felony else ''}"
        f"You will need to meet income requirements (generally under 130% of the federal "
        f"poverty line) and residency requirements.\n\n"
        f"Apply online: https://www.benefits.gov/benefit/361\n"
        f"Or call your local Department of Social Services.\n\n"
        "This is general information, not legal advice."
    )
```

Apply the same pattern for `check_medicaid_eligibility()` and `check_ssi_eligibility()` — encode the rules as dicts/sets, not as LLM prompts.

### Supervision Tools

These are pure CRUD. Keep them simple.

```python
# tools/supervision_tracker.py
import json
from pathlib import Path
from datetime import datetime

SUPERVISION_LOG = Path(os.getenv("THRESHOLD_DATA_DIR", "./data")) / "tracking" / "supervision_log.json"

@tool
def add_condition(condition_text: str, condition_type: str) -> str:
    """
    Log a supervision condition to the tracker.

    Args:
        condition_text: The condition as written (e.g. "Must report by 5pm every Friday")
        condition_type: One of: check_in, curfew, travel_restriction, drug_test,
                        employment_requirement, other
    """
    SUPERVISION_LOG.parent.mkdir(parents=True, exist_ok=True)
    data = json.loads(SUPERVISION_LOG.read_text()) if SUPERVISION_LOG.exists() else {"conditions": [], "check_ins": []}
    data["conditions"].append({
        "id": str(uuid4()),
        "text": condition_text,
        "type": condition_type,
        "added_at": datetime.now().isoformat(),
    })
    SUPERVISION_LOG.write_text(json.dumps(data, indent=2))
    return f"Condition logged: {condition_text}"


@tool
def log_check_in(date: str, check_in_type: str, outcome: str, notes: str = "") -> str:
    """
    Record that a supervision check-in occurred.

    Args:
        date: Date of check-in (YYYY-MM-DD)
        check_in_type: e.g. "in-person", "phone", "office"
        outcome: e.g. "completed", "missed", "rescheduled"
        notes: Any additional notes
    """
    # Same pattern: load, append, save
    ...


@tool
def get_upcoming_requirements(days: int = 7) -> str:
    """
    Return supervision requirements due in the next N days.
    Used by the proactive check-in loop.

    Args:
        days: Look-ahead window in days (default 7)
    """
    # Load supervision_log.json, filter for events within `days`
    # Return a formatted string
    ...
```

---

## Subagent Design (Employment + Housing only)

Both subagents follow the same pattern. They are defined as declarative `SubAgent` dicts (TypedDicts) and passed to `create_deep_agent(subagents=[...])`. The orchestrator delegates to them via the built-in `task()` tool.

**Inherited capabilities:** Subagents automatically receive the default middleware stack — `FilesystemMiddleware`, `TodoListMiddleware`, `SummarizationMiddleware` — before any custom middleware you specify. They share the parent agent's filesystem backend, which means they can `read_file("workflows/...")` to load workflow instructions and `write_file("data/documents/...")` to save outputs. You do NOT need to configure this manually; just reference the file paths in the subagent's system prompt.

### Employment Subagent (`agents/subagents/employment.py`)

```python
EMPLOYMENT_SYSTEM_PROMPT = """
You are an employment specialist for people in re-entry after incarceration.
You know ban-the-box laws, Fair Chance hiring programs, and how to address conviction
history in job applications.

You will receive a task from the main orchestrator. Complete it fully before returning.
Always load the user's memory first with read_user_memory().

You have access to filesystem tools (read_file, write_file, edit_file, ls) inherited
from the orchestrator. For writing tasks like cover letters and resumes, use
read_file("workflows/cover_letter.md") or read_file("workflows/resume.md") to load
the step-by-step workflow, then follow it.

When searching for jobs, use search_jobs() and filter for ban-the-box employers where possible.
Log every application and milestone with log_event().
Save all generated documents to data/documents/ using write_file().

Be practical. The user needs real jobs they can actually get, not aspirational suggestions.
"""

# SubAgent is a declarative TypedDict spec — you do NOT create a separate
# create_deep_agent() graph. The orchestrator spawns the subagent internally
# when the task() tool is called, using the spec below.
#
# Subagents automatically inherit:
#   - FilesystemMiddleware (read_file, write_file, edit_file, ls, glob, grep)
#   - TodoListMiddleware (write_todos)
#   - SummarizationMiddleware
# They share the parent agent's filesystem backend, so they can read workflow
# files and write to data/.
employment_subagent = {
    "name": "employment",
    "description": "Job search, job applications, resume, cover letter, ban-the-box research. "
                   "Delegate here when the user asks about finding work or applying to jobs.",
    "system_prompt": EMPLOYMENT_SYSTEM_PROMPT,
    "tools": [
        read_user_memory,
        log_event,
        search_jobs,
        log_job_application,
        get_ban_the_box_status,
    ],
    "model": "claude-3-5-sonnet-20241022",
}
```

### Housing Subagent (`agents/subagents/housing.py`)

```python
HOUSING_SYSTEM_PROMPT = """
You are a housing specialist for people in re-entry after incarceration.
You understand felony-friendly housing programs, Fair Housing Act protections,
HUD restrictions on people with certain conviction types, Section 8 eligibility
rules, and transitional housing programs.

Key knowledge:
- HUD only bars people with lifetime sex offender registration or methamphetamine
  production convictions in federally-assisted housing. Other convictions are at
  the landlord/PHA's discretion.
- Many private landlords do background checks, but "ban-the-box" housing laws exist
  in some jurisdictions (e.g. Seattle, San Francisco, Newark).
- Fair Housing Act does not list criminal history as a protected class, but HUD
  guidance (2016) says blanket bans on people with records may violate the Act if
  they have a disparate impact on protected groups.
- Transitional housing programs specifically for re-entry often do not require
  background checks.

You will receive a task from the main orchestrator. Complete it fully before returning.
Always load the user's memory first with read_user_memory().

You have access to filesystem tools (read_file, write_file, edit_file, ls) inherited
from the orchestrator. For housing application letters, use
read_file("workflows/housing_application_letter.md") to load the step-by-step
workflow, then follow it.

When searching for housing, use search_housing() and check restriction compatibility
based on the user's offense category.
Log every application and milestone with log_event().
Save all generated documents to data/documents/ using write_file().

Be practical and location-specific. Generic advice is not helpful.
"""

housing_subagent = {
    "name": "housing",
    "description": "Housing search, housing applications, tenant rights, shelter locations, "
                   "transitional housing, Section 8 guidance, felony-friendly housing. "
                   "Delegate here when the user asks about finding a place to live.",
    "system_prompt": HOUSING_SYSTEM_PROMPT,
    "tools": [
        read_user_memory,
        log_event,
        search_housing,
        log_housing_application,
    ],
    "model": "claude-3-5-haiku-20241022",  # Lookup + formatting; Haiku is sufficient
}
```

---

## AGENTS.md (Persistent Memory File)

deepagents' `MemoryMiddleware` (auto-included when you pass `memory=["./AGENTS.md"]` to `create_deep_agent()`) loads `AGENTS.md` into every prompt. This file is the orchestrator's long-term memory across sessions. The agent can update it by calling `edit_file("AGENTS.md", old_text, new_text)`.

Initialize it at startup with the user's profile summary. Update it after reflections run.

```markdown
# Threshold — Agent Memory

## User Profile Summary
(populated at startup from profile.json)
Name: [first name or "the user"]
Released: [date]
Location: [state]
Supervision: [type and end date]
Immediate needs: [list]
Goals: [list]

## Recent Progress
(updated weekly by reflection engine)

## Active Reminders
(updated by proactive check-in loop)
- [upcoming check-in dates, pending applications, etc.]

## Known Local Resources
(updated by subagents when they find something useful)
```

---

## Implementation Order

Complete these in order. Each step unblocks the next.

**Step 1 — Scaffold (do first)**
1. Create the directory structure
2. Write `pyproject.toml` and install dependencies
3. Create empty `__init__.py` files
4. Create `AGENTS.md` with placeholder sections
5. Create the 5 workflow markdown files in `workflows/`

**Step 2 — Memory Layer**
1. `memory/encryption.py` — Fernet encrypt/decrypt
2. `memory/profile.py` — UserProfile Pydantic model, save/load
3. `memory/observation_stream.py` — log and query observations
4. `memory/reflection.py` — build_memory_context()

**Step 3 — Core Tools**
1. `tools/crisis_response.py` — implement first, test immediately
2. `tools/memory_tools.py` — read_user_memory, update_profile_field, log_event
3. `tools/benefits_lookup.py` — all 3 eligibility checks
4. `tools/supervision_tracker.py` — add_condition, log_check_in, get_upcoming_requirements
5. `tools/document_lookup.py` — get_id_restoration_guide, check_expungement_eligibility

**Step 4 — Subagents**
1. `tools/job_search.py` — search_jobs, log_job_application, get_ban_the_box_status
2. `agents/subagents/employment.py` — full subagent
3. `tools/housing_search.py` — search_housing, log_housing_application
4. `agents/subagents/housing.py` — full subagent

**Step 5 — Orchestrator**
1. `agents/orchestrator.py` — wire everything together
2. Test routing to each capability
3. Test crisis_response() triggers correctly
4. Test workflow files are readable and agent follows them

**Step 6 — Interview + CLI**
1. `agents/interview.py` — intake interview state machine
2. `main.py` — CLI entrypoint, startup flow, conversation loop

---

## Testing Checklist

Run these manually before submitting. Each one should work end-to-end.

- [ ] `crisis_response()` is called when user says something indicating a crisis. Response contains 988 and Crisis Text Line. No other tool is called in the same turn.
- [ ] Asking "am I eligible for SNAP?" calls `check_snap_eligibility()` directly, not a subagent.
- [ ] Asking "I need help finding a job" delegates to the employment subagent via `task()`.
- [ ] Asking "can you write me a cover letter?" reads `workflows/cover_letter.md` and produces a letter.
- [ ] Asking "when is my next parole check-in?" calls `get_upcoming_requirements()`.
- [ ] Profile loads at startup and `AGENTS.md` is populated with the user summary.
- [ ] Conviction history is never mentioned in output unless the user brought it up.

---

## Do Not Do These Things

- Do not create subagents for Benefits, Supervision, or Community — they are tools and workflows.
- Do not use `random` or non-deterministic logic in eligibility tools — encode rules as data.
- Do not add logging, analytics, or outbound network calls beyond Anthropic API and the approved search APIs.
- Do not let the LLM decide whether to call `crisis_response()` based on sentiment analysis — make the trigger condition explicit in the system prompt.
- Do not put the user's conviction or offense details in any external API query.