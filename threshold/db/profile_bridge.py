"""Bridge between Pydantic UserProfile shape and the SQLite DB.

Provides:
  - load_profile_from_db()  → returns a UserProfile Pydantic object from the DB
  - update_field_in_db()    → maps agent dot-notation paths to DB table.column writes
  - FIELD_REGISTRY          → the dot-path → (section, column) mapping
"""
from __future__ import annotations

import json
import logging
import os
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from ..memory.profile import (
    AssetDetail,
    FinancialContext,
    GoalsContext,
    HouseholdMember,
    HousingExpenses,
    IncomeDetail,
    PersonalContext,
    PreferenceContext,
    SituationContext,
    SupportContext,
    UserProfile,
)
from .crud import get_full_profile, upsert_fields

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Field registry: maps Pydantic dot paths → (DB section, DB column)
#
# The agent calls update_profile_field("situation.housing_status", "shelter").
# This registry tells us that maps to upsert_fields(db, uid, "housing", {"housing_status": "shelter"}).
# ---------------------------------------------------------------------------

FIELD_REGISTRY: dict[str, tuple[str, str]] = {
    # personal.* → identity table
    "personal.name": ("identity", "legal_name"),
    "personal.first_name": ("identity", "first_name"),
    "personal.last_name": ("identity", "last_name"),
    "personal.date_of_birth": ("identity", "date_of_birth"),
    "personal.address": ("identity", "current_address"),
    "personal.city": ("identity", "city"),
    "personal.zip_code": ("identity", "zip_code"),
    "personal.phone": ("identity", "phone_number"),
    "personal.email": ("identity", "email"),
    "personal.height": ("identity", "height"),
    "personal.eye_color": ("identity", "eye_color"),
    "personal.gender": ("identity", "gender"),
    "personal.gender_identity": ("identity", "gender_identity"),
    "personal.age_range": ("identity", "age_range"),
    "personal.home_state": ("identity", "state_of_release"),
    "personal.release_date": ("identity", "release_date"),
    "personal.time_served": ("identity", "time_served"),
    "personal.offense_category": ("identity", "offense_category"),
    "personal.comfort_with_technology": ("preferences", "comfort_with_technology"),
    # situation.* → various tables
    "situation.housing_status": ("housing", "housing_status"),
    "situation.employment_status": ("employment", "employment_status"),
    "situation.benefits_enrolled": ("benefits", "benefits_enrolled"),
    "situation.supervision_type": ("supervision", "supervision_type"),
    "situation.supervision_end_date": ("supervision", "supervision_end_date"),
    "situation.immediate_needs": ("preferences", "immediate_needs"),
    # goals.* → goals table
    "goals.short_term_goals": ("goals", "short_term_goals"),
    "goals.long_term_goals": ("goals", "long_term_goals"),
    "goals.values": ("goals", "values"),
    "goals.strengths": ("goals", "strengths"),
    "goals.concerns": ("goals", "concerns"),
    # support.* → support table
    "support.has_case_worker": ("support", "has_case_worker"),
    "support.case_worker_name": ("support", "case_worker_name"),
    "support.support_contacts": ("support", "support_contacts"),
    "support.trusted_people": ("support", "trusted_people"),
    # preferences.* → preferences table
    "preferences.communication_style": ("preferences", "communication_style"),
    "preferences.check_in_frequency": ("preferences", "check_in_frequency"),
    "preferences.wants_reminders": ("preferences", "wants_reminders"),
    "preferences.privacy_level": ("preferences", "privacy_level"),
    # financial.* → financial table (top-level scalars)
    "financial.household_size": ("financial", "household_size"),
    "financial.num_dependents_under_19": ("financial", "num_dependents_under_19"),
    "financial.is_employed": ("financial", "is_employed"),
    "financial.has_worked_in_past_5_years": ("financial", "has_worked_in_past_5_years"),
    "financial.is_caregiver": ("financial", "is_caregiver"),
    "financial.child_support_paid": ("financial", "child_support_paid"),
    "financial.dependent_care_costs": ("financial", "dependent_care_costs"),
    "financial.medical_expenses_elderly_disabled": ("financial", "medical_expenses_elderly_disabled"),
    "financial.has_received_cash_assistance": ("financial", "has_received_cash_assistance"),
}

DEFAULT_USER_ID = os.getenv("THRESHOLD_USER_ID", "default-user")


_VALID_HOUSING = {"housed", "shelter", "couch_surfing", "unhoused", "unknown"}
_HOUSING_MAP = {
    "stable": "housed", "family": "housed", "friends": "couch_surfing",
    "transitional": "shelter", "halfway_house": "shelter",
    "sober_living": "shelter", "hotel": "shelter", "motel": "shelter",
    "street": "unhoused", "car": "unhoused", "tent": "unhoused",
    "none": "unhoused",
}


def _normalize_housing(val: Any) -> str:
    if not val:
        return "unknown"
    v = str(val).strip().lower()
    if v in _VALID_HOUSING:
        return v
    return _HOUSING_MAP.get(v, "unknown")


def _parse_json_list(val: Any) -> list:
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return []
    return []


def _parse_json_dict(val: Any) -> dict:
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return {}
    return {}


