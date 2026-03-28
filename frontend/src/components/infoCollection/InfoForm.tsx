import { useState } from 'react';
import type { FormEvent } from 'react';
import type { InfoCollectionPayload } from '@/types/infoCollection';
import { postCollectInfo } from '@/lib/api/infoCollection';
import { useProfileStore } from '@/store/profileStore';
import { validateInfoForm } from './validation';
import { ValidationMessage } from './ValidationMessage';
import { SubmitButton } from './SubmitButton';
import { IdentitySection } from './sections/IdentitySection';
import { DocumentsSection } from './sections/DocumentsSection';
import { SupervisionSection } from './sections/SupervisionSection';
import { HousingSection } from './sections/HousingSection';
import { EmploymentEducationSection } from './sections/EmploymentEducationSection';
import { HealthSection } from './sections/HealthSection';
import { BenefitsSection } from './sections/BenefitsSection';
import { PreferencesMetaSection } from './sections/PreferencesMetaSection';

const initialPayload: InfoCollectionPayload = {
  identity: {
    legal_name: '',
    date_of_birth: '',
    ssn: '',
    current_address: '',
    mailing_address: '',
    phone_number: '',
    gender_identity: 'prefer_not_to_say',
    state_of_release: '',
    preferred_language: '',
  },
  documents: {
    documents_in_hand: [],
    documents_needed: [],
    documents_pending: [],
  },
  supervision: {
    supervision_type: 'none',
    supervision_end_date: '',
    po_name: '',
    po_phone: '',
    next_reporting_date: '',
    reporting_frequency: 'as_directed',
    curfew_start: '',
    curfew_end: '',
    drug_testing_required: false,
    drug_testing_frequency: '',
    electronic_monitoring: false,
    geographic_restrictions: false,
    geographic_restrictions_detail: '',
    no_contact_orders: false,
    no_contact_orders_detail: '',
    mandatory_treatment: false,
    mandatory_treatment_detail: '',
    restitution_owed: false,
    restitution_amount: '',
    outstanding_fines: false,
    outstanding_fines_amount: '',
  },
  housing: {
    housing_status: 'unhoused',
    returning_to_housing_with: 'unknown',
    sex_offender_registry: false,
    sex_offender_registry_tier: '',
    eviction_history: false,
    accessibility_needs: false,
  },
  employment_education: {
    employment_status: 'actively_looking',
    has_valid_drivers_license: false,
    has_ged_or_diploma: false,
    college_completed: false,
    certifications: [],
    trade_skills: [],
    physical_limitations: false,
    physical_limitations_detail: '',
    felony_category: 'other',
  },
  health: {
    chronic_conditions: [],
    current_medications: [],
    disability_status: false,
    disability_type: '',
    mental_health_diagnoses: [],
    substance_use_disorder_diagnosis: false,
    has_active_medicaid: false,
    insurance_gap: false,
  },
  benefits: {
    benefits_enrolled: [],
    benefits_applied_pending: [],
    child_support_obligations: false,
    child_support_amount_monthly: '',
    veteran_status: false,
  },
  preferences_meta: {
    communication_style: 'direct',
    check_in_frequency: 'weekly',
    wants_reminders: true,
    privacy_level: 'high',
    comfort_with_technology: 'medium',
    literacy_concerns: false,
  },
};

const formSections = [
  { key: 'identity', label: 'Identity' },
  { key: 'documents', label: 'Documents' },
  { key: 'supervision', label: 'Supervision' },
  { key: 'housing', label: 'Housing' },
  { key: 'employment_education', label: 'Employment' },
  { key: 'health', label: 'Health' },
  { key: 'benefits', label: 'Benefits' },
  { key: 'preferences_meta', label: 'Preferences' },
] as const;

type FormSectionKey = (typeof formSections)[number]['key'];

function hasSectionErrors(errors: Record<string, string>, section: FormSectionKey): boolean {
  return Object.keys(errors).some((key) => key === section || key.startsWith(`${section}.`));
}

