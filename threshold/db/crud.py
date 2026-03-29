"""CRUD operations for the fixed schema.

All functions accept a SQLAlchemy Session. The caller manages the session
lifecycle (get_db() -> use -> session.close()).
"""
from __future__ import annotations

import json
from datetime import date, datetime, time
from typing import Any, Literal

from sqlalchemy import inspect as sa_inspect
from sqlalchemy.orm import Session

from .models import (
    BenefitsProfile,
    DocumentUpload,
    EmploymentProfile,
    HealthProfile,
    HousingApplication,
    HousingProfile,
    SupervisionProfile,
    UserDocuments,
    UserIdentity,
    UserPreferences,
)

TABLE_MAP: dict[str, type] = {
    "identity": UserIdentity,
    "documents": UserDocuments,
    "supervision": SupervisionProfile,
    "housing": HousingProfile,
    "employment": EmploymentProfile,
    "health": HealthProfile,
    "benefits": BenefitsProfile,
    "preferences": UserPreferences,
}

_JSON_FIELDS = {
    "documents_in_hand", "documents_needed", "documents_pending",
    "certifications", "trade_skills",
    "chronic_conditions", "current_medications", "mental_health_diagnoses",
    "benefits_enrolled", "benefits_applied_pending",
}

# ---------------------------------------------------------------------------
# Field priority tiers
#
# critical:  Without these the subagents can't do their basic job. The
#            interview agent should try hard to get these.
# important: Makes subagents significantly more effective. Interview should
#            cover these if the person is comfortable.
# optional:  Nice to have. Can be filled over time through normal usage.
#
# Organized as section -> field -> priority.
# Fields not listed here default to "optional".
# ---------------------------------------------------------------------------

FIELD_PRIORITY: dict[str, dict[str, Literal["critical", "important", "optional"]]] = {
    "identity": {
        "legal_name": "critical",
        "state_of_release": "critical",
        "date_of_birth": "important",
        "phone_number": "important",
        "current_address": "important",
        "gender_identity": "important",
        "ssn_encrypted": "optional",
        "mailing_address": "optional",
        "preferred_language": "optional",
    },
    "documents": {
        "documents_in_hand": "important",
        "documents_needed": "important",
        "documents_pending": "optional",
    },
    "supervision": {
        "supervision_type": "critical",
        "supervision_end_date": "critical",
        "po_name": "critical",
        "next_reporting_date": "critical",
        "reporting_frequency": "important",
        "curfew_start": "important",
        "curfew_end": "important",
        "drug_testing_required": "important",
        "electronic_monitoring": "important",
        "geographic_restrictions": "important",
        "mandatory_treatment": "important",
        "restitution_owed": "important",
        "po_phone": "optional",
        "drug_testing_frequency": "optional",
        "geographic_restrictions_detail": "optional",
        "no_contact_orders": "optional",
        "no_contact_orders_detail": "optional",
        "mandatory_treatment_detail": "optional",
        "restitution_amount": "optional",
        "outstanding_fines": "optional",
        "outstanding_fines_amount": "optional",
    },
    "housing": {
        "housing_status": "critical",
        "returning_to_housing_with": "important",
        "sex_offender_registry": "important",
        "eviction_history": "important",
        "sex_offender_registry_tier": "optional",
        "accessibility_needs": "optional",
    },
    "employment": {
        "employment_status": "critical",
        "felony_category": "critical",
        "has_valid_drivers_license": "important",
        "has_ged_or_diploma": "important",
        "trade_skills": "important",
        "certifications": "important",
        "college_completed": "optional",
        "physical_limitations": "optional",
        "physical_limitations_detail": "optional",
    },
    "health": {
        "current_medications": "critical",
        "has_active_medicaid": "critical",
        "disability_status": "important",
        "chronic_conditions": "important",
        "substance_use_disorder_diagnosis": "important",
        "insurance_gap": "important",
        "disability_type": "optional",
        "mental_health_diagnoses": "optional",
    },
    "benefits": {
        "benefits_enrolled": "critical",
        "veteran_status": "important",
        "child_support_obligations": "important",
        "benefits_applied_pending": "optional",
        "child_support_amount_monthly": "optional",
    },
    "preferences": {
        "communication_style": "important",
        "comfort_with_technology": "important",
        "check_in_frequency": "optional",
        "wants_reminders": "optional",
        "privacy_level": "optional",
        "literacy_concerns": "optional",
    },
}

