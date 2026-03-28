import type {
  CheckInFrequency,
  ChronicCondition,
  CommunicationStyle,
  DocumentType,
  FelonyCategory,
  GenderIdentity,
  HousingStatus,
  InfoCollectionPayload,
  PrivacyLevel,
  ReportingFrequency,
  ReturningToHousingWith,
  SupervisionType,
  TechComfort,
  EmploymentStatus,
} from '@/types/infoCollection';

export type FormErrors = Record<string, string>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PHONE_RE = /^\+?[0-9()\-\s]{10,20}$/;
const SSN_RE = /^\d{3}-?\d{2}-?\d{4}$/;
const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

const GENDER_VALUES = new Set<GenderIdentity>([
  'female',
  'male',
  'non_binary',
  'transgender',
  'prefer_not_to_say',
  'self_describe',
]);

const DOCUMENT_VALUES = new Set<DocumentType>([
  'state_id',
  'birth_cert',
  'ss_card',
  'passport',
  'discharge_papers',
  'conditions_form',
  'court_order',
]);

const SUPERVISION_VALUES = new Set<SupervisionType>(['none', 'probation', 'parole', 'supervised_release']);
const REPORTING_VALUES = new Set<ReportingFrequency>(['weekly', 'biweekly', 'monthly', 'as_directed']);
const HOUSING_VALUES = new Set<HousingStatus>(['stable', 'transitional', 'shelter', 'couch_surfing', 'unhoused']);
const RETURNING_VALUES = new Set<ReturningToHousingWith>(['family', 'partner', 'friend', 'alone', 'shelter', 'unknown']);
const EMPLOYMENT_VALUES = new Set<EmploymentStatus>(['employed', 'actively_looking', 'not_looking', 'unable_to_work']);
const FELONY_VALUES = new Set<FelonyCategory>(['non_violent', 'violent', 'drug', 'financial', 'sex_offense', 'other']);
const CHRONIC_VALUES = new Set<ChronicCondition>(['diabetes', 'hypertension', 'HIV', 'hep_c', 'COPD', 'other']);
const COMM_VALUES = new Set<CommunicationStyle>(['direct', 'gentle', 'informational']);
const CHECK_IN_VALUES = new Set<CheckInFrequency>(['daily', 'weekly', 'as_needed']);
const PRIVACY_VALUES = new Set<PrivacyLevel>(['high', 'medium', 'low']);
const TECH_VALUES = new Set<TechComfort>(['low', 'medium', 'high']);

function addError(errors: FormErrors, key: string, message: string): void {
  if (!errors[key]) {
    errors[key] = message;
  }
}

function validateDate(errors: FormErrors, key: string, value: string, required: boolean): void {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) addError(errors, key, 'This date is required.');
    return;
  }

  if (!DATE_RE.test(trimmed) || Number.isNaN(Date.parse(`${trimmed}T00:00:00Z`))) {
    addError(errors, key, 'Use YYYY-MM-DD format.');
  }
}

function validateTime(errors: FormErrors, key: string, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (!TIME_RE.test(trimmed)) {
    addError(errors, key, 'Use HH:MM (24-hour).');
  }
}

