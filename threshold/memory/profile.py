from __future__ import annotations

import os
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from .encryption import decrypt_file, encrypt_file

DATA_DIR = Path(os.getenv("THRESHOLD_DATA_DIR", "./data"))
PROFILE_PATH = DATA_DIR / "profile" / "structured_profile.json.enc"


class PersonalContext(BaseModel):
    name: Optional[str] = None
    age_range: str = ""
    gender_identity: Optional[str] = None
    home_state: str = ""
    release_date: str = ""
    time_served: str = ""
    offense_category: Literal["non-violent", "violent", "drug", "financial", "other"] = "other"
    comfort_with_technology: str = "moderate"


class SituationContext(BaseModel):
    housing_status: Literal["housed", "shelter", "couch_surfing", "unhoused", "unknown"] = "unknown"
    employment_status: str = "unemployed"
    benefits_enrolled: list[str] = Field(default_factory=list)
    supervision_type: Literal["none", "probation", "parole", "supervised_release"] = "none"
    supervision_end_date: Optional[str] = None
    immediate_needs: list[str] = Field(default_factory=list)


class GoalsContext(BaseModel):
    short_term_goals: list[str] = Field(default_factory=list)
    long_term_goals: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    concerns: list[str] = Field(default_factory=list)


class SupportContext(BaseModel):
    has_case_worker: bool = False
    case_worker_name: Optional[str] = None
    support_contacts: list[str] = Field(default_factory=list)
    trusted_people: list[str] = Field(default_factory=list)


class PreferenceContext(BaseModel):
    communication_style: Literal["direct", "gentle", "informational"] = "direct"
    check_in_frequency: Literal["daily", "weekly", "as_needed"] = "weekly"
    wants_reminders: bool = True
    privacy_level: Literal["high", "medium", "low"] = "high"


class UserProfile(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid4()))
    created_at: datetime = Field(default_factory=datetime.now)
    last_updated: datetime = Field(default_factory=datetime.now)
    personal: PersonalContext = Field(default_factory=PersonalContext)
    situation: SituationContext = Field(default_factory=SituationContext)
    goals: GoalsContext = Field(default_factory=GoalsContext)
    support: SupportContext = Field(default_factory=SupportContext)
    preferences: PreferenceContext = Field(default_factory=PreferenceContext)


def save_profile(profile: UserProfile) -> None:
    profile.last_updated = datetime.now()
    encrypt_file(profile.model_dump(mode="json"), PROFILE_PATH)


def load_profile() -> UserProfile | None:
    if not PROFILE_PATH.exists():
        return None
    try:
        data = decrypt_file(PROFILE_PATH)
        return UserProfile.model_validate(data)
    except Exception:
        return None


def profile_exists() -> bool:
    return PROFILE_PATH.exists()