# Human-readable descriptions of what each field means, used when building
# interview context so the agent knows *why* it's asking.
FIELD_DESCRIPTIONS: dict[str, dict[str, str]] = {
    "identity": {
        "legal_name": "Full legal name",
        "date_of_birth": "Date of birth",
        "current_address": "Where they're currently staying",
        "phone_number": "Phone number",
        "gender_identity": "Gender identity (for matching gender-specific programs)",
        "state_of_release": "State they were released in (drives resource lookups)",
    },
    "supervision": {
        "supervision_type": "Type of supervision (probation, parole, supervised release, or none)",
        "supervision_end_date": "When supervision ends",
        "po_name": "Parole/probation officer's name",
        "next_reporting_date": "Next required check-in date",
        "reporting_frequency": "How often they report (weekly, biweekly, monthly)",
        "curfew_start": "Curfew start time (filters job options)",
        "curfew_end": "Curfew end time",
        "drug_testing_required": "Whether drug testing is required",
        "electronic_monitoring": "Whether they're on electronic monitoring",
        "geographic_restrictions": "Whether there are geographic/travel restrictions",
        "mandatory_treatment": "Whether court-ordered treatment is required",
        "restitution_owed": "Whether restitution is owed",
    },
    "housing": {
        "housing_status": "Current housing situation (stable, shelter, unhoused, etc.)",
        "returning_to_housing_with": "Who they're living with (family, alone, shelter)",
        "sex_offender_registry": "Whether on the sex offender registry (hard-filters housing programs)",
        "eviction_history": "Prior evictions (affects rental eligibility)",
    },
    "employment": {
        "employment_status": "Current employment status",
        "felony_category": "Offense category (affects ban-the-box, licensing, benefits eligibility)",
        "has_valid_drivers_license": "Valid driver's license (gates many jobs)",
        "has_ged_or_diploma": "GED or high school diploma (gates training programs)",
        "trade_skills": "Trade skills (carpentry, welding, electrical, etc.)",
        "certifications": "Professional certifications (CDL, HVAC, ServSafe, etc.)",
    },
    "health": {
        "current_medications": "Current medications — lapse after release is a crisis trigger",
        "has_active_medicaid": "Whether Medicaid is currently active",
        "disability_status": "Whether they have a disability (affects SSI/SSDI and housing)",
        "chronic_conditions": "Ongoing health conditions",
        "substance_use_disorder_diagnosis": "SUD diagnosis (affects treatment program eligibility)",
        "insurance_gap": "Whether insurance lapsed during incarceration",
    },
    "benefits": {
        "benefits_enrolled": "Benefits currently receiving (SNAP, SSI, Medicaid, etc.)",
        "veteran_status": "Veteran status (unlocks VA benefits)",
        "child_support_obligations": "Whether child support is owed",
    },
    "preferences": {
        "communication_style": "Preferred communication style (direct, gentle, informational)",
        "comfort_with_technology": "How comfortable they are with technology",
    },
}


def _get_priority(section: str, field: str) -> str:
    return FIELD_PRIORITY.get(section, {}).get(field, "optional")


def _coerce_value(model_cls: type, column_name: str, value: Any) -> Any:
    """Coerce JSON-typed values to the Python types SQLAlchemy expects.

    OCR and mapping always produce JSON primitives (strings, numbers, bools).
    SQLAlchemy Date/Time columns need actual date/time objects.
    """
    if value is None:
        return None

    mapper = sa_inspect(model_cls)
    col = mapper.columns.get(column_name)
    if col is None:
        return value

    col_type = type(col.type)

    from sqlalchemy import Date, Time, Boolean, Float

    if col_type is Date and isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    if col_type is Time and isinstance(value, str):
        try:
            return time.fromisoformat(value)
        except ValueError:
            return None

    if col_type is Boolean and isinstance(value, str):
        return value.lower() in ("true", "yes", "1")

    if col_type is Float and isinstance(value, str):
        try:
            return float(value.replace(",", "").replace("$", ""))
        except ValueError:
            return None

    return value


