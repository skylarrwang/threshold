import type { Dispatch, SetStateAction } from 'react';
import type { InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { SectionAccordion, SelectField, TextAreaField, TextField, ToggleField } from './shared';

interface SupervisionSectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

const supervisionOptions = [
  { value: 'none', label: 'None' },
  { value: 'probation', label: 'Probation' },
  { value: 'parole', label: 'Parole' },
  { value: 'supervised_release', label: 'Supervised Release' },
];

const reportingOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'as_directed', label: 'As Directed' },
];

export function SupervisionSection({ payload, setPayload, errors }: SupervisionSectionProps) {
  const hasActiveSupervision = payload.supervision.supervision_type !== 'none';

  const setSupervision = (key: keyof InfoCollectionPayload['supervision'], value: string | boolean) => {
    setPayload((current) => ({
      ...current,
      supervision: {
        ...current.supervision,
        [key]: value,
      },
    }));
  };

  return (
    <SectionAccordion title="Supervision" description="Conditions, restrictions, and compliance deadlines.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SelectField
          id="supervision-type"
          label="Supervision Type"
          value={payload.supervision.supervision_type}
          onChange={(value) => setSupervision('supervision_type', value)}
          options={supervisionOptions}
          error={errors['supervision.supervision_type']}
          required
        />
        <TextField
          id="supervision-end"
          label="Supervision End Date"
          type="date"
          value={payload.supervision.supervision_end_date}
          onChange={(value) => setSupervision('supervision_end_date', value)}
          error={errors['supervision.supervision_end_date']}
          required={hasActiveSupervision}
          disabled={!hasActiveSupervision}
        />
        <TextField
          id="po-name"
          label="PO Name"
          value={payload.supervision.po_name}
          onChange={(value) => setSupervision('po_name', value)}
          error={errors['supervision.po_name']}
          required={hasActiveSupervision}
          disabled={!hasActiveSupervision}
        />
        <TextField
          id="po-phone"
          label="PO Phone"
          value={payload.supervision.po_phone}
          onChange={(value) => setSupervision('po_phone', value)}
          error={errors['supervision.po_phone']}
          required={hasActiveSupervision}
          disabled={!hasActiveSupervision}
        />
        <TextField
          id="next-reporting-date"
          label="Next Reporting Date"
          type="date"
          value={payload.supervision.next_reporting_date}
          onChange={(value) => setSupervision('next_reporting_date', value)}
          error={errors['supervision.next_reporting_date']}
          required={hasActiveSupervision}
          disabled={!hasActiveSupervision}
        />
        <SelectField
          id="reporting-frequency"
          label="Reporting Frequency"
          value={payload.supervision.reporting_frequency}
          onChange={(value) => setSupervision('reporting_frequency', value)}
          options={reportingOptions}
          error={errors['supervision.reporting_frequency']}
          required={hasActiveSupervision}
          disabled={!hasActiveSupervision}
        />
        <TextField
          id="curfew-start"
          label="Curfew Start (24h)"
          type="time"
          value={payload.supervision.curfew_start}
          onChange={(value) => setSupervision('curfew_start', value)}
          error={errors['supervision.curfew_start']}
        />
        <TextField
          id="curfew-end"
          label="Curfew End (24h)"
          type="time"
          value={payload.supervision.curfew_end}
          onChange={(value) => setSupervision('curfew_end', value)}
          error={errors['supervision.curfew_end']}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ToggleField
          id="drug-testing-required"
          label="Drug testing required"
          checked={payload.supervision.drug_testing_required}
          onChange={(value) => setSupervision('drug_testing_required', value)}
        />
        <TextField
          id="drug-testing-frequency"
          label="Drug Testing Frequency"
          value={payload.supervision.drug_testing_frequency}
          onChange={(value) => setSupervision('drug_testing_frequency', value)}
          error={errors['supervision.drug_testing_frequency']}
          required={payload.supervision.drug_testing_required}
          disabled={!payload.supervision.drug_testing_required}
        />
        <ToggleField
          id="electronic-monitoring"
          label="Electronic monitoring"
          checked={payload.supervision.electronic_monitoring}
          onChange={(value) => setSupervision('electronic_monitoring', value)}
        />
        <ToggleField
          id="geographic-restrictions"
          label="Geographic restrictions"
          checked={payload.supervision.geographic_restrictions}
          onChange={(value) => setSupervision('geographic_restrictions', value)}
        />
        <TextAreaField
          id="geo-details"
          label="Geographic Restriction Details"
          value={payload.supervision.geographic_restrictions_detail}
          onChange={(value) => setSupervision('geographic_restrictions_detail', value)}
          error={errors['supervision.geographic_restrictions_detail']}
          required={payload.supervision.geographic_restrictions}
          disabled={!payload.supervision.geographic_restrictions}
        />
        <ToggleField
          id="no-contact-orders"
          label="No-contact orders"
          checked={payload.supervision.no_contact_orders}
          onChange={(value) => setSupervision('no_contact_orders', value)}
        />
        <TextAreaField
          id="no-contact-details"
          label="No-Contact Order Details"
          value={payload.supervision.no_contact_orders_detail}
          onChange={(value) => setSupervision('no_contact_orders_detail', value)}
          error={errors['supervision.no_contact_orders_detail']}
          required={payload.supervision.no_contact_orders}
          disabled={!payload.supervision.no_contact_orders}
        />
        <ToggleField
          id="mandatory-treatment"
          label="Mandatory treatment"
          checked={payload.supervision.mandatory_treatment}
          onChange={(value) => setSupervision('mandatory_treatment', value)}
        />
        <TextAreaField
          id="mandatory-treatment-detail"
          label="Mandatory Treatment Detail"
          value={payload.supervision.mandatory_treatment_detail}
          onChange={(value) => setSupervision('mandatory_treatment_detail', value)}
          error={errors['supervision.mandatory_treatment_detail']}
          required={payload.supervision.mandatory_treatment}
          disabled={!payload.supervision.mandatory_treatment}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ToggleField
          id="restitution-owed"
          label="Restitution owed"
          checked={payload.supervision.restitution_owed}
          onChange={(value) => setSupervision('restitution_owed', value)}
        />
        <TextField
          id="restitution-amount"
          label="Restitution Amount"
          value={payload.supervision.restitution_amount}
          onChange={(value) => setSupervision('restitution_amount', value)}
          error={errors['supervision.restitution_amount']}
          placeholder="1200.00"
          required={payload.supervision.restitution_owed}
          disabled={!payload.supervision.restitution_owed}
        />
        <ToggleField
          id="outstanding-fines"
          label="Outstanding fines"
          checked={payload.supervision.outstanding_fines}
          onChange={(value) => setSupervision('outstanding_fines', value)}
        />
        <TextField
          id="outstanding-fines-amount"
          label="Outstanding Fines Amount"
          value={payload.supervision.outstanding_fines_amount}
          onChange={(value) => setSupervision('outstanding_fines_amount', value)}
          error={errors['supervision.outstanding_fines_amount']}
          placeholder="300.00"
          required={payload.supervision.outstanding_fines}
          disabled={!payload.supervision.outstanding_fines}
        />
      </div>
    </SectionAccordion>
  );
}
