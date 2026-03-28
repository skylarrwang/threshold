import type { Dispatch, SetStateAction } from 'react';
import type { ChronicCondition, InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { SectionAccordion, TextField, ToggleField, parseCsv, toCsv } from './shared';

interface HealthSectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

const chronicConditionOptions: Array<{ value: ChronicCondition; label: string }> = [
  { value: 'diabetes', label: 'Diabetes' },
  { value: 'hypertension', label: 'Hypertension' },
  { value: 'HIV', label: 'HIV' },
  { value: 'hep_c', label: 'Hep C' },
  { value: 'COPD', label: 'COPD' },
  { value: 'other', label: 'Other' },
];

export function HealthSection({ payload, setPayload, errors }: HealthSectionProps) {
  const setHealth = (key: keyof InfoCollectionPayload['health'], value: string | boolean | string[] | { name: string; dosage: string }[]) => {
    setPayload((current) => ({
      ...current,
      health: {
        ...current.health,
        [key]: value,
      },
    }));
  };

  const toggleCondition = (value: ChronicCondition) => {
    setPayload((current) => {
      const exists = current.health.chronic_conditions.includes(value);
      return {
        ...current,
        health: {
          ...current.health,
          chronic_conditions: exists
            ? current.health.chronic_conditions.filter((item) => item !== value)
            : [...current.health.chronic_conditions, value],
        },
      };
    });
  };

  const addMedication = () => {
    setPayload((current) => ({
      ...current,
      health: {
        ...current.health,
        current_medications: [...current.health.current_medications, { name: '', dosage: '' }],
      },
    }));
  };

  const updateMedication = (index: number, key: 'name' | 'dosage', value: string) => {
    setPayload((current) => ({
      ...current,
      health: {
        ...current.health,
        current_medications: current.health.current_medications.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  };

  const removeMedication = (index: number) => {
    setPayload((current) => ({
      ...current,
      health: {
        ...current.health,
        current_medications: current.health.current_medications.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  return (
    <SectionAccordion title="Health" description="Medical, behavioral health, and insurance context.">
      <div>
        <p className="text-sm font-semibold text-on-surface mb-2">Chronic Conditions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {chronicConditionOptions.map((option) => (
            <label key={option.value} className="inline-flex items-center gap-2 text-sm text-on-surface">
              <input
                type="checkbox"
                checked={payload.health.chronic_conditions.includes(option.value)}
                onChange={() => toggleCondition(option.value)}
                className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-on-surface">Current Medications</p>
          <button
            type="button"
            onClick={addMedication}
            className="text-sm font-semibold text-primary hover:underline"
          >
            + Add Medication
          </button>
        </div>
        <div className="space-y-3">
          {payload.health.current_medications.map((medication, index) => (
            <div key={`medication-${index}`} className="rounded-lg border border-outline-variant/30 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField
                  id={`medication-name-${index}`}
                  label="Medication Name"
                  value={medication.name}
                  onChange={(value) => updateMedication(index, 'name', value)}
                  error={errors[`health.current_medications.${index}.name`]}
                />
                <TextField
                  id={`medication-dose-${index}`}
                  label="Dosage"
                  value={medication.dosage}
                  onChange={(value) => updateMedication(index, 'dosage', value)}
                  error={errors[`health.current_medications.${index}.dosage`]}
                />
              </div>
              <button
                type="button"
                onClick={() => removeMedication(index)}
                className="text-sm text-red-600 font-medium hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ToggleField
          id="disability-status"
          label="Disability status"
          checked={payload.health.disability_status}
          onChange={(value) => setHealth('disability_status', value)}
        />
        <TextField
          id="disability-type"
          label="Disability Type"
          value={payload.health.disability_type}
          onChange={(value) => setHealth('disability_type', value)}
          error={errors['health.disability_type']}
        />
        <ToggleField
          id="sud-diagnosis"
          label="Substance use disorder diagnosis"
          checked={payload.health.substance_use_disorder_diagnosis}
          onChange={(value) => setHealth('substance_use_disorder_diagnosis', value)}
        />
        <ToggleField
          id="active-medicaid"
          label="Has active Medicaid"
          checked={payload.health.has_active_medicaid}
          onChange={(value) => setHealth('has_active_medicaid', value)}
        />
        <ToggleField
          id="insurance-gap"
          label="Insurance gap"
          checked={payload.health.insurance_gap}
          onChange={(value) => setHealth('insurance_gap', value)}
        />
        <TextField
          id="mh-diagnoses"
          label="Mental Health Diagnoses (comma-separated)"
          value={toCsv(payload.health.mental_health_diagnoses)}
          onChange={(value) => setHealth('mental_health_diagnoses', parseCsv(value))}
          placeholder="PTSD, anxiety, depression"
        />
      </div>
    </SectionAccordion>
  );
}
