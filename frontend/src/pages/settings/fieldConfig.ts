/**
 * Static configuration mapping profile field keys to their input types,
 * enum options, and section icons for the Settings page.
 *
 * Fields not listed here default to a plain text input.
 */

export type FieldInputType = 'text' | 'date' | 'boolean' | 'select' | 'json_array' | 'time' | 'number';

export interface FieldConfig {
  type: FieldInputType;
  options?: string[];
  /** If true, field is displayed read-only (e.g. SSN). */
  readOnly?: boolean;
}

export const FIELD_TYPE_MAP: Record<string, FieldConfig> = {
  // Identity
  date_of_birth: { type: 'date' },
  ssn_encrypted: { type: 'text', readOnly: true },
  gender_identity: { type: 'select', options: ['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say'] },
  preferred_language: { type: 'select', options: ['en', 'es', 'zh', 'other'] },

  // Documents
  documents_in_hand: { type: 'json_array' },

  // Supervision
  supervision_type: { type: 'select', options: ['parole', 'probation', 'supervised_release', 'none'] },
  supervision_end_date: { type: 'date' },
  next_reporting_date: { type: 'date' },
  reporting_frequency: { type: 'select', options: ['weekly', 'biweekly', 'monthly', 'quarterly'] },
  curfew_start: { type: 'time' },
  curfew_end: { type: 'time' },
  drug_testing_required: { type: 'boolean' },
  drug_testing_frequency: { type: 'select', options: ['weekly', 'biweekly', 'monthly', 'random'] },
  electronic_monitoring: { type: 'boolean' },
  geographic_restrictions: { type: 'boolean' },
  mandatory_treatment: { type: 'boolean' },
  restitution_owed: { type: 'boolean' },
  restitution_amount: { type: 'number' },
  no_contact_orders: { type: 'boolean' },
  outstanding_fines: { type: 'boolean' },
  outstanding_fines_amount: { type: 'number' },

  // Housing
  housing_status: { type: 'select', options: ['housed', 'shelter', 'couch_surfing', 'unhoused', 'unknown'] },
  sex_offender_registry: { type: 'boolean' },
  eviction_history: { type: 'boolean' },
  accessibility_needs: { type: 'boolean' },

  // Employment
  employment_status: { type: 'select', options: ['employed', 'job_searching', 'not_looking', 'unable_to_work'] },
  felony_category: { type: 'select', options: ['non-violent', 'violent', 'drug', 'financial', 'other'] },
  has_valid_drivers_license: { type: 'boolean' },
  has_ged_or_diploma: { type: 'boolean' },
  college_completed: { type: 'boolean' },
  trade_skills: { type: 'json_array' },
  certifications: { type: 'json_array' },
  physical_limitations: { type: 'boolean' },

  // Health
  current_medications: { type: 'json_array' },
  has_active_medicaid: { type: 'boolean' },
  disability_status: { type: 'boolean' },
  chronic_conditions: { type: 'json_array' },
  substance_use_disorder_diagnosis: { type: 'boolean' },
  insurance_gap: { type: 'boolean' },
  mental_health_diagnoses: { type: 'json_array' },

  // Benefits
  benefits_enrolled: { type: 'json_array' },
  benefits_applied_pending: { type: 'json_array' },
  veteran_status: { type: 'boolean' },
  child_support_obligations: { type: 'boolean' },
  child_support_amount_monthly: { type: 'number' },

  // Preferences
  communication_style: { type: 'select', options: ['direct', 'gentle', 'informational'] },
  check_in_frequency: { type: 'select', options: ['daily', 'weekly', 'as_needed'] },
  wants_reminders: { type: 'boolean' },
  privacy_level: { type: 'select', options: ['high', 'medium', 'low'] },
  comfort_with_technology: { type: 'select', options: ['high', 'medium', 'low'] },
  literacy_concerns: { type: 'boolean' },
};

export const SECTION_ICONS: Record<string, string> = {
  identity: 'person',
  documents: 'folder_open',
  supervision: 'gavel',
  housing: 'home_work',
  employment: 'work',
  health: 'health_and_safety',
  benefits: 'volunteer_activism',
  preferences: 'tune',
};
