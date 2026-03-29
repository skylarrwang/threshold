"""Tool for generating resumes from user profile data."""

import os
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from langchain_core.tools import tool
from langchain_openai import ChatOpenAI

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
GENERATED_DOCS_DIR = DATA_DIR / "documents" / "generated"

# Use the same model as employment subagent for consistency
RESUME_LLM = ChatOpenAI(
    model=os.getenv("THRESHOLD_RESUME_MODEL", "grok-3-mini-fast"),
    base_url="https://api.x.ai/v1",
    api_key=os.getenv("XAI_API_KEY", "not-set"),
)

RESUME_SYSTEM_PROMPT = """\
You are a professional resume writer specializing in helping people re-entering the workforce.
Your resumes are clean, professional, and focus on strengths and skills.

CRITICAL RULES:
- NEVER mention incarceration, prison, jail, conviction, or criminal history
- Use "career transition" or "professional development" for employment gaps
- Focus on skills, certifications, and what they CAN do
- Keep it to one page worth of content
- Use clean markdown formatting

OUTPUT FORMAT:
Return ONLY the resume in markdown format. No explanations, no "here's your resume", just the resume itself.
Use this structure:

# [Full Name]
[Phone] | [Email] | [City, State]

## Professional Summary
[2-3 sentences highlighting key strengths and career focus]

## Skills & Certifications
- [Certification 1]
- [Certification 2]
- [Skill 1, Skill 2, Skill 3]

## Work Experience
**[Job Title]** — [Company/Context]
[Date Range or "Previous Experience"]
- [Achievement or responsibility]
- [Achievement or responsibility]

## Education
- [Degree/Certification] — [Institution], [Year if known]
"""


def _get_profile_data() -> dict:
    """Get user profile data from the database."""
    from ..db.database import get_db
    from ..db.crud import get_populated_fields

    db = get_db()
    try:
        return get_populated_fields(db, "default-user")
    finally:
        db.close()


def _format_profile_for_resume(profile: dict) -> str:
    """Format profile data into a prompt for the LLM."""
    lines = ["Here is the person's profile information:\n"]

    # Identity
    identity = profile.get("identity", {})
    if identity.get("legal_name"):
        lines.append(f"Name: {identity['legal_name']}")
    if identity.get("phone_number"):
        lines.append(f"Phone: {identity['phone_number']}")
    if identity.get("current_address"):
        lines.append(f"Address: {identity['current_address']}")
    if identity.get("state_of_release"):
        lines.append(f"State: {identity['state_of_release']}")

    # Employment & Skills
    employment = profile.get("employment", {})
    if employment.get("certifications"):
        certs = employment["certifications"]
        if isinstance(certs, list):
            lines.append(f"Certifications: {', '.join(certs)}")
        else:
            lines.append(f"Certifications: {certs}")

    if employment.get("trade_skills"):
        skills = employment["trade_skills"]
        if isinstance(skills, list):
            lines.append(f"Trade Skills: {', '.join(skills)}")
        else:
            lines.append(f"Trade Skills: {skills}")

    if employment.get("has_ged_or_diploma"):
        lines.append("Education: Has GED or high school diploma")

    if employment.get("college_completed"):
        lines.append(f"College: {employment['college_completed']}")

    if employment.get("has_valid_drivers_license"):
        lines.append("Has valid driver's license")

    # Note about gaps - help the LLM handle this gracefully
    lines.append("\nNote: If work history is sparse, focus on skills and certifications.")
    lines.append("Use 'Career Transition Period' for any gaps. Do not mention incarceration.")

    return "\n".join(lines)


def _save_resume_markdown(content: str, title: str) -> tuple[str, str]:
    """Save resume as markdown file. Returns (doc_id, filename)."""
    GENERATED_DOCS_DIR.mkdir(parents=True, exist_ok=True)

    doc_id = str(uuid4())[:8]
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
    safe_title = "".join(c if c.isalnum() or c in " -_" else "" for c in title).strip().replace(" ", "_")

    # Add version number if similar resumes exist
    existing = list(GENERATED_DOCS_DIR.glob(f"resume_{safe_title}*.md"))
    version = len(existing) + 1
    versioned_title = f"{title} v{version}" if version > 1 else title

    filename = f"resume_{safe_title}_v{version}_{timestamp}_{doc_id}.md"

    file_path = GENERATED_DOCS_DIR / filename
    file_path.write_text(content, encoding="utf-8")

    # Save metadata
    meta_path = GENERATED_DOCS_DIR / f"{doc_id}.meta"
    meta_path.write_text(
        f"id:{doc_id}\n"
        f"type:resume\n"
        f"title:{versioned_title}\n"
        f"filename:{filename}\n"
        f"format:markdown\n"
        f"created:{datetime.now().isoformat()}\n",
        encoding="utf-8",
    )

    return doc_id, filename


@tool
def generate_resume(
    target_role: str = "",
    additional_context: str = "",
) -> str:
    """Generate a professional resume based on the user's profile.

    Args:
        target_role: Optional target job/industry to tailor the resume for (e.g., "warehouse", "construction")
        additional_context: Any additional information to include (e.g., "emphasize forklift certification")

    Returns:
        Confirmation message with the document ID and the resume content.
    """
    # Get profile data
    profile = _get_profile_data()

    if not profile:
        return "I don't have enough profile information to generate a resume. Please complete your profile first."

    # Check for minimum required data
    identity = profile.get("identity", {})
    if not identity.get("legal_name"):
        return "I need at least your name to generate a resume. Please update your profile."

    # Build the prompt
    profile_text = _format_profile_for_resume(profile)

    user_prompt = f"{profile_text}\n"
    if target_role:
        user_prompt += f"\nTarget role/industry: {target_role}"
    if additional_context:
        user_prompt += f"\nAdditional notes: {additional_context}"

    user_prompt += "\n\nGenerate a professional one-page resume in markdown format."

    # Generate resume with LLM
    try:
        response = RESUME_LLM.invoke([
            {"role": "system", "content": RESUME_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ])
        resume_content = response.content.strip()
    except Exception as e:
        return f"Error generating resume: {e}"

    # Clean up markdown if wrapped in code fences
    if resume_content.startswith("```markdown"):
        resume_content = resume_content[11:]
    if resume_content.startswith("```"):
        resume_content = resume_content[3:]
    if resume_content.endswith("```"):
        resume_content = resume_content[:-3]
    resume_content = resume_content.strip()

    # Generate title
    title = f"{target_role.title()} Resume" if target_role else "Professional Resume"
    name = identity.get("legal_name", "").split()[0] if identity.get("legal_name") else ""
    if name:
        title = f"{name}'s {title}"

    # Save the resume
    doc_id, filename = _save_resume_markdown(resume_content, title)

    return (
        f"Resume generated and saved!\n\n"
        f"**{title}**\n"
        f"Document ID: {doc_id}\n\n"
        f"You can download it as a PDF from the Documents page.\n\n"
        f"---\n\n"
        f"{resume_content}"
    )