export function InfoForm() {
  const { profile, updateProfile } = useProfileStore();
  const [payload, setPayload] = useState<InfoCollectionPayload>(initialPayload);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const currentSection = formSections[currentStep];
  const isFinalStep = currentStep === formSections.length - 1;

  const handleNextStep = () => {
    const nextErrors = validateInfoForm(payload);
    setErrors(nextErrors);
    setSubmitState(null);

    if (hasSectionErrors(nextErrors, currentSection.key)) {
      return;
    }

    setCurrentStep((step) => Math.min(step + 1, formSections.length - 1));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateInfoForm(payload);
    setErrors(nextErrors);
    setSubmitState(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await postCollectInfo(payload);
      const savedAt = response.saved_at ?? new Date().toISOString();
      const savedProfileId = response.saved_profile_id ?? response.id ?? profile.user_id;

      const offenseMap: Record<
        InfoCollectionPayload['employment_education']['felony_category'],
        'non-violent' | 'violent' | 'drug' | 'financial' | 'other'
      > = {
        non_violent: 'non-violent',
        violent: 'violent',
        drug: 'drug',
        financial: 'financial',
        sex_offense: 'other',
        other: 'other',
      };

      const housingMap: Record<
        InfoCollectionPayload['housing']['housing_status'],
        'housed' | 'shelter' | 'couch_surfing' | 'unhoused' | 'unknown'
      > = {
        stable: 'housed',
        transitional: 'housed',
        shelter: 'shelter',
        couch_surfing: 'couch_surfing',
        unhoused: 'unhoused',
      };

      const employmentMap: Record<
        InfoCollectionPayload['employment_education']['employment_status'],
        string
      > = {
        employed: 'employed',
        actively_looking: 'job searching',
        not_looking: 'not looking',
        unable_to_work: 'unable to work',
      };

      const poContact = payload.supervision.po_name.trim() ? `PO: ${payload.supervision.po_name.trim()}` : null;
      const supportContacts = poContact
        ? Array.from(new Set([...profile.support.support_contacts, poContact]))
        : profile.support.support_contacts;

      updateProfile({
        user_id: savedProfileId,
        last_updated: savedAt,
        personal: {
          ...profile.personal,
          name: payload.identity.legal_name,
          gender_identity: payload.identity.gender_identity,
          home_state: payload.identity.state_of_release,
          offense_category: offenseMap[payload.employment_education.felony_category],
          comfort_with_technology: payload.preferences_meta.comfort_with_technology,
        },
        situation: {
          ...profile.situation,
          housing_status: housingMap[payload.housing.housing_status],
          employment_status: employmentMap[payload.employment_education.employment_status],
          benefits_enrolled: payload.benefits.benefits_enrolled,
          supervision_type: payload.supervision.supervision_type,
          supervision_end_date: payload.supervision.supervision_end_date || undefined,
        },
        support: {
          ...profile.support,
          has_case_worker: Boolean(payload.supervision.po_name.trim()) || profile.support.has_case_worker,
          case_worker_name: payload.supervision.po_name.trim() || profile.support.case_worker_name,
          support_contacts: supportContacts,
        },
        preferences: {
          ...profile.preferences,
          communication_style: payload.preferences_meta.communication_style,
          check_in_frequency: payload.preferences_meta.check_in_frequency,
          wants_reminders: payload.preferences_meta.wants_reminders,
          privacy_level: payload.preferences_meta.privacy_level,
        },
        intake_profile: payload,
      });

      setSubmitState({
        type: 'success',
        message: response.message ?? 'Your profile was saved successfully.',
      });
      setPayload(initialPayload);
      setCurrentStep(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit your information.';
      setSubmitState({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/25 shadow-[0_8px_32px_rgba(26,28,28,0.06)] space-y-5">
      <div>
        <h2 className="text-2xl font-headline font-bold text-on-surface">Complete Your Intake Details</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Provide full intake details across identity, supervision, housing, health, and preferences.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-on-surface-variant">
        {formSections.map((section, index) => {
          const active = index === currentStep;
          const hasErrors = hasSectionErrors(errors, section.key);

          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setCurrentStep(index)}
              className={`px-2 py-1 rounded-full border text-xs ${
                active ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low border-outline-variant/40'
              } ${hasErrors ? 'ring-1 ring-red-400' : ''}`}
            >
              {index + 1} {section.label}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-on-surface-variant">
        Step {currentStep + 1} of {formSections.length}: {currentSection.label}
      </p>

      {currentSection.key === 'identity' && <IdentitySection payload={payload} setPayload={setPayload} errors={errors} />}
      {currentSection.key === 'documents' && <DocumentsSection payload={payload} setPayload={setPayload} errors={errors} />}
      {currentSection.key === 'supervision' && <SupervisionSection payload={payload} setPayload={setPayload} errors={errors} />}
      {currentSection.key === 'housing' && <HousingSection payload={payload} setPayload={setPayload} errors={errors} />}
      {currentSection.key === 'employment_education' && (
        <EmploymentEducationSection payload={payload} setPayload={setPayload} errors={errors} />
      )}
      {currentSection.key === 'health' && <HealthSection payload={payload} setPayload={setPayload} errors={errors} />}
      {currentSection.key === 'benefits' && <BenefitsSection payload={payload} setPayload={setPayload} errors={errors} />}
      {currentSection.key === 'preferences_meta' && (
        <PreferencesMetaSection payload={payload} setPayload={setPayload} errors={errors} />
      )}

      <ValidationMessage message={errors.form} />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
            disabled={currentStep === 0 || isSubmitting}
            className="px-4 py-2 rounded-lg border border-outline-variant/40 text-on-surface disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Back
          </button>
          {!isFinalStep && (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Next Section
            </button>
          )}
          {isFinalStep && <SubmitButton isSubmitting={isSubmitting} />}
        </div>
        {submitState && (
          <p className={`text-sm ${submitState.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {submitState.message}
          </p>
        )}
      </div>
    </form>
  );
}
