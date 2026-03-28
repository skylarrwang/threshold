import type { Dispatch, SetStateAction } from 'react';
import type { InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { SectionAccordion, SelectField, ToggleField } from './shared';

interface PreferencesMetaSectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

const communicationOptions = [
  { value: 'direct', label: 'Direct' },
  { value: 'gentle', label: 'Gentle' },
  { value: 'informational', label: 'Informational' },
];

const checkInOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'as_needed', label: 'As Needed' },
];

const privacyOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const techOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function PreferencesMetaSection({ payload, setPayload, errors }: PreferencesMetaSectionProps) {
  const setPreferences = (
    key: keyof InfoCollectionPayload['preferences_meta'],
    value: string | boolean,
  ) => {
    setPayload((current) => ({
      ...current,
      preferences_meta: {
        ...current.preferences_meta,
        [key]: value,
      },
    }));
  };

  return (
    <SectionAccordion title="Preferences & Meta" description="Communication and accessibility preferences.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          id="communication-style"
          label="Communication Style"
          value={payload.preferences_meta.communication_style}
          onChange={(value) => setPreferences('communication_style', value)}
          options={communicationOptions}
          error={errors['preferences_meta.communication_style']}
          required
        />
        <SelectField
          id="check-in-frequency"
          label="Check-In Frequency"
          value={payload.preferences_meta.check_in_frequency}
          onChange={(value) => setPreferences('check_in_frequency', value)}
          options={checkInOptions}
          error={errors['preferences_meta.check_in_frequency']}
          required
        />
        <SelectField
          id="privacy-level"
          label="Privacy Level"
          value={payload.preferences_meta.privacy_level}
          onChange={(value) => setPreferences('privacy_level', value)}
          options={privacyOptions}
          error={errors['preferences_meta.privacy_level']}
          required
        />
        <SelectField
          id="tech-comfort"
          label="Comfort With Technology"
          value={payload.preferences_meta.comfort_with_technology}
          onChange={(value) => setPreferences('comfort_with_technology', value)}
          options={techOptions}
          error={errors['preferences_meta.comfort_with_technology']}
          required
        />
        <ToggleField
          id="wants-reminders"
          label="Wants reminders"
          checked={payload.preferences_meta.wants_reminders}
          onChange={(value) => setPreferences('wants_reminders', value)}
        />
        <ToggleField
          id="literacy-concerns"
          label="Literacy concerns"
          checked={payload.preferences_meta.literacy_concerns}
          onChange={(value) => setPreferences('literacy_concerns', value)}
        />
      </div>
    </SectionAccordion>
  );
}
