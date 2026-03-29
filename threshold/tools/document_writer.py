"""Tool for saving generated documents (resumes, cover letters, etc.)."""

import os
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from langchain_core.tools import tool

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
GENERATED_DOCS_DIR = DATA_DIR / "documents" / "generated"


@tool
def save_document(
    content: str,
    doc_type: str,
    title: str,
) -> str:
    """Save a generated document (resume, cover letter, etc.) for the user to download.

    Args:
        content: The full text content of the document
        doc_type: Type of document - one of: resume, cover_letter, legal_letter, housing_letter
        title: A short title for the document (e.g., "Construction Resume" or "Amazon Cover Letter")

    Returns:
        Confirmation message with the document ID and download instructions.
    """
    # Ensure directory exists
    GENERATED_DOCS_DIR.mkdir(parents=True, exist_ok=True)

    # Generate unique ID and filename
    doc_id = str(uuid4())[:8]
    date_str = datetime.now().strftime("%Y-%m-%d")
    safe_title = "".join(c if c.isalnum() or c in " -_" else "" for c in title).strip().replace(" ", "_")
    filename = f"{doc_type}_{safe_title}_{date_str}_{doc_id}.txt"

    # Save the file
    file_path = GENERATED_DOCS_DIR / filename
    file_path.write_text(content, encoding="utf-8")

    # Also save metadata for listing
    meta_path = GENERATED_DOCS_DIR / f"{doc_id}.meta"
    meta_path.write_text(
        f"id:{doc_id}\n"
        f"type:{doc_type}\n"
        f"title:{title}\n"
        f"filename:{filename}\n"
        f"created:{datetime.now().isoformat()}\n",
        encoding="utf-8",
    )

    return (
        f"Document saved successfully!\n\n"
        f"**{title}** ({doc_type})\n"
        f"Document ID: {doc_id}\n\n"
        f"You can download it from the Documents page, or I can show it again anytime."
    )


def list_generated_documents() -> list[dict]:
    """List all generated documents (for API use, not a tool).

    Returns format expected by frontend:
    - id, type, title, content, createdAt, wordCount
    """
    if not GENERATED_DOCS_DIR.exists():
        return []

    docs = []
    for meta_file in GENERATED_DOCS_DIR.glob("*.meta"):
        meta_content = meta_file.read_text(encoding="utf-8")
        raw_meta = {}
        for line in meta_content.strip().split("\n"):
            if ":" in line:
                key, val = line.split(":", 1)
                raw_meta[key] = val

        if raw_meta.get("filename"):
            doc_path = GENERATED_DOCS_DIR / raw_meta["filename"]
            if doc_path.exists():
                content = doc_path.read_text(encoding="utf-8")
                word_count = len(content.split())

                # Map to frontend expected format
                docs.append({
                    "id": raw_meta.get("id", ""),
                    "type": raw_meta.get("type", "resume"),
                    "title": raw_meta.get("title", "Untitled"),
                    "content": content,
                    "createdAt": raw_meta.get("created", ""),
                    "wordCount": word_count,
                })

    # Sort by created date, newest first
    docs.sort(key=lambda d: d.get("createdAt", ""), reverse=True)
    return docs


def get_generated_document(doc_id: str) -> dict | None:
    """Get a specific generated document by ID (for API use)."""
    meta_path = GENERATED_DOCS_DIR / f"{doc_id}.meta"
    if not meta_path.exists():
        return None

    meta_content = meta_path.read_text(encoding="utf-8")
    raw_meta = {}
    for line in meta_content.strip().split("\n"):
        if ":" in line:
            key, val = line.split(":", 1)
            raw_meta[key] = val

    if raw_meta.get("filename"):
        doc_path = GENERATED_DOCS_DIR / raw_meta["filename"]
        if doc_path.exists():
            content = doc_path.read_text(encoding="utf-8")
            word_count = len(content.split())

            return {
                "id": raw_meta.get("id", doc_id),
                "type": raw_meta.get("type", "resume"),
                "title": raw_meta.get("title", "Untitled"),
                "content": content,
                "createdAt": raw_meta.get("created", ""),
                "wordCount": word_count,
                "file_path": str(doc_path),
                "filename": raw_meta.get("filename", ""),
            }

    return None
