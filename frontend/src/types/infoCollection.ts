export type CommunicationStyle = 'direct' | 'gentle' | 'informational';
export type CheckInFrequency = 'daily' | 'weekly' | 'as_needed';
export type PrivacyLevel = 'high' | 'medium' | 'low';
export type TechComfort = 'low' | 'medium' | 'high';

export type GenderIdentity =
  | 'female'
  | 'male'
  | 'non_binary'
  | 'transgender'
  | 'prefer_not_to_say'
  | 'self_describe';

export type DocumentType =
  | 'state_id'
  | 'birth_cert'
  | 'ss_card'
  | 'passport'
  | 'discharge_papers'
  | 'conditions_form'
  | 'court_order';

export type SupervisionType = 'none' | 'probation' | 'parole' | 'supervised_release';
export type ReportingFrequency = 'weekly' | 'biweekly' | 'monthly' | 'as_directed';

export type HousingStatus = 'stable' | 'transitional' | 'shelter' | 'couch_surfing' | 'unhoused';
export type ReturningToHousingWith = 'family' | 'partner' | 'friend' | 'alone' | 'shelter' | 'unknown';

export type EmploymentStatus = 'employed' | 'actively_looking' | 'not_looking' | 'unable_to_work';
export type FelonyCategory =
  | 'non_violent'
  | 'violent'
  | 'drug'
  | 'financial'
  | 'sex_offense'
  | 'other';

export type ChronicCondition = 'diabetes' | 'hypertension' | 'HIV' | 'hep_c' | 'COPD' | 'other';

export interface PendingDocument {
  document: DocumentType;
  action_taken: string;
  expected_date: string;
}

export interface Medication {
  name: string;
  dosage: string;
}

export interface IdentitySectionPayload {
  legal_name: string;
  date_of_birth: string;
  ssn: string;
  current_address: string;
  mailing_address: string;
  phone_number: string;
  gender_identity: GenderIdentity;
  state_of_release: string;
  preferred_language: string;
}

export interface DocumentsSectionPayload {
  documents_in_hand: DocumentType[];
  documents_needed: DocumentType[];
  documents_pending: PendingDocument[];
}

export interface SupervisionSectionPayload {
  supervision_type: SupervisionType;
  supervision_end_date: string;
  po_name: string;
  po_phone: string;
  next_reporting_date: string;
  reporting_frequency: ReportingFrequency;
  curfew_start: string;
  curfew_end: string;
  drug_testing_required: boolean;
  drug_testing_frequency: string;
  electronic_monitoring: boolean;
  geographic_restrictions: boolean;
  geographic_restrictions_detail: string;
  no_contact_orders: boolean;
  no_contact_orders_detail: string;
  mandatory_treatment: boolean;
  mandatory_treatment_detail: string;
  restitution_owed: boolean;
  restitution_amount: string;
  outstanding_fines: boolean;
  outstanding_fines_amount: string;
}

export interface HousingSectionPayload {
  housing_status: HousingStatus;
  returning_to_housing_with: ReturningToHousingWith;
  sex_offender_registry: boolean;
  sex_offender_registry_tier: string;
  eviction_history: boolean;
  accessibility_needs: boolean;
}

export interface EmploymentEducationSectionPayload {
  employment_status: EmploymentStatus;
  has_valid_drivers_license: boolean;
  has_ged_or_diploma: boolean;
  college_completed: boolean;
  certifications: string[];
  trade_skills: string[];
  physical_limitations: boolean;
  physical_limitations_detail: string;
  felony_category: FelonyCategory;
}

export interface HealthSectionPayload {
  chronic_conditions: ChronicCondition[];
  current_medications: Medication[];
  disability_status: boolean;
  disability_type: string;
  mental_health_diagnoses: string[];
  substance_use_disorder_diagnosis: boolean;
  has_active_medicaid: boolean;
  insurance_gap: boolean;
}

export interface BenefitsSectionPayload {
  benefits_enrolled: string[];
  benefits_applied_pending: string[];
  child_support_obligations: boolean;
  child_support_amount_monthly: string;
  veteran_status: boolean;
}

export interface PreferencesMetaSectionPayload {
  communication_style: CommunicationStyle;
  check_in_frequency: CheckInFrequency;
  wants_reminders: boolean;
  privacy_level: PrivacyLevel;
  comfort_with_technology: TechComfort;
  literacy_concerns: boolean;
}

export interface InfoCollectionPayload {
  identity: IdentitySectionPayload;
  documents: DocumentsSectionPayload;
  supervision: SupervisionSectionPayload;
  housing: HousingSectionPayload;
  employment_education: EmploymentEducationSectionPayload;
  health: HealthSectionPayload;
  benefits: BenefitsSectionPayload;
  preferences_meta: PreferencesMetaSectionPayload;
}

export interface InfoCollectionResponse {
  success: boolean;
  message?: string;
  id?: string;
  saved_profile_id?: string;
  saved_at?: string;
}
