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


class HouseholdMember(BaseModel):
    relationship: str = ""  # "self", "child", "spouse", "parent", etc.
    age: Optional[int] = None
    is_permanently_disabled: bool = False
    is_temporarily_disabled: bool = False
    is_blind: bool = False
    is_highschool_student: bool = False


class IncomeDetail(BaseModel):
    job_income_monthly: float = 0.0
    ssi: float = 0.0
    social_security: float = 0.0
    child_support_received: float = 0.0
    unemployment: float = 0.0
    interest_dividends: float = 0.0
    rental_income: float = 0.0
    alimony: float = 0.0
    veterans_benefits: float = 0.0
    workers_comp: float = 0.0
    pensions: float = 0.0
    other_income: float = 0.0


class HousingExpenses(BaseModel):
    rent_or_mortgage: float = 0.0
    separate_heating: bool = False
    separate_cooling: bool = False
    separate_telephone: bool = False


class AssetDetail(BaseModel):
    savings: float = 0.0
    checking: float = 0.0
    cash_on_hand: float = 0.0
    stocks_bonds_cds: float = 0.0
    retirement_accounts: float = 0.0
    other_assets: float = 0.0


class FinancialContext(BaseModel):
    household_size: int = 1
    household_members: list[HouseholdMember] = Field(default_factory=list)
    num_dependents_under_19: int = 0
    is_employed: bool = False
    has_worked_in_past_5_years: bool = False
    is_caregiver: bool = False
    income: IncomeDetail = Field(default_factory=IncomeDetail)
    child_support_paid: float = 0.0
    dependent_care_costs: float = 0.0
    medical_expenses_elderly_disabled: float = 0.0
    housing: HousingExpenses = Field(default_factory=HousingExpenses)
    assets: AssetDetail = Field(default_factory=AssetDetail)
    has_received_cash_assistance: bool = False


class PersonalContext(BaseModel):
    name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[str] = None  # MM/DD/YYYY
    address: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    height: Optional[str] = None  # e.g., "5'10"
    eye_color: Optional[str] = None  # e.g., "Brown"
    gender: Optional[str] = None  # e.g., "Male"
    phone: Optional[str] = None
    email: Optional[str] = None
    age_range: str = ""
    gender_identity: Optional[str] = None
    home_state: str = ""
    release_date: str = ""
    time_served: str = ""
    offense_category: str = "Unknown"
    comfort_with_technology: str = "moderate"


class SituationContext(BaseModel):
    housing_status: str = "Unknown"
    employment_status: str = "Unknown"
    benefits_enrolled: list[str] = Field(default_factory=list)
    supervision_type: str = "Unknown"
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
    financial: FinancialContext = Field(default_factory=FinancialContext)


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
