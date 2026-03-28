import type { Dispatch, SetStateAction } from 'react';
import type { InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { SectionAccordion, SelectField, TextField } from './shared';

interface IdentitySectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

const genderOptions = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'transgender', label: 'Transgender' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'self_describe', label: 'Self-describe' },
];

export function IdentitySection({ payload, setPayload, errors }: IdentitySectionProps) {
  const setIdentity = (key: keyof InfoCollectionPayload['identity'], value: string) => {
    setPayload((current) => ({
      ...current,
      identity: {
        ...current.identity,
        [key]: value,
      },
    }));
  };

  return (
    <SectionAccordion title="Identity" description="Legal identity and basic contact details." defaultOpen>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          id="legal-name"
          label="Legal Name"
          value={payload.identity.legal_name}
          onChange={(value) => setIdentity('legal_name', value)}
          error={errors['identity.legal_name']}
          required
        />
        <TextField
          id="date-of-birth"
          label="Date of Birth"
          type="date"
          value={payload.identity.date_of_birth}
          onChange={(value) => setIdentity('date_of_birth', value)}
          error={errors['identity.date_of_birth']}
          required
        />
        <TextField
          id="ssn"
          label="SSN (Encrypted Stub)"
          value={payload.identity.ssn}
          onChange={(value) => setIdentity('ssn', value)}
          placeholder="123-45-6789"
          error={errors['identity.ssn']}
          required
        />
        <TextField
          id="phone-number"
          label="Phone Number"
          value={payload.identity.phone_number}
          onChange={(value) => setIdentity('phone_number', value)}
          placeholder="(555) 123-4567"
          error={errors['identity.phone_number']}
          required
        />
        <SelectField
          id="gender-identity"
          label="Gender Identity"
          value={payload.identity.gender_identity}
          onChange={(value) => setIdentity('gender_identity', value as InfoCollectionPayload['identity']['gender_identity'])}
          options={genderOptions}
          error={errors['identity.gender_identity']}
          required
        />
        <TextField
          id="state-release"
          label="State of Release"
          value={payload.identity.state_of_release}
          onChange={(value) => setIdentity('state_of_release', value)}
          error={errors['identity.state_of_release']}
          required
        />
        <TextField
          id="preferred-language"
          label="Preferred Language"
          value={payload.identity.preferred_language}
          onChange={(value) => setIdentity('preferred_language', value)}
          error={errors['identity.preferred_language']}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          id="current-address"
          label="Current Address"
          value={payload.identity.current_address}
          onChange={(value) => setIdentity('current_address', value)}
          error={errors['identity.current_address']}
          required
        />
        <TextField
          id="mailing-address"
          label="Mailing Address"
          value={payload.identity.mailing_address}
          onChange={(value) => setIdentity('mailing_address', value)}
        />
      </div>
    </SectionAccordion>
  );
}
