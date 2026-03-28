import type { Dispatch, SetStateAction } from 'react';
import type { InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { SectionAccordion, SelectField, TextField, ToggleField } from './shared';

interface HousingSectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

const housingStatusOptions = [
  { value: 'stable', label: 'Stable' },
  { value: 'transitional', label: 'Transitional' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'couch_surfing', label: 'Couch Surfing' },
  { value: 'unhoused', label: 'Unhoused' },
];

const returningOptions = [
  { value: 'family', label: 'Family' },
  { value: 'partner', label: 'Partner' },
  { value: 'friend', label: 'Friend' },
  { value: 'alone', label: 'Alone' },
  { value: 'shelter', label: 'Shelter' },
  { value: 'unknown', label: 'Unknown' },
];

export function HousingSection({ payload, setPayload, errors }: HousingSectionProps) {
  const setHousing = (key: keyof InfoCollectionPayload['housing'], value: string | boolean) => {
    setPayload((current) => ({
      ...current,
      housing: {
        ...current.housing,
        [key]: value,
      },
    }));
  };

  return (
    <SectionAccordion title="Housing" description="Current living situation and housing constraints.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          id="housing-status"
          label="Housing Status"
          value={payload.housing.housing_status}
          onChange={(value) => setHousing('housing_status', value)}
          options={housingStatusOptions}
          error={errors['housing.housing_status']}
          required
        />
        <SelectField
          id="returning-to"
          label="Returning To Housing With"
          value={payload.housing.returning_to_housing_with}
          onChange={(value) => setHousing('returning_to_housing_with', value)}
          options={returningOptions}
          error={errors['housing.returning_to_housing_with']}
          required
        />
        <ToggleField
          id="sex-offender-registry"
          label="Sex offender registry"
          checked={payload.housing.sex_offender_registry}
          onChange={(value) => setHousing('sex_offender_registry', value)}
        />
        <TextField
          id="registry-tier"
          label="Registry Tier"
          value={payload.housing.sex_offender_registry_tier}
          onChange={(value) => setHousing('sex_offender_registry_tier', value)}
          error={errors['housing.sex_offender_registry_tier']}
        />
        <ToggleField
          id="eviction-history"
          label="Eviction history"
          checked={payload.housing.eviction_history}
          onChange={(value) => setHousing('eviction_history', value)}
        />
        <ToggleField
          id="accessibility-needs"
          label="Accessibility needs"
          checked={payload.housing.accessibility_needs}
          onChange={(value) => setHousing('accessibility_needs', value)}
        />
      </div>
    </SectionAccordion>
  );
}
