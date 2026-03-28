import type { Dispatch, SetStateAction } from 'react';
import type { InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { SectionAccordion, TextField, ToggleField, parseCsv, toCsv } from './shared';

interface BenefitsSectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

export function BenefitsSection({ payload, setPayload, errors }: BenefitsSectionProps) {
  const setBenefits = (key: keyof InfoCollectionPayload['benefits'], value: string | boolean | string[]) => {
    setPayload((current) => ({
      ...current,
      benefits: {
        ...current.benefits,
        [key]: value,
      },
    }));
  };

  return (
    <SectionAccordion title="Benefits" description="Benefits enrollment, pending applications, and obligations.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextField
          id="benefits-enrolled"
          label="Benefits Enrolled (comma-separated)"
          value={toCsv(payload.benefits.benefits_enrolled)}
          onChange={(value) => setBenefits('benefits_enrolled', parseCsv(value))}
          placeholder="SNAP, Medicaid, SSI"
        />
        <TextField
          id="benefits-pending"
          label="Benefits Applied/Pending (comma-separated)"
          value={toCsv(payload.benefits.benefits_applied_pending)}
          onChange={(value) => setBenefits('benefits_applied_pending', parseCsv(value))}
          placeholder="TANF, VA"
        />
        <ToggleField
          id="child-support-obligations"
          label="Child support obligations"
          checked={payload.benefits.child_support_obligations}
          onChange={(value) => setBenefits('child_support_obligations', value)}
        />
        <TextField
          id="child-support-amount"
          label="Child Support Monthly Amount"
          value={payload.benefits.child_support_amount_monthly}
          onChange={(value) => setBenefits('child_support_amount_monthly', value)}
          error={errors['benefits.child_support_amount_monthly']}
          placeholder="400.00"
          required={payload.benefits.child_support_obligations}
          disabled={!payload.benefits.child_support_obligations}
        />
        <ToggleField
          id="veteran-status"
          label="Veteran status"
          checked={payload.benefits.veteran_status}
          onChange={(value) => setBenefits('veteran_status', value)}
        />
      </div>
    </SectionAccordion>
  );
}
