import type { Dispatch, SetStateAction } from 'react';
import type { InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { SectionAccordion, SelectField, TextField, ToggleField, parseCsv, toCsv } from './shared';

interface EmploymentEducationSectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

const employmentOptions = [
  { value: 'employed', label: 'Employed' },
  { value: 'actively_looking', label: 'Actively Looking' },
  { value: 'not_looking', label: 'Not Looking' },
  { value: 'unable_to_work', label: 'Unable To Work' },
];

const felonyOptions = [
  { value: 'non_violent', label: 'Non-violent' },
  { value: 'violent', label: 'Violent' },
  { value: 'drug', label: 'Drug' },
  { value: 'financial', label: 'Financial' },
  { value: 'sex_offense', label: 'Sex offense' },
  { value: 'other', label: 'Other' },
];

export function EmploymentEducationSection({ payload, setPayload, errors }: EmploymentEducationSectionProps) {
  const setEmployment = (key: keyof InfoCollectionPayload['employment_education'], value: string | boolean | string[]) => {
    setPayload((current) => ({
      ...current,
      employment_education: {
        ...current.employment_education,
        [key]: value,
      },
    }));
  };

  return (
    <SectionAccordion title="Employment & Education" description="Work readiness, credentials, and constraints.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          id="employment-status"
          label="Employment Status"
          value={payload.employment_education.employment_status}
          onChange={(value) => setEmployment('employment_status', value)}
          options={employmentOptions}
          error={errors['employment_education.employment_status']}
          required
        />
        <SelectField
          id="felony-category"
          label="Felony Category"
          value={payload.employment_education.felony_category}
          onChange={(value) => setEmployment('felony_category', value)}
          options={felonyOptions}
          error={errors['employment_education.felony_category']}
          required
        />
        <ToggleField
          id="has-license"
          label="Has valid driver's license"
          checked={payload.employment_education.has_valid_drivers_license}
          onChange={(value) => setEmployment('has_valid_drivers_license', value)}
        />
        <ToggleField
          id="has-ged"
          label="Has GED or diploma"
          checked={payload.employment_education.has_ged_or_diploma}
          onChange={(value) => setEmployment('has_ged_or_diploma', value)}
        />
        <ToggleField
          id="college-completed"
          label="College completed"
          checked={payload.employment_education.college_completed}
          onChange={(value) => setEmployment('college_completed', value)}
        />
        <ToggleField
          id="physical-limitations"
          label="Physical limitations"
          checked={payload.employment_education.physical_limitations}
          onChange={(value) => setEmployment('physical_limitations', value)}
        />
        <TextField
          id="physical-limitations-detail"
          label="Physical Limitations Detail"
          value={payload.employment_education.physical_limitations_detail}
          onChange={(value) => setEmployment('physical_limitations_detail', value)}
          error={errors['employment_education.physical_limitations_detail']}
          required={payload.employment_education.physical_limitations}
          disabled={!payload.employment_education.physical_limitations}
        />
        <TextField
          id="certifications"
          label="Certifications (comma-separated)"
          value={toCsv(payload.employment_education.certifications)}
          onChange={(value) => setEmployment('certifications', parseCsv(value))}
          placeholder="HVAC, CDL, ServSafe"
        />
        <TextField
          id="trade-skills"
          label="Trade Skills (comma-separated)"
          value={toCsv(payload.employment_education.trade_skills)}
          onChange={(value) => setEmployment('trade_skills', parseCsv(value))}
          placeholder="Welding, carpentry, electrical"
        />
      </div>
    </SectionAccordion>
  );
}
