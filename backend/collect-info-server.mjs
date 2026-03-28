import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'profiles.json');
const PORT = Number(process.env.PORT || 3001);

const GENDER_VALUES = new Set(['female', 'male', 'non_binary', 'transgender', 'prefer_not_to_say', 'self_describe']);
const DOCUMENT_VALUES = new Set(['state_id', 'birth_cert', 'ss_card', 'passport', 'discharge_papers', 'conditions_form', 'court_order']);
const SUPERVISION_VALUES = new Set(['none', 'probation', 'parole', 'supervised_release']);
const REPORTING_VALUES = new Set(['weekly', 'biweekly', 'monthly', 'as_directed']);
const HOUSING_VALUES = new Set(['stable', 'transitional', 'shelter', 'couch_surfing', 'unhoused']);
const RETURNING_VALUES = new Set(['family', 'partner', 'friend', 'alone', 'shelter', 'unknown']);
const EMPLOYMENT_VALUES = new Set(['employed', 'actively_looking', 'not_looking', 'unable_to_work']);
const FELONY_VALUES = new Set(['non_violent', 'violent', 'drug', 'financial', 'sex_offense', 'other']);
const CHRONIC_VALUES = new Set(['diabetes', 'hypertension', 'HIV', 'hep_c', 'COPD', 'other']);
const COMM_VALUES = new Set(['direct', 'gentle', 'informational']);
const CHECK_IN_VALUES = new Set(['daily', 'weekly', 'as_needed']);
const PRIVACY_VALUES = new Set(['high', 'medium', 'low']);
const TECH_VALUES = new Set(['low', 'medium', 'high']);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PHONE_RE = /^\+?[0-9()\-\s]{10,20}$/;
const SSN_RE = /^\d{3}-?\d{2}-?\d{4}$/;
const DECIMAL_RE = /^\d+(\.\d{1,2})?$/;