def load_profile_from_db(db: Session, user_id: str | None = None) -> UserProfile | None:
    """Load the user profile from the DB and return it as a Pydantic UserProfile."""
    uid = user_id or DEFAULT_USER_ID
    full = get_full_profile(db, uid)

    # Check if we have any data at all
    has_data = any(
        any(v is not None for k, v in section.items() if k not in ("id", "user_id", "created_at", "updated_at"))
        for section in full.values()
        if section
    )
    if not has_data:
        return None

    ident = full.get("identity") or {}
    housing = full.get("housing") or {}
    employment = full.get("employment") or {}
    supervision = full.get("supervision") or {}
    benefits = full.get("benefits") or {}
    prefs = full.get("preferences") or {}
    goals = full.get("goals") or {}
    support = full.get("support") or {}
    financial = full.get("financial") or {}

    return UserProfile(
        user_id=uid,
        created_at=ident.get("created_at") or datetime.now(),
        last_updated=ident.get("updated_at") or datetime.now(),
        personal=PersonalContext(
            name=ident.get("legal_name") or "",
            first_name=ident.get("first_name"),
            last_name=ident.get("last_name"),
            date_of_birth=str(ident["date_of_birth"]) if ident.get("date_of_birth") else None,
            address=ident.get("current_address"),
            city=ident.get("city"),
            zip_code=ident.get("zip_code"),
            phone=ident.get("phone_number"),
            email=ident.get("email"),
            height=ident.get("height"),
            eye_color=ident.get("eye_color"),
            gender=ident.get("gender"),
            gender_identity=ident.get("gender_identity"),
            age_range=ident.get("age_range") or "",
            home_state=ident.get("state_of_release") or "",
            release_date=ident.get("release_date") or "",
            time_served=ident.get("time_served") or "",
            offense_category=ident.get("offense_category") or "Unknown",
            comfort_with_technology=prefs.get("comfort_with_technology") or "moderate",
        ),
        situation=SituationContext(
            housing_status=housing.get("housing_status") or "Unknown",
            employment_status=employment.get("employment_status") or "Unknown",
            benefits_enrolled=_parse_json_list(benefits.get("benefits_enrolled")),
            supervision_type=supervision.get("supervision_type") or "Unknown",
            supervision_end_date=str(supervision["supervision_end_date"]) if supervision.get("supervision_end_date") else None,
            immediate_needs=_parse_json_list(prefs.get("immediate_needs")),
        ),
        goals=GoalsContext(
            short_term_goals=_parse_json_list(goals.get("short_term_goals")),
            long_term_goals=_parse_json_list(goals.get("long_term_goals")),
            values=_parse_json_list(goals.get("values")),
            strengths=_parse_json_list(goals.get("strengths")),
            concerns=_parse_json_list(goals.get("concerns")),
        ),
        support=SupportContext(
            has_case_worker=bool(support.get("has_case_worker")),
            case_worker_name=support.get("case_worker_name"),
            support_contacts=_parse_json_list(support.get("support_contacts")),
            trusted_people=_parse_json_list(support.get("trusted_people")),
        ),
        preferences=PreferenceContext(
            communication_style=prefs.get("communication_style") or "direct",
            check_in_frequency=prefs.get("check_in_frequency") or "weekly",
            wants_reminders=prefs.get("wants_reminders") if prefs.get("wants_reminders") is not None else True,
            privacy_level=prefs.get("privacy_level") or "high",
        ),
        financial=FinancialContext(
            household_size=financial.get("household_size") or 1,
            household_members=[HouseholdMember(**m) for m in _parse_json_list(financial.get("household_members"))],
            num_dependents_under_19=financial.get("num_dependents_under_19") or 0,
            is_employed=bool(financial.get("is_employed")),
            has_worked_in_past_5_years=bool(financial.get("has_worked_in_past_5_years")),
            is_caregiver=bool(financial.get("is_caregiver")),
            income=IncomeDetail(**_parse_json_dict(financial.get("income"))),
            child_support_paid=financial.get("child_support_paid") or 0.0,
            dependent_care_costs=financial.get("dependent_care_costs") or 0.0,
            medical_expenses_elderly_disabled=financial.get("medical_expenses_elderly_disabled") or 0.0,
            housing=HousingExpenses(**_parse_json_dict(financial.get("housing_expenses"))),
            assets=AssetDetail(**_parse_json_dict(financial.get("assets"))),
            has_received_cash_assistance=bool(financial.get("has_received_cash_assistance")),
        ),
    )


def update_field_in_db(db: Session, field_path: str, value: str, user_id: str | None = None) -> str:
    """Update a profile field in the DB using Pydantic dot-notation path.

    Returns a status message string (for the agent tool).
    """
    uid = user_id or DEFAULT_USER_ID

    if field_path in FIELD_REGISTRY:
        section, column = FIELD_REGISTRY[field_path]
        upsert_fields(db, uid, section, {column: value})
        return f"Updated {field_path} to: {value}"

    # Handle nested financial paths like "financial.income.job_income_monthly"
    parts = field_path.split(".")
    if len(parts) == 3 and parts[0] == "financial":
        sub_obj, sub_field = parts[1], parts[2]
        if sub_obj in ("income", "housing", "assets", "household_members"):
            # Read current JSON, update the field, write back
            full = get_full_profile(db, uid)
            fin = full.get("financial") or {}
            col_map = {"income": "income", "housing": "housing_expenses", "assets": "assets"}
            col = col_map.get(sub_obj, sub_obj)
            current = _parse_json_dict(fin.get(col))
            current[sub_field] = _coerce_value(value)
            upsert_fields(db, uid, "financial", {col: json.dumps(current)})
            return f"Updated {field_path} to: {value}"

    return f"Unknown field path: {field_path}. Use format like 'personal.name' or 'situation.housing_status'."


def _coerce_value(value: str) -> Any:
    """Try to coerce string values to appropriate types."""
    if value.lower() in ("true", "false"):
        return value.lower() == "true"
    try:
        return float(value)
    except ValueError:
        return value
