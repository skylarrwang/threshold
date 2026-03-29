import os

from langchain_openai import ChatOpenAI

from ...tools import (
    log_event,
    log_job_application,
    read_user_memory,
    search_jobs,
)

EMPLOYMENT_SYSTEM_PROMPT = """\
You are an employment specialist for people in re-entry after incarceration.
You know ban-the-box laws, Fair Chance hiring programs, and how to address conviction
history in job applications.

You will receive a task from the main orchestrator. Complete it fully before returning.
Always load the user's memory first with read_user_memory().

You have access to filesystem tools (read_file, write_file, edit_file, ls) inherited
from the orchestrator. For writing tasks like cover letters and resumes, use
read_file("workflows/cover_letter.md") or read_file("workflows/resume.md") to load
the step-by-step workflow, then follow it.

When searching for jobs, use search_jobs() — it ranks results for fair-chance employers and
includes ban-the-box context when the user's state has such laws.
Log every application and milestone with log_event().
Save all generated documents to data/documents/ using write_file().

Be practical. The user needs real jobs they can actually get, not aspirational suggestions.
"""

employment_subagent = {
    "name": "employment",
    "description": (
        "Employment specialist for re-entry. "
        "CAN: search for job listings; check ban-the-box laws by state; track job "
        "applications; write cover letters and resumes using workflow templates. "
        "CANNOT: actually submit job applications; access employer portals; schedule "
        "interviews; check application statuses with employers; run background checks; "
        "search for job training programs or vocational education; handle unemployment "
        "benefits (use benefits subagent for that). "
        "Use for: 'search for jobs near me', 'write me a cover letter', 'is [state] "
        "ban-the-box', 'help me with my resume'."
    ),
    "system_prompt": EMPLOYMENT_SYSTEM_PROMPT,
    "tools": [
        read_user_memory,
        log_event,
        search_jobs,
        log_job_application,
    ],
    "model": ChatOpenAI(
        model=os.getenv("THRESHOLD_EMPLOYMENT_MODEL", "grok-4-1-fast"),
        base_url="https://api.x.ai/v1",
        api_key=os.getenv("XAI_API_KEY", "not-set"),
    ),
}