export function validateInfoForm(payload: InfoCollectionPayload): FormErrors {
  const errors: FormErrors = {};

  if (!payload.identity.legal_name.trim()) addError(errors, 'identity.legal_name', 'Legal name is required.');
  validateDate(errors, 'identity.date_of_birth', payload.identity.date_of_birth, true);

  if (!payload.identity.ssn.trim()) {
    addError(errors, 'identity.ssn', 'SSN is required.');
  } else if (!SSN_RE.test(payload.identity.ssn.trim())) {
    addError(errors, 'identity.ssn', 'Use 9 digits (###-##-####).');
  }

  if (!payload.identity.current_address.trim()) addError(errors, 'identity.current_address', 'Current address is required.');
  if (!payload.identity.phone_number.trim()) {
    addError(errors, 'identity.phone_number', 'Phone number is required.');
  } else if (!PHONE_RE.test(payload.identity.phone_number.trim())) {
    addError(errors, 'identity.phone_number', 'Enter a valid phone number.');
  }

  if (!GENDER_VALUES.has(payload.identity.gender_identity)) addError(errors, 'identity.gender_identity', 'Select a valid value.');
  if (!payload.identity.state_of_release.trim()) addError(errors, 'identity.state_of_release', 'State is required.');
  if (!payload.identity.preferred_language.trim()) addError(errors, 'identity.preferred_language', 'Preferred language is required.');

  payload.documents.documents_in_hand.forEach((value, idx) => {
    if (!DOCUMENT_VALUES.has(value)) addError(errors, `documents.documents_in_hand.${idx}`, 'Invalid document type.');
  });

  payload.documents.documents_needed.forEach((value, idx) => {
    if (!DOCUMENT_VALUES.has(value)) addError(errors, `documents.documents_needed.${idx}`, 'Invalid document type.');
  });

  payload.documents.documents_pending.forEach((item, idx) => {
    if (!DOCUMENT_VALUES.has(item.document)) addError(errors, `documents.documents_pending.${idx}.document`, 'Invalid document type.');
    if (!item.action_taken.trim()) addError(errors, `documents.documents_pending.${idx}.action_taken`, 'Action taken is required.');
    validateDate(errors, `documents.documents_pending.${idx}.expected_date`, item.expected_date, true);
  });

  if (!SUPERVISION_VALUES.has(payload.supervision.supervision_type)) {
    addError(errors, 'supervision.supervision_type', 'Select a valid supervision type.');
  }

  const needsSupervisionFields = payload.supervision.supervision_type !== 'none';
  validateDate(errors, 'supervision.supervision_end_date', payload.supervision.supervision_end_date, needsSupervisionFields);
  validateDate(errors, 'supervision.next_reporting_date', payload.supervision.next_reporting_date, needsSupervisionFields);

  if (needsSupervisionFields && !payload.supervision.po_name.trim()) {
    addError(errors, 'supervision.po_name', 'PO name is required when supervision is active.');
  }

  if (needsSupervisionFields && !payload.supervision.po_phone.trim()) {
    addError(errors, 'supervision.po_phone', 'PO phone is required when supervision is active.');
  } else if (payload.supervision.po_phone.trim() && !PHONE_RE.test(payload.supervision.po_phone.trim())) {
    addError(errors, 'supervision.po_phone', 'Enter a valid phone number.');
  }

  if (needsSupervisionFields && !REPORTING_VALUES.has(payload.supervision.reporting_frequency)) {
    addError(errors, 'supervision.reporting_frequency', 'Select a valid reporting frequency.');
  }

  validateTime(errors, 'supervision.curfew_start', payload.supervision.curfew_start);
  validateTime(errors, 'supervision.curfew_end', payload.supervision.curfew_end);

  if (payload.supervision.curfew_start.trim() && !payload.supervision.curfew_end.trim()) {
    addError(errors, 'supervision.curfew_end', 'Curfew end is required when curfew start is set.');
  }

  if (payload.supervision.curfew_end.trim() && !payload.supervision.curfew_start.trim()) {
    addError(errors, 'supervision.curfew_start', 'Curfew start is required when curfew end is set.');
  }

  if (payload.supervision.drug_testing_required && !payload.supervision.drug_testing_frequency.trim()) {
    addError(errors, 'supervision.drug_testing_frequency', 'Drug testing frequency is required.');
  }

  if (payload.supervision.geographic_restrictions && !payload.supervision.geographic_restrictions_detail.trim()) {
    addError(errors, 'supervision.geographic_restrictions_detail', 'Add geographic restriction details.');
  }

  if (payload.supervision.no_contact_orders && !payload.supervision.no_contact_orders_detail.trim()) {
    addError(errors, 'supervision.no_contact_orders_detail', 'Add no-contact order details.');
  }

  if (payload.supervision.mandatory_treatment && !payload.supervision.mandatory_treatment_detail.trim()) {
    addError(errors, 'supervision.mandatory_treatment_detail', 'Add mandatory treatment details.');
  }

  if (payload.supervision.restitution_owed) {
    if (!payload.supervision.restitution_amount.trim()) {
      addError(errors, 'supervision.restitution_amount', 'Restitution amount is required.');
    } else if (!DECIMAL_RE.test(payload.supervision.restitution_amount.trim())) {
      addError(errors, 'supervision.restitution_amount', 'Enter a valid amount (e.g. 1200 or 1200.50).');
    }
  }

  if (payload.supervision.outstanding_fines) {
    if (!payload.supervision.outstanding_fines_amount.trim()) {
      addError(errors, 'supervision.outstanding_fines_amount', 'Outstanding fines amount is required.');
    } else if (!DECIMAL_RE.test(payload.supervision.outstanding_fines_amount.trim())) {
      addError(errors, 'supervision.outstanding_fines_amount', 'Enter a valid amount (e.g. 200 or 200.25).');
    }
  }

  if (!HOUSING_VALUES.has(payload.housing.housing_status)) addError(errors, 'housing.housing_status', 'Select a valid housing status.');
  if (!RETURNING_VALUES.has(payload.housing.returning_to_housing_with)) addError(errors, 'housing.returning_to_housing_with', 'Select a valid option.');
  if (payload.housing.sex_offender_registry && !payload.housing.sex_offender_registry_tier.trim()) {
    addError(errors, 'housing.sex_offender_registry_tier', 'Registry tier is required when registry is yes.');
  }

  if (!EMPLOYMENT_VALUES.has(payload.employment_education.employment_status)) {
    addError(errors, 'employment_education.employment_status', 'Select a valid employment status.');
  }

  if (!FELONY_VALUES.has(payload.employment_education.felony_category)) {
    addError(errors, 'employment_education.felony_category', 'Select a valid felony category.');
  }

  if (payload.employment_education.physical_limitations && !payload.employment_education.physical_limitations_detail.trim()) {
    addError(errors, 'employment_education.physical_limitations_detail', 'Add details for physical limitations.');
  }

  payload.health.chronic_conditions.forEach((value, idx) => {
    if (!CHRONIC_VALUES.has(value)) addError(errors, `health.chronic_conditions.${idx}`, 'Invalid chronic condition.');
  });

  payload.health.current_medications.forEach((medication, idx) => {
    if (!medication.name.trim()) addError(errors, `health.current_medications.${idx}.name`, 'Medication name is required.');
    if (!medication.dosage.trim()) addError(errors, `health.current_medications.${idx}.dosage`, 'Medication dosage is required.');
  });

  if (payload.health.disability_status && !payload.health.disability_type.trim()) {
    addError(errors, 'health.disability_type', 'Disability type is required when disability status is yes.');
  }

  if (payload.benefits.child_support_obligations) {
    if (!payload.benefits.child_support_amount_monthly.trim()) {
      addError(errors, 'benefits.child_support_amount_monthly', 'Child support monthly amount is required.');
    } else if (!DECIMAL_RE.test(payload.benefits.child_support_amount_monthly.trim())) {
      addError(errors, 'benefits.child_support_amount_monthly', 'Enter a valid amount (e.g. 400 or 400.00).');
    }
  }

  if (!COMM_VALUES.has(payload.preferences_meta.communication_style)) {
    addError(errors, 'preferences_meta.communication_style', 'Select a valid communication style.');
  }

  if (!CHECK_IN_VALUES.has(payload.preferences_meta.check_in_frequency)) {
    addError(errors, 'preferences_meta.check_in_frequency', 'Select a valid check-in frequency.');
  }

  if (!PRIVACY_VALUES.has(payload.preferences_meta.privacy_level)) {
    addError(errors, 'preferences_meta.privacy_level', 'Select a valid privacy level.');
  }

  if (!TECH_VALUES.has(payload.preferences_meta.comfort_with_technology)) {
    addError(errors, 'preferences_meta.comfort_with_technology', 'Select a valid tech comfort level.');
  }

  return errors;
}