def _ensure_row(db: Session, model_cls: type, user_id: str):
    """Return existing row for user_id or create a new one."""
    if model_cls is UserIdentity:
        row = db.query(model_cls).filter_by(id=user_id).first()
        if not row:
            row = model_cls(id=user_id)
            db.add(row)
            db.flush()
    else:
        row = db.query(model_cls).filter_by(user_id=user_id).first()
        if not row:
            row = model_cls(user_id=user_id)
            db.add(row)
            db.flush()
    return row


def upsert_fields(db: Session, user_id: str, section: str, fields: dict[str, Any]) -> None:
    """Update specific fields in a schema section. Creates the row if needed.

    Args:
        db: Active SQLAlchemy session.
        user_id: The user's UUID.
        section: One of the TABLE_MAP keys (identity, documents, supervision, ...).
        fields: Dict of column_name → value to set.
    """
    model_cls = TABLE_MAP.get(section)
    if not model_cls:
        raise ValueError(f"Unknown schema section: {section}. Valid: {list(TABLE_MAP.keys())}")

    row = _ensure_row(db, model_cls, user_id)

    for col, value in fields.items():
        if not hasattr(row, col):
            continue
        if col in _JSON_FIELDS and isinstance(value, (list, dict)):
            value = json.dumps(value)
        else:
            value = _coerce_value(model_cls, col, value)
        setattr(row, col, value)

    row.updated_at = datetime.now()
    db.commit()


def upsert_from_extraction(db: Session, user_id: str, extracted: dict[str, dict[str, Any]]) -> None:
    """Bulk upsert from a structured extraction result (e.g., from OCR).

    Args:
        extracted: Dict of section_name → {field: value, ...}
                   e.g. {"identity": {"legal_name": "John"}, "supervision": {"po_name": "Smith"}}
    """
    for section, fields in extracted.items():
        if fields:
            upsert_fields(db, user_id, section, fields)


def get_section(db: Session, user_id: str, section: str) -> dict[str, Any]:
    """Read all fields from a schema section as a dict.

    Always returns a dict with every field — uses None for unpopulated fields
    even when no row exists yet. This ensures missing-field checks work
    for sections that haven't been written to.
    """
    model_cls = TABLE_MAP.get(section)
    if not model_cls:
        raise ValueError(f"Unknown schema section: {section}")

    skip = {"id", "user_id", "created_at", "updated_at"}
    all_columns = [c.name for c in model_cls.__table__.columns if c.name not in skip]

    if model_cls is UserIdentity:
        row = db.query(model_cls).filter_by(id=user_id).first()
    else:
        row = db.query(model_cls).filter_by(user_id=user_id).first()

    if not row:
        return {name: None for name in all_columns}

    result = {}
    for name in all_columns:
        val = getattr(row, name)
        if name in _JSON_FIELDS and isinstance(val, str):
            try:
                val = json.loads(val)
            except json.JSONDecodeError:
                pass
        result[name] = val
    return result


def get_full_profile(db: Session, user_id: str) -> dict[str, dict[str, Any]]:
    """Read the entire fixed schema for a user, organized by section."""
    return {section: get_section(db, user_id, section) for section in TABLE_MAP}


def get_completion_status(db: Session, user_id: str) -> dict[str, dict[str, bool]]:
    """Check which fields are populated across all sections.

    Returns a dict of section → {field_name: is_populated}.
    """
    profile = get_full_profile(db, user_id)
    status = {}
    for section, fields in profile.items():
        section_status = {}
        for field_name, value in fields.items():
            if value is None:
                populated = False
            elif isinstance(value, str) and value in ("", "[]"):
                populated = False
            elif isinstance(value, list) and len(value) == 0:
                populated = False
            else:
                populated = True
            section_status[field_name] = populated
        status[section] = section_status
    return status


