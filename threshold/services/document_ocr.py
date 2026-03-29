"""Document OCR extraction via Gemini Flash — two-step pipeline.

Step 1 (OCR): Send any document image to Gemini → get raw key-value extraction.
Step 2 (Map): Send raw extraction + our DB schema to Gemini → get mapped fields
              that align to our exact column names and types.

The two-step separation matters because:
- Step 1 is document-agnostic: it works on any document, any format
- Step 2 handles the fuzzy matching: "Parole Officer" → supervision.po_name
- Raw extraction can be logged/inspected independently of what got written to DB
- If our schema changes, only Step 2 needs updating

Pipeline: image bytes → Step 1 (OCR) → raw JSON → Step 2 (map) → DB upsert → discard image.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from threshold.db.crud import save_document_upload, upsert_from_extraction
from threshold.db.database import get_db

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"

_MIME_MAP = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".heic": "image/heic",
}

# ---------------------------------------------------------------------------
# Step 1: Generic OCR extraction
# ---------------------------------------------------------------------------

OCR_PROMPT = """\
You are a document OCR system. Extract every piece of structured information
you can find in this document image. The document could be anything — a legal
form, a letter, a certificate, a court order, government paperwork, an ID card,
a medical record, or something else entirely.

Return a JSON object with:

{
  "document_type": "brief description of what this document appears to be",
  "issuing_authority": "who issued it, if identifiable",
  "date_on_document": "any date printed on the document",
  "fields": {
    "field_name": "value",
    ...
  }
}

Rules:
- In "fields", use descriptive snake_case keys based on what the field actually
  says on the document (e.g., "parolee_name", "offense_class", "max_expiration_date").
- Extract ALL visible fields — names, dates, addresses, phone numbers, conditions,
  checkboxes, amounts, case numbers, ID numbers, signatures (note as "[signed]").
- For checkboxes, use true/false.
- For dates, use YYYY-MM-DD when possible.
- For dollar amounts, use numbers (not strings).
- If a field is partially illegible, extract what you can and add "(partial)" suffix.
- If the document has multiple pages or sections, flatten everything into the
  single "fields" dict with descriptive keys.
- Do NOT interpret or infer — only extract what is explicitly written.

Return ONLY valid JSON. No markdown, no explanation, no code fences.
"""

# ---------------------------------------------------------------------------
# Step 2: Schema mapping
# ---------------------------------------------------------------------------

# Human-readable schema description with field semantics and allowed values.
# This is what the mapping LLM uses to decide where raw fields belong.
DB_SCHEMA_DESCRIPTION = """\
Our database has the following sections and fields. Map the extracted document
fields to these EXACT column names. Only map fields where you have reasonable
confidence the extracted value corresponds to the database field.

SECTION: identity
  legal_name          (string) — person's full legal name
  date_of_birth       (date, YYYY-MM-DD)
  ssn_encrypted       (string) — Social Security Number (will be encrypted before storage)
  current_address     (string) — current residential address
  mailing_address     (string) — mailing address if different from current
  phone_number        (string)
  gender_identity     (string) — male, female, non-binary, other
  state_of_release    (string) — two-letter US state code
  preferred_language  (string) — language code like "en", "es"

SECTION: documents
  documents_in_hand   (string[]) — which document types this document IS or proves the person has.
                       Valid values: state_id, birth_cert, ss_card, passport, discharge_papers,
                       conditions_form, court_order

SECTION: supervision
  supervision_type            (enum) — none | probation | parole | supervised_release
  supervision_end_date        (date, YYYY-MM-DD) — may be called "max expiration", "end of sentence"
  po_name                     (string) — parole or probation officer's name
  po_phone                    (string) — PO's phone number
  next_reporting_date         (date, YYYY-MM-DD)
  reporting_frequency         (enum) — weekly | biweekly | monthly | as_directed
  curfew_start                (time, HH:MM 24h)
  curfew_end                  (time, HH:MM 24h)
  drug_testing_required       (bool)
  drug_testing_frequency      (string) — e.g. "random", "weekly"
  electronic_monitoring       (bool)
  geographic_restrictions     (bool)
  geographic_restrictions_detail (string)
  no_contact_orders           (bool)
  no_contact_orders_detail    (string)
  mandatory_treatment         (bool) — anger management, substance abuse program, etc.
  mandatory_treatment_detail  (string) — type of treatment
  restitution_owed            (bool)
  restitution_amount          (float) — dollar amount
  outstanding_fines           (bool)
  outstanding_fines_amount    (float) — dollar amount

SECTION: housing
  housing_status              (enum) — stable | transitional | shelter | couch_surfing | unhoused
  returning_to_housing_with   (enum) — family | partner | friend | alone | shelter | unknown
  sex_offender_registry       (bool)
  sex_offender_registry_tier  (string) — tier/level if applicable
  eviction_history            (bool)
  accessibility_needs         (bool)

SECTION: employment
  employment_status           (enum) — employed | actively_looking | not_looking | unable_to_work
  has_valid_drivers_license    (bool)
  has_ged_or_diploma           (bool)
  college_completed            (bool)
  certifications               (string[]) — e.g. HVAC, CDL, ServSafe, OSHA-10
  trade_skills                 (string[]) — e.g. welding, carpentry, electrical
  physical_limitations         (bool)
  physical_limitations_detail  (string)
  felony_category              (enum) — non_violent | violent | drug | financial | sex_offense | other

