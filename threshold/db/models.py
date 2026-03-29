"""SQLAlchemy models for the fixed schema.

Maps directly to the schema tables in interview/info_collection.md.
Sensitive fields (SSN) are encrypted at the application layer via Fernet
before storage — see crud.py.
"""
from __future__ import annotations

import json
from datetime import date, datetime, time
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, Date, DateTime, Float, String, Text, Time
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UserIdentity(Base):
    __tablename__ = "user_identity"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    legal_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    ssn_encrypted: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    current_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    mailing_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    gender_identity: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    state_of_release: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    preferred_language: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="en")


class UserDocuments(Base):
    __tablename__ = "user_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Stored as JSON arrays: ["state_id", "birth_cert", "ss_card", ...]
    documents_in_hand: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    documents_needed: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    # JSON array of {document, action_taken, expected_date}
    documents_pending: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")

    def get_in_hand(self) -> list[str]:
        return json.loads(self.documents_in_hand or "[]")

    def set_in_hand(self, docs: list[str]) -> None:
        self.documents_in_hand = json.dumps(docs)

    def get_needed(self) -> list[str]:
        return json.loads(self.documents_needed or "[]")

    def set_needed(self, docs: list[str]) -> None:
        self.documents_needed = json.dumps(docs)

    def get_pending(self) -> list[dict]:
        return json.loads(self.documents_pending or "[]")

    def set_pending(self, pending: list[dict]) -> None:
        self.documents_pending = json.dumps(pending)


class SupervisionProfile(Base):
    __tablename__ = "supervision_profile"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    supervision_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    supervision_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    po_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    po_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    next_reporting_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    reporting_frequency: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    curfew_start: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    curfew_end: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    drug_testing_required: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    drug_testing_frequency: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    electronic_monitoring: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    geographic_restrictions: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    geographic_restrictions_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    no_contact_orders: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    no_contact_orders_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mandatory_treatment: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    mandatory_treatment_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    restitution_owed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    restitution_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    outstanding_fines: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    outstanding_fines_amount: Mapped[Optional[float]] = mapped_column(Float, nullable=True)


class HousingProfile(Base):
    __tablename__ = "housing_profile"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    housing_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    returning_to_housing_with: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    sex_offender_registry: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    sex_offender_registry_tier: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    eviction_history: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    accessibility_needs: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)


class EmploymentProfile(Base):
    __tablename__ = "employment_profile"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    employment_status: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    has_valid_drivers_license: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    has_ged_or_diploma: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    college_completed: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    # JSON arrays
    certifications: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    trade_skills: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    physical_limitations: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    physical_limitations_detail: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    felony_category: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    def get_certifications(self) -> list[str]:
        return json.loads(self.certifications or "[]")

    def set_certifications(self, certs: list[str]) -> None:
        self.certifications = json.dumps(certs)

    def get_trade_skills(self) -> list[str]:
        return json.loads(self.trade_skills or "[]")

    def set_trade_skills(self, skills: list[str]) -> None:
        self.trade_skills = json.dumps(skills)


class HealthProfile(Base):
    __tablename__ = "health_profile"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # JSON array of condition strings
    chronic_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    # JSON array of {name, dosage}
    current_medications: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    disability_status: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    disability_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # JSON array
    mental_health_diagnoses: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    substance_use_disorder_diagnosis: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    has_active_medicaid: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    insurance_gap: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)


class BenefitsProfile(Base):
    __tablename__ = "benefits_profile"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    # JSON arrays
    benefits_enrolled: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    benefits_applied_pending: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    child_support_obligations: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    child_support_amount_monthly: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    veteran_status: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)


class HousingApplication(Base):
    __tablename__ = "housing_application"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    program: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="discovered")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contact_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    application_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    deadline: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    interview_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    interview_time: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    interview_location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    denial_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    documents_submitted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    housing_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    # JSON array of {from_status, to_status, notes, date}
    history: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")

    def get_history(self) -> list[dict]:
        return json.loads(self.history or "[]")

    def append_history(self, from_status: str, to_status: str, notes: str = "") -> None:
        h = self.get_history()
        h.append({
            "from_status": from_status,
            "to_status": to_status,
            "notes": notes or f"Status changed from {from_status} to {to_status}",
            "date": datetime.now().isoformat(),
        })
        self.history = json.dumps(h)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "program": self.program,
            "status": self.status,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else "",
            "updated_at": self.updated_at.isoformat() if self.updated_at else "",
            "follow_up_date": self.follow_up_date.isoformat() if self.follow_up_date else "",
            "contact_name": self.contact_name or "",
            "contact_phone": self.contact_phone or "",
            "application_url": self.application_url or "",
            "deadline": self.deadline.isoformat() if self.deadline else "",
            "interview_date": self.interview_date.isoformat() if self.interview_date else "",
            "interview_time": self.interview_time or "",
            "interview_location": self.interview_location or "",
            "denial_reason": self.denial_reason or "",
            "documents_submitted": self.documents_submitted or "",
            "housing_type": self.housing_type or "",
            "history": self.get_history(),
        }


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

    communication_style: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="direct")
    check_in_frequency: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="weekly")
    wants_reminders: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=True)
    privacy_level: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="high")
    comfort_with_technology: Mapped[Optional[str]] = mapped_column(String, nullable=True, default="medium")
    literacy_concerns: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=False)