def get_completion_summary(db: Session, user_id: str) -> dict[str, Any]:
    """High-level completion summary for display or agent context."""
    status = get_completion_status(db, user_id)

    total = 0
    filled = 0
    by_section = {}

    for section, fields in status.items():
        section_total = len(fields)
        section_filled = sum(1 for v in fields.values() if v)
        total += section_total
        filled += section_filled
        by_section[section] = {
            "filled": section_filled,
            "total": section_total,
            "missing": [f for f, v in fields.items() if not v],
        }

    return {
        "overall_pct": round(filled / total * 100, 1) if total > 0 else 0,
        "filled": filled,
        "total": total,
        "by_section": by_section,
    }


def user_exists(db: Session, user_id: str) -> bool:
    return db.query(UserIdentity).filter_by(id=user_id).first() is not None


def create_user(db: Session, user_id: str | None = None) -> str:
    """Create a new user with empty profile. Returns the user_id."""
    from uuid import uuid4
    uid = user_id or str(uuid4())
    identity = UserIdentity(id=uid)
    db.add(identity)
    db.commit()
    return uid


# ---------------------------------------------------------------------------
# Missing-field queries
# ---------------------------------------------------------------------------

def get_missing_by_priority(
    db: Session,
    user_id: str,
    priority: Literal["critical", "important", "optional"] | None = None,
) -> dict[str, list[str]]:
    """Get missing (unpopulated) fields, optionally filtered by priority.

    Returns dict of section -> [field_name, ...].
    """
    status = get_completion_status(db, user_id)
    result: dict[str, list[str]] = {}

    for section, fields in status.items():
        missing = []
        for field_name, is_populated in fields.items():
            if is_populated:
                continue
            field_prio = _get_priority(section, field_name)
            if priority is None or field_prio == priority:
                missing.append(field_name)
        if missing:
            result[section] = missing

    return result


def get_missing_critical(db: Session, user_id: str) -> dict[str, list[str]]:
    """Shortcut: get all missing critical fields."""
    return get_missing_by_priority(db, user_id, "critical")


def get_missing_important(db: Session, user_id: str) -> dict[str, list[str]]:
    """Shortcut: get all missing important fields."""
    return get_missing_by_priority(db, user_id, "important")


def get_populated_fields(db: Session, user_id: str) -> dict[str, dict[str, Any]]:
    """Get all populated fields with their current values.

    Useful for showing the user what we already know (e.g. after OCR).
    Returns dict of section -> {field: value} for non-null fields only.
    """
    profile = get_full_profile(db, user_id)
    populated = {}
    for section, fields in profile.items():
        non_null = {}
        for field_name, value in fields.items():
            if value is None:
                continue
            if isinstance(value, str) and value in ("", "[]"):
                continue
            if isinstance(value, list) and len(value) == 0:
                continue
            non_null[field_name] = value
        if non_null:
            populated[section] = non_null
    return populated


def get_intake_status(db: Session, user_id: str) -> dict[str, Any]:
    """Comprehensive intake status for the interview pipeline.

    Returns everything the interview agent and frontend need to understand
    where things stand: what's filled, what's missing by priority tier,
    and human-readable descriptions for missing fields.
    """
    missing_critical = get_missing_critical(db, user_id)
    missing_important = get_missing_important(db, user_id)
    populated = get_populated_fields(db, user_id)
    summary = get_completion_summary(db, user_id)

    # Build human-readable missing-field lists with descriptions
    critical_with_desc = {}
    for section, fields in missing_critical.items():
        section_desc = FIELD_DESCRIPTIONS.get(section, {})
        critical_with_desc[section] = [
            {"field": f, "description": section_desc.get(f, f)}
            for f in fields
        ]

    important_with_desc = {}
    for section, fields in missing_important.items():
        section_desc = FIELD_DESCRIPTIONS.get(section, {})
        important_with_desc[section] = [
            {"field": f, "description": section_desc.get(f, f)}
            for f in fields
        ]

    return {
        "overall_pct": summary["overall_pct"],
        "populated": populated,
        "missing_critical": critical_with_desc,
        "missing_important": important_with_desc,
        "critical_count": sum(len(v) for v in missing_critical.values()),
        "important_count": sum(len(v) for v in missing_important.values()),
    }


