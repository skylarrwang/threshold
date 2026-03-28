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

export function InfoForm() {
  const { profile, updateProfile } = useProfileStore();
  const [payload, setPayload] = useState<InfoCollectionPayload>(initialPayload);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

      const offenseMap: Record<InfoCollectionPayload['employment_education']['felony_category'], 'non-violent' | 'violent' | 'drug' | 'financial' | 'other'> = {
        non_violent: 'non-violent',
        violent: 'violent',
        drug: 'drug',
        financial: 'financial',
        sex_offense: 'other',
        other: 'other',
      };

      const housingMap: Record<InfoCollectionPayload['housing']['housing_status'], 'housed' | 'shelter' | 'couch_surfing' | 'unhoused' | 'unknown'> = {
        stable: 'housed',
        transitional: 'housed',
        shelter: 'shelter',
        couch_surfing: 'couch_surfing',
        unhoused: 'unhoused',
      };

      updateProfile({
        user_id: response.id ?? profile.user_id,
        last_updated: new Date().toISOString(),
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
          employment_status: payload.employment_education.employment_status,
          benefits_enrolled: payload.benefits.benefits_enrolled,
          supervision_type: payload.supervision.supervision_type,
          supervision_end_date: payload.supervision.supervision_end_date || undefined,
        },
        preferences: {
          ...profile.preferences,
          communication_style: payload.preferences_meta.communication_style,
          check_in_frequency: payload.preferences_meta.check_in_frequency,
          wants_reminders: payload.preferences_meta.wants_reminders,
          privacy_level: payload.preferences_meta.privacy_level,
        },
      });

      setSubmitState({
        type: 'success',
        message: response.message ?? 'Your profile was saved successfully.',
      });
      setPayload(initialPayload);
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
        <span className="px-2 py-1 rounded-full bg-surface-container-low">1 Identity</span>
        <span className="px-2 py-1 rounded-full bg-surface-container-low">2 Documents</span>
        <span className="px-2 py-1 rounded-full bg-surface-container-low">3 Supervision</span>
        <span className="px-2 py-1 rounded-full bg-surface-container-low">4 Housing</span>
        <span className="px-2 py-1 rounded-full bg-surface-container-low">5 Employment</span>
        <span className="px-2 py-1 rounded-full bg-surface-container-low">6 Health</span>
        <span className="px-2 py-1 rounded-full bg-surface-container-low">7 Benefits</span>
        <span className="px-2 py-1 rounded-full bg-surface-container-low">8 Preferences</span>
      </div>

      <IdentitySection payload={payload} setPayload={setPayload} errors={errors} />
      <DocumentsSection payload={payload} setPayload={setPayload} errors={errors} />
      <SupervisionSection payload={payload} setPayload={setPayload} errors={errors} />
      <HousingSection payload={payload} setPayload={setPayload} errors={errors} />
      <EmploymentEducationSection payload={payload} setPayload={setPayload} errors={errors} />
      <HealthSection payload={payload} setPayload={setPayload} errors={errors} />
      <BenefitsSection payload={payload} setPayload={setPayload} errors={errors} />
      <PreferencesMetaSection payload={payload} setPayload={setPayload} errors={errors} />

      <ValidationMessage message={errors.form} />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SubmitButton isSubmitting={isSubmitting} />
        {submitState && (
          <p className={`text-sm ${submitState.type === 'success' ? 'text-green-700' : 'text-red-600'}`}>
            {submitState.message}
          </p>
        )}
      </div>
    </form>
  );
}