function jsonResponse(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

async function loadStoredProfiles() {
  try {
    const content = await readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isValidDate(value) {
  return typeof value === 'string' && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isValidTime(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

function isValidDecimal(value) {
  return typeof value === 'string' && DECIMAL_RE.test(value.trim());
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isBoolean(value) {
  return typeof value === 'boolean';
}

function addError(errors, message) {
  if (!errors.includes(message)) {
    errors.push(message);
  }
}

function validatePayload(payload) {
  const errors = [];

  if (!isObject(payload)) {
    addError(errors, 'Payload must be a JSON object.');
    return errors;
  }

  const requiredSections = [
    'identity',
    'documents',
    'supervision',
    'housing',
    'employment_education',
    'health',
    'benefits',
    'preferences_meta',
  ];

  for (const section of requiredSections) {
    if (!isObject(payload[section])) {
      addError(errors, `Missing or invalid section: ${section}.`);
    }
  }

  if (errors.length > 0) {
    return errors;
  }

  const { identity, documents, supervision, housing, employment_education, health, benefits, preferences_meta } = payload;

  if (!isNonEmptyString(identity.legal_name)) addError(errors, 'identity.legal_name is required.');
  if (!isValidDate(identity.date_of_birth)) addError(errors, 'identity.date_of_birth must be YYYY-MM-DD.');
  if (!(typeof identity.ssn === 'string' && SSN_RE.test(identity.ssn.trim()))) addError(errors, 'identity.ssn must be valid SSN format.');
  if (!isNonEmptyString(identity.current_address)) addError(errors, 'identity.current_address is required.');
  if (!(typeof identity.phone_number === 'string' && PHONE_RE.test(identity.phone_number.trim()))) addError(errors, 'identity.phone_number is invalid.');
  if (!GENDER_VALUES.has(identity.gender_identity)) addError(errors, 'identity.gender_identity is invalid.');
  if (!isNonEmptyString(identity.state_of_release)) addError(errors, 'identity.state_of_release is required.');
  if (!isNonEmptyString(identity.preferred_language)) addError(errors, 'identity.preferred_language is required.');
  if (identity.mailing_address !== undefined && typeof identity.mailing_address !== 'string') addError(errors, 'identity.mailing_address must be a string.');

  if (!Array.isArray(documents.documents_in_hand)) addError(errors, 'documents.documents_in_hand must be an array.');
  if (!Array.isArray(documents.documents_needed)) addError(errors, 'documents.documents_needed must be an array.');
  if (!Array.isArray(documents.documents_pending)) addError(errors, 'documents.documents_pending must be an array.');

  if (Array.isArray(documents.documents_in_hand)) {
    for (const value of documents.documents_in_hand) {
      if (!DOCUMENT_VALUES.has(value)) addError(errors, `documents.documents_in_hand contains invalid enum: ${String(value)}.`);
    }
  }

  if (Array.isArray(documents.documents_needed)) {
    for (const value of documents.documents_needed) {
      if (!DOCUMENT_VALUES.has(value)) addError(errors, `documents.documents_needed contains invalid enum: ${String(value)}.`);
    }
  }

  if (Array.isArray(documents.documents_pending)) {
    documents.documents_pending.forEach((item, index) => {
      if (!isObject(item)) {
        addError(errors, `documents.documents_pending.${index} must be an object.`);
        return;
      }
      if (!DOCUMENT_VALUES.has(item.document)) addError(errors, `documents.documents_pending.${index}.document is invalid.`);
      if (!isNonEmptyString(item.action_taken)) addError(errors, `documents.documents_pending.${index}.action_taken is required.`);
      if (!isValidDate(item.expected_date)) addError(errors, `documents.documents_pending.${index}.expected_date must be YYYY-MM-DD.`);
    });
  }

  const hasActiveSupervision = SUPERVISION_VALUES.has(supervision.supervision_type) && supervision.supervision_type !== 'none';
  if (!SUPERVISION_VALUES.has(supervision.supervision_type)) addError(errors, 'supervision.supervision_type is invalid.');
  if (hasActiveSupervision && !isValidDate(supervision.supervision_end_date)) addError(errors, 'supervision.supervision_end_date is required for active supervision.');
  if (hasActiveSupervision && !isNonEmptyString(supervision.po_name)) addError(errors, 'supervision.po_name is required for active supervision.');
  if (hasActiveSupervision && !(typeof supervision.po_phone === 'string' && PHONE_RE.test(supervision.po_phone.trim()))) {
    addError(errors, 'supervision.po_phone is required and must be valid for active supervision.');
  }
  if (hasActiveSupervision && !isValidDate(supervision.next_reporting_date)) addError(errors, 'supervision.next_reporting_date is required for active supervision.');
  if (hasActiveSupervision && !REPORTING_VALUES.has(supervision.reporting_frequency)) addError(errors, 'supervision.reporting_frequency is invalid.');

  if (supervision.curfew_start && !isValidTime(supervision.curfew_start)) addError(errors, 'supervision.curfew_start must be HH:MM.');
  if (supervision.curfew_end && !isValidTime(supervision.curfew_end)) addError(errors, 'supervision.curfew_end must be HH:MM.');
  if (Boolean(supervision.curfew_start) !== Boolean(supervision.curfew_end)) addError(errors, 'supervision curfew start and end must be provided together.');

  if (!isBoolean(supervision.drug_testing_required)) addError(errors, 'supervision.drug_testing_required must be boolean.');
  if (supervision.drug_testing_required && !isNonEmptyString(supervision.drug_testing_frequency)) {
    addError(errors, 'supervision.drug_testing_frequency is required when drug testing is required.');
  }

  if (!isBoolean(supervision.electronic_monitoring)) addError(errors, 'supervision.electronic_monitoring must be boolean.');
  if (!isBoolean(supervision.geographic_restrictions)) addError(errors, 'supervision.geographic_restrictions must be boolean.');
  if (supervision.geographic_restrictions && !isNonEmptyString(supervision.geographic_restrictions_detail)) {
    addError(errors, 'supervision.geographic_restrictions_detail is required when restrictions are true.');
  }

  if (!isBoolean(supervision.no_contact_orders)) addError(errors, 'supervision.no_contact_orders must be boolean.');
  if (supervision.no_contact_orders && !isNonEmptyString(supervision.no_contact_orders_detail)) {
    addError(errors, 'supervision.no_contact_orders_detail is required when no-contact orders are true.');
  }

  if (!isBoolean(supervision.mandatory_treatment)) addError(errors, 'supervision.mandatory_treatment must be boolean.');
  if (supervision.mandatory_treatment && !isNonEmptyString(supervision.mandatory_treatment_detail)) {
    addError(errors, 'supervision.mandatory_treatment_detail is required when mandatory treatment is true.');
  }

  if (!isBoolean(supervision.restitution_owed)) addError(errors, 'supervision.restitution_owed must be boolean.');
  if (supervision.restitution_owed && !isValidDecimal(supervision.restitution_amount)) {
    addError(errors, 'supervision.restitution_amount is required and must be decimal when restitution is owed.');
  }

  if (!isBoolean(supervision.outstanding_fines)) addError(errors, 'supervision.outstanding_fines must be boolean.');
  if (supervision.outstanding_fines && !isValidDecimal(supervision.outstanding_fines_amount)) {
    addError(errors, 'supervision.outstanding_fines_amount is required and must be decimal when fines are outstanding.');
  }

  if (!HOUSING_VALUES.has(housing.housing_status)) addError(errors, 'housing.housing_status is invalid.');
  if (!RETURNING_VALUES.has(housing.returning_to_housing_with)) addError(errors, 'housing.returning_to_housing_with is invalid.');
  if (!isBoolean(housing.sex_offender_registry)) addError(errors, 'housing.sex_offender_registry must be boolean.');
  if (housing.sex_offender_registry && !isNonEmptyString(housing.sex_offender_registry_tier)) {
    addError(errors, 'housing.sex_offender_registry_tier is required when sex_offender_registry is true.');
  }
  if (!isBoolean(housing.eviction_history)) addError(errors, 'housing.eviction_history must be boolean.');
  if (!isBoolean(housing.accessibility_needs)) addError(errors, 'housing.accessibility_needs must be boolean.');

  if (!EMPLOYMENT_VALUES.has(employment_education.employment_status)) addError(errors, 'employment_education.employment_status is invalid.');
  if (!isBoolean(employment_education.has_valid_drivers_license)) addError(errors, 'employment_education.has_valid_drivers_license must be boolean.');
  if (!isBoolean(employment_education.has_ged_or_diploma)) addError(errors, 'employment_education.has_ged_or_diploma must be boolean.');
  if (!isBoolean(employment_education.college_completed)) addError(errors, 'employment_education.college_completed must be boolean.');
  if (!Array.isArray(employment_education.certifications) || !employment_education.certifications.every((item) => typeof item === 'string')) {
    addError(errors, 'employment_education.certifications must be an array of strings.');
  }
  if (!Array.isArray(employment_education.trade_skills) || !employment_education.trade_skills.every((item) => typeof item === 'string')) {
    addError(errors, 'employment_education.trade_skills must be an array of strings.');
  }
  if (!isBoolean(employment_education.physical_limitations)) addError(errors, 'employment_education.physical_limitations must be boolean.');
  if (employment_education.physical_limitations && !isNonEmptyString(employment_education.physical_limitations_detail)) {
    addError(errors, 'employment_education.physical_limitations_detail is required when physical_limitations is true.');
  }
  if (!FELONY_VALUES.has(employment_education.felony_category)) addError(errors, 'employment_education.felony_category is invalid.');

  if (!Array.isArray(health.chronic_conditions)) addError(errors, 'health.chronic_conditions must be an array.');
  if (Array.isArray(health.chronic_conditions)) {
    for (const value of health.chronic_conditions) {
      if (!CHRONIC_VALUES.has(value)) addError(errors, `health.chronic_conditions contains invalid enum: ${String(value)}.`);
    }
  }

  if (!Array.isArray(health.current_medications)) {
    addError(errors, 'health.current_medications must be an array.');
  } else {
    health.current_medications.forEach((item, index) => {
      if (!isObject(item)) {
        addError(errors, `health.current_medications.${index} must be an object.`);
        return;
      }
      if (!isNonEmptyString(item.name)) addError(errors, `health.current_medications.${index}.name is required.`);
      if (!isNonEmptyString(item.dosage)) addError(errors, `health.current_medications.${index}.dosage is required.`);
    });
  }

  if (!isBoolean(health.disability_status)) addError(errors, 'health.disability_status must be boolean.');
  if (health.disability_status && !isNonEmptyString(health.disability_type)) {
    addError(errors, 'health.disability_type is required when disability_status is true.');
  }
  if (!Array.isArray(health.mental_health_diagnoses) || !health.mental_health_diagnoses.every((item) => typeof item === 'string')) {
    addError(errors, 'health.mental_health_diagnoses must be an array of strings.');
  }
  if (!isBoolean(health.substance_use_disorder_diagnosis)) addError(errors, 'health.substance_use_disorder_diagnosis must be boolean.');
  if (!isBoolean(health.has_active_medicaid)) addError(errors, 'health.has_active_medicaid must be boolean.');
  if (!isBoolean(health.insurance_gap)) addError(errors, 'health.insurance_gap must be boolean.');

  if (!Array.isArray(benefits.benefits_enrolled) || !benefits.benefits_enrolled.every((item) => typeof item === 'string')) {
    addError(errors, 'benefits.benefits_enrolled must be an array of strings.');
  }
  if (!Array.isArray(benefits.benefits_applied_pending) || !benefits.benefits_applied_pending.every((item) => typeof item === 'string')) {
    addError(errors, 'benefits.benefits_applied_pending must be an array of strings.');
  }
  if (!isBoolean(benefits.child_support_obligations)) addError(errors, 'benefits.child_support_obligations must be boolean.');
  if (benefits.child_support_obligations && !isValidDecimal(benefits.child_support_amount_monthly)) {
    addError(errors, 'benefits.child_support_amount_monthly is required and must be decimal when child_support_obligations is true.');
  }
  if (!isBoolean(benefits.veteran_status)) addError(errors, 'benefits.veteran_status must be boolean.');

  if (!COMM_VALUES.has(preferences_meta.communication_style)) addError(errors, 'preferences_meta.communication_style is invalid.');
  if (!CHECK_IN_VALUES.has(preferences_meta.check_in_frequency)) addError(errors, 'preferences_meta.check_in_frequency is invalid.');
  if (!isBoolean(preferences_meta.wants_reminders)) addError(errors, 'preferences_meta.wants_reminders must be boolean.');
  if (!PRIVACY_VALUES.has(preferences_meta.privacy_level)) addError(errors, 'preferences_meta.privacy_level is invalid.');
  if (!TECH_VALUES.has(preferences_meta.comfort_with_technology)) addError(errors, 'preferences_meta.comfort_with_technology is invalid.');
  if (!isBoolean(preferences_meta.literacy_concerns)) addError(errors, 'preferences_meta.literacy_concerns must be boolean.');

  return errors;
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true });
  }

  if (req.method !== 'POST' || req.url !== '/api/collect-info') {
    return jsonResponse(res, 404, { success: false, message: 'Not found.' });
  }

  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    const rawBody = Buffer.concat(chunks).toString('utf-8');
    const payload = rawBody ? JSON.parse(rawBody) : null;

    const validationErrors = validatePayload(payload);
    if (validationErrors.length > 0) {
      return jsonResponse(res, 400, {
        success: false,
        message: 'Invalid intake payload.',
        errors: validationErrors,
      });
    }

    const profileId = `profile_${randomUUID()}`;
    const savedAt = new Date().toISOString();
    const storedRecord = {
      id: profileId,
      saved_at: savedAt,
      profile: payload,
    };

    await mkdir(DATA_DIR, { recursive: true });
    const existing = await loadStoredProfiles();
    existing.push(storedRecord);
    await writeFile(DATA_FILE, JSON.stringify(existing, null, 2), 'utf-8');

    return jsonResponse(res, 200, {
      success: true,
      id: profileId,
      saved_profile_id: profileId,
      saved_at: savedAt,
      message: 'Comprehensive intake profile saved.',
    });
  } catch (error) {
    return jsonResponse(res, 500, {
      success: false,
      message: `Server error while saving intake profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`collect-info stub API listening on http://localhost:${PORT}/api/collect-info`);
});