SECTION: health
  chronic_conditions                (string[]) — diabetes, hypertension, HIV, hep_c, COPD, other
  current_medications               (json[]) — [{name, dosage}]
  disability_status                 (bool)
  disability_type                   (string)
  mental_health_diagnoses           (string[])
  substance_use_disorder_diagnosis  (bool)
  has_active_medicaid               (bool)
  insurance_gap                     (bool)

SECTION: benefits
  benefits_enrolled           (string[]) — SNAP, SSI, SSDI, TANF, Medicaid, VA, WIC, etc.
  benefits_applied_pending    (string[])
  child_support_obligations   (bool)
  child_support_amount_monthly (float)
  veteran_status              (bool)
"""

MAPPING_PROMPT = """\
You are a data mapping system. You have two inputs:

1. RAW EXTRACTED FIELDS from a document (OCR output)
2. A DATABASE SCHEMA with exact column names

Your job: map the raw extracted fields to the correct database columns.
The field names from the document will NOT match our column names exactly.
Use your judgment to match them. For example:
- "parolee_name" or "name_of_offender" → identity.legal_name
- "max_expiration_date" → supervision.supervision_end_date
- "special_conditions: drug testing" → supervision.drug_testing_required = true

Return a JSON object where keys are section names and values are dicts of
column_name → extracted_value. Only include fields you can confidently map.
Use the exact column names from the schema.

Format dates as YYYY-MM-DD, times as HH:MM, booleans as true/false,
dollar amounts as numbers.

DATABASE SCHEMA:
{schema}

RAW EXTRACTED FIELDS:
{raw_fields}

Return ONLY valid JSON like:
{{
  "identity": {{"legal_name": "...", "date_of_birth": "..."}},
  "supervision": {{"supervision_type": "parole", "po_name": "..."}},
  ...
}}

No markdown, no explanation, no code fences.
"""


def _get_client() -> genai.Client:
    api_key = (
        os.getenv("GOOGLE_API_KEY")
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("VERTEX_API_KEY")
    )
    if not api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY, GEMINI_API_KEY, or VERTEX_API_KEY must be set. "
            "Get one at https://aistudio.google.com/apikey"
        )
    return genai.Client(api_key=api_key)


def _gemini_json_call(client: genai.Client, contents: list, temperature: float = 0.1) -> dict:
    """Make a Gemini call expecting JSON back."""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=temperature,
        ),
    )
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        logger.error("Gemini returned non-JSON: %s", response.text[:500])
        raise ValueError("Gemini call failed — response was not valid JSON")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ocr_extract(image_data: bytes, mime_type: str = "image/jpeg") -> dict[str, Any]:
    """Step 1: Generic OCR extraction from any document image.

    Returns raw extracted fields — not mapped to our schema yet.
    Result has keys: document_type, issuing_authority, date_on_document, fields.
    """
    client = _get_client()
    return _gemini_json_call(client, [
        types.Part.from_text(text=OCR_PROMPT),
        types.Part.from_bytes(data=image_data, mime_type=mime_type),
    ])


def map_to_schema(raw_extraction: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Step 2: Map raw OCR extraction to our DB schema fields.

    Takes the raw output from ocr_extract() and returns a dict organized
    by schema section with our exact DB column names as keys.
    """
    raw_fields_str = json.dumps(raw_extraction, indent=2, default=str)
    prompt = MAPPING_PROMPT.format(
        schema=DB_SCHEMA_DESCRIPTION,
        raw_fields=raw_fields_str,
    )

    client = _get_client()
    mapped = _gemini_json_call(client, [types.Part.from_text(text=prompt)])

    valid_sections = {"identity", "documents", "supervision", "housing",
                      "employment", "health", "benefits", "preferences"}

    cleaned = {}
    for section, fields in mapped.items():
        if section in valid_sections and isinstance(fields, dict):
            non_null = {k: v for k, v in fields.items() if v is not None}
            if non_null:
                cleaned[section] = non_null
    return cleaned


def process_document(
    image_data: bytes,
    user_id: str,
    mime_type: str = "image/jpeg",
) -> dict[str, Any]:
    """Full pipeline: OCR extract → schema map → DB upsert → return summary.

    Image bytes are NOT persisted — privacy by design.

    Returns dict with:
      - document_type: what kind of document was detected
      - raw_extraction: everything OCR found (for display/review)
      - mapped_fields: what was mapped to our schema
      - fields_written: count of fields written to DB
      - sections_updated: which schema sections got new data
    """
    raw = ocr_extract(image_data, mime_type)
    mapped = map_to_schema(raw)
    fields_count = sum(len(fields) for fields in mapped.values())

    sections = list(mapped.keys())

    if mapped:
        db = get_db()
        try:
            upsert_from_extraction(db, user_id, mapped)
            save_document_upload(db, user_id, raw.get("document_type", "unknown"),
                                sections, fields_count)
        finally:
            db.close()

    return {
        "document_type": raw.get("document_type", "unknown"),
        "raw_extraction": raw,
        "mapped_fields": mapped,
        "fields_written": fields_count,
        "sections_updated": sections,
    }


def process_document_file(file_path: str | Path, user_id: str) -> dict[str, Any]:
    """Convenience: read a file from disk → process_document."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document not found: {path}")

    mime_type = _MIME_MAP.get(path.suffix.lower(), "image/jpeg")
    return process_document(path.read_bytes(), user_id, mime_type)
