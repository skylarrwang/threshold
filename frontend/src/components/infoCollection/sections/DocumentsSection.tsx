import type { Dispatch, SetStateAction } from 'react';
import type { DocumentType, InfoCollectionPayload } from '@/types/infoCollection';
import type { FormErrors } from '@/components/infoCollection/validation';
import { ValidationMessage } from '@/components/infoCollection/ValidationMessage';
import { SectionAccordion, SelectField, TextField } from './shared';

interface DocumentsSectionProps {
  payload: InfoCollectionPayload;
  setPayload: Dispatch<SetStateAction<InfoCollectionPayload>>;
  errors: FormErrors;
}

const documentOptions: Array<{ value: DocumentType; label: string }> = [
  { value: 'state_id', label: 'State ID' },
  { value: 'birth_cert', label: 'Birth Certificate' },
  { value: 'ss_card', label: 'Social Security Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'discharge_papers', label: 'Discharge Papers' },
  { value: 'conditions_form', label: 'Conditions Form' },
  { value: 'court_order', label: 'Court Order' },
];

function CheckboxGroup({
  title,
  selected,
  onToggle,
}: {
  title: string;
  selected: DocumentType[];
  onToggle: (value: DocumentType) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-on-surface mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {documentOptions.map((option) => (
          <label key={option.value} className="inline-flex items-center gap-2 text-sm text-on-surface">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function DocumentsSection({ payload, setPayload, errors }: DocumentsSectionProps) {
  const toggleListValue = (key: 'documents_in_hand' | 'documents_needed', value: DocumentType) => {
    setPayload((current) => {
      const exists = current.documents[key].includes(value);
      const nextValues = exists
        ? current.documents[key].filter((item) => item !== value)
        : [...current.documents[key], value];

      return {
        ...current,
        documents: {
          ...current.documents,
          [key]: nextValues,
        },
      };
    });
  };

  const addPendingDocument = () => {
    setPayload((current) => ({
      ...current,
      documents: {
        ...current.documents,
        documents_pending: [
          ...current.documents.documents_pending,
          {
            document: 'state_id',
            action_taken: '',
            expected_date: '',
          },
        ],
      },
    }));
  };

  const updatePending = (index: number, key: 'document' | 'action_taken' | 'expected_date', value: string) => {
    setPayload((current) => ({
      ...current,
      documents: {
        ...current.documents,
        documents_pending: current.documents.documents_pending.map((item, itemIndex) =>
          itemIndex === index ? { ...item, [key]: value } : item,
        ),
      },
    }));
  };

  const removePending = (index: number) => {
    setPayload((current) => ({
      ...current,
      documents: {
        ...current.documents,
        documents_pending: current.documents.documents_pending.filter((_, itemIndex) => itemIndex !== index),
      },
    }));
  };

  return (
    <SectionAccordion title="Documents" description="Track document status and pending requests.">
      <CheckboxGroup
        title="Documents In Hand"
        selected={payload.documents.documents_in_hand}
        onToggle={(value) => toggleListValue('documents_in_hand', value)}
      />

      <CheckboxGroup
        title="Documents Needed"
        selected={payload.documents.documents_needed}
        onToggle={(value) => toggleListValue('documents_needed', value)}
      />

      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-sm font-semibold text-on-surface">Documents Pending</p>
          <button
            type="button"
            onClick={addPendingDocument}
            className="text-sm font-semibold text-primary hover:underline"
          >
            + Add Pending Document
          </button>
        </div>

        <div className="space-y-3">
          {payload.documents.documents_pending.map((item, index) => (
            <div key={`pending-${index}`} className="rounded-lg border border-outline-variant/30 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <SelectField
                  id={`pending-document-${index}`}
                  label="Document"
                  value={item.document}
                  onChange={(value) => updatePending(index, 'document', value)}
                  options={documentOptions}
                  error={errors[`documents.documents_pending.${index}.document`]}
                  required
                />
                <TextField
                  id={`pending-action-${index}`}
                  label="Action Taken"
                  value={item.action_taken}
                  onChange={(value) => updatePending(index, 'action_taken', value)}
                  error={errors[`documents.documents_pending.${index}.action_taken`]}
                  required
                />
                <TextField
                  id={`pending-date-${index}`}
                  label="Expected Date"
                  type="date"
                  value={item.expected_date}
                  onChange={(value) => updatePending(index, 'expected_date', value)}
                  error={errors[`documents.documents_pending.${index}.expected_date`]}
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => removePending(index)}
                className="text-sm text-red-600 font-medium hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
      <ValidationMessage message={errors['documents.documents_pending']} />
    </SectionAccordion>
  );
}
