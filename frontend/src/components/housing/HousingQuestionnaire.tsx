import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { HousingQuestionnaireInput, HousingUrgency } from '@/types/housing';
import { Button } from '@/components/shared/Button';

interface HousingQuestionnaireProps {
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (payload: HousingQuestionnaireInput) => Promise<void>;
}

interface QuestionnaireFormState {
  location: string;
  budget: string;
  familySize: string;
  accessibilityNeeds: string;
  urgency: HousingUrgency;
}

const initialForm: QuestionnaireFormState = {
  location: '',
  budget: '',
  familySize: '1',
  accessibilityNeeds: '',
  urgency: 'within_30_days',
};

export function HousingQuestionnaire({ isSubmitting, error, onSubmit }: HousingQuestionnaireProps) {
  const [form, setForm] = useState<QuestionnaireFormState>(initialForm);
  const [validationError, setValidationError] = useState<string | null>(null);

  const parsedBudget = useMemo(() => Number(form.budget), [form.budget]);
  const parsedFamilySize = useMemo(() => Number(form.familySize), [form.familySize]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);

    if (!form.location.trim()) {
      setValidationError('Please provide a city or ZIP for housing search.');
      return;
    }

    if (!Number.isFinite(parsedBudget) || parsedBudget < 300) {
      setValidationError('Budget must be a number of at least 300.');
      return;
    }

    if (!Number.isInteger(parsedFamilySize) || parsedFamilySize < 1) {
      setValidationError('Family size must be at least 1.');
      return;
    }

    const payload: HousingQuestionnaireInput = {
      location: form.location.trim(),
      budget: parsedBudget,
      familySize: parsedFamilySize,
      accessibilityNeeds: form.accessibilityNeeds
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      urgency: form.urgency,
    };

    await onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/25 shadow-[0_8px_28px_rgba(26,28,28,0.06)] space-y-5"
    >
      <div>
        <h3 className="text-2xl font-headline font-bold text-on-surface">Housing Intake</h3>
        <p className="text-sm text-on-surface-variant mt-1">
          Answer a few questions so housing subagents can qualify programs and prepare applications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="housing-location" className="text-sm font-semibold text-on-surface block mb-1">
            Preferred Location
          </label>
          <input
            id="housing-location"
            type="text"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            placeholder="Oakland, CA or 94612"
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="housing-budget" className="text-sm font-semibold text-on-surface block mb-1">
            Monthly Budget (USD)
          </label>
          <input
            id="housing-budget"
            type="number"
            min={300}
            value={form.budget}
            onChange={(event) => setForm((current) => ({ ...current, budget: event.target.value }))}
            placeholder="1200"
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="housing-family-size" className="text-sm font-semibold text-on-surface block mb-1">
            Family Size
          </label>
          <input
            id="housing-family-size"
            type="number"
            min={1}
            value={form.familySize}
            onChange={(event) => setForm((current) => ({ ...current, familySize: event.target.value }))}
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="housing-urgency" className="text-sm font-semibold text-on-surface block mb-1">
            Urgency
          </label>
          <select
            id="housing-urgency"
            value={form.urgency}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                urgency: event.target.value as HousingUrgency,
              }))
            }
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="immediate">Immediate (0-7 days)</option>
            <option value="within_30_days">Within 30 days</option>
            <option value="within_90_days">Within 90 days</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="housing-accessibility" className="text-sm font-semibold text-on-surface block mb-1">
          Accessibility Needs (comma-separated)
        </label>
        <input
          id="housing-accessibility"
          type="text"
          value={form.accessibilityNeeds}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              accessibilityNeeds: event.target.value,
            }))
          }
          placeholder="wheelchair access, ground floor"
          className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {(validationError || error) && (
        <p className="text-sm font-medium text-red-600">{validationError ?? error}</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Starting workflow...' : 'Start Housing Workflow'}
        </Button>
      </div>
    </form>
  );
}