# ---------------------------------------------------------------------------
# Housing application tracking
# ---------------------------------------------------------------------------

_HOUSING_DATE_FIELDS = {"follow_up_date", "deadline", "interview_date"}


def _parse_date_optional(val: str | None) -> date | None:
    if not val:
        return None
    try:
        return date.fromisoformat(val)
    except (ValueError, TypeError):
        return None


def upsert_housing_application(
    db: Session,
    user_id: str,
    program: str,
    status: str,
    notes: str = "",
    **kwargs: Any,
) -> dict:
    """Create or update a housing application (fuzzy-match by program name).

    Returns the application as a plain dict.
    """
    # Fuzzy match: case-insensitive program name
    existing = (
        db.query(HousingApplication)
        .filter(
            HousingApplication.user_id == user_id,
            HousingApplication.program.ilike(program),
        )
        .first()
    )

    if existing:
        old_status = existing.status
        existing.append_history(old_status, status, notes)
        existing.status = status
        existing.updated_at = datetime.now()
        if notes:
            existing.notes = notes
        # Update optional fields if provided
        for key in (
            "follow_up_date", "contact_name", "contact_phone", "application_url",
            "deadline", "interview_date", "interview_time", "interview_location",
            "denial_reason", "documents_submitted", "housing_type",
        ):
            val = kwargs.get(key)
            if val:
                if key in _HOUSING_DATE_FIELDS:
                    setattr(existing, key, _parse_date_optional(val))
                else:
                    setattr(existing, key, val)
        db.commit()
        return existing.to_dict()

    # Create new
    app = HousingApplication(user_id=user_id, program=program, status=status, notes=notes)
    for key in (
        "follow_up_date", "contact_name", "contact_phone", "application_url",
        "deadline", "interview_date", "interview_time", "interview_location",
        "denial_reason", "documents_submitted", "housing_type",
    ):
        val = kwargs.get(key)
        if val:
            if key in _HOUSING_DATE_FIELDS:
                setattr(app, key, _parse_date_optional(val))
            else:
                setattr(app, key, val)
    db.add(app)
    db.commit()
    return app.to_dict()


def get_housing_applications(db: Session, user_id: str) -> list[dict]:
    """Get all housing applications for a user, ordered by updated_at desc."""
    rows = (
        db.query(HousingApplication)
        .filter_by(user_id=user_id)
        .order_by(HousingApplication.updated_at.desc())
        .all()
    )
    return [r.to_dict() for r in rows]


def get_housing_application_by_id(db: Session, app_id: str) -> dict | None:
    """Get a single housing application by its ID."""
    row = db.query(HousingApplication).filter_by(id=app_id).first()
    return row.to_dict() if row else None


def update_housing_application(db: Session, app_id: str, fields: dict[str, Any]) -> dict | None:
    """Update a housing application by ID with partial fields.

    Returns the updated application as a dict, or None if not found.
    """
    row = db.query(HousingApplication).filter_by(id=app_id).first()
    if not row:
        return None

    # Track status change in history
    new_status = fields.get("status")
    if new_status and new_status != row.status:
        row.append_history(row.status, new_status, fields.get("notes", ""))

    for key, val in fields.items():
        if key in _HOUSING_DATE_FIELDS:
            setattr(row, key, _parse_date_optional(val))
        else:
            setattr(row, key, val)

    row.updated_at = datetime.now()
    db.commit()
    return row.to_dict()


def delete_housing_application(db: Session, app_id: str) -> bool:
    """Delete a housing application by ID. Returns True if deleted, False if not found."""
    row = db.query(HousingApplication).filter_by(id=app_id).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True
