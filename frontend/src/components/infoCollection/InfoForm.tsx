import { useState } from 'react';
import type { FormEvent } from 'react';
import type {
  CheckInFrequency,
  CommunicationStyle,
  InfoCollectionPayload,
} from '@/types/infoCollection';
import { postCollectInfo } from '@/lib/api/infoCollection';
import { validateInfoForm } from './validation';
import { ValidationMessage } from './ValidationMessage';
import { SubmitButton } from './SubmitButton';

const initialPayload: InfoCollectionPayload = {
  name: '',
  email: '',
  preferences: {
    communicationStyle: 'direct',
    checkInFrequency: 'weekly',
    wantsReminders: true,
  },
};

export function InfoForm() {
  const [payload, setPayload] = useState<InfoCollectionPayload>(initialPayload);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
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

      setSubmitState({
        type: 'success',
        message: response.message ?? 'Your information was submitted successfully.',
      });
      setPayload(initialPayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit your information.';
      setSubmitState({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCommunicationStyle = (value: CommunicationStyle) => {
    setPayload((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        communicationStyle: value,
      },
    }));
  };

  const updateCheckInFrequency = (value: CheckInFrequency) => {
    setPayload((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        checkInFrequency: value,
      },
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl border border-outline-variant/25 shadow-[0_8px_32px_rgba(26,28,28,0.06)] space-y-5">
      <div>
        <h2 className="text-2xl font-headline font-bold text-on-surface">Complete Your Intake Details</h2>
        <p className="text-sm text-on-surface-variant mt-1">We use this to personalize your support plan and reminders.</p>
      </div>

      <div>
        <label htmlFor="info-name" className="text-sm font-semibold text-on-surface block mb-1">
          Full Name
        </label>
        <input
          id="info-name"
          type="text"
          value={payload.name}
          onChange={(event) => setPayload((current) => ({ ...current, name: event.target.value }))}
          className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Jane Doe"
        />
        <ValidationMessage message={errors.name} />
      </div>

      <div>
        <label htmlFor="info-email" className="text-sm font-semibold text-on-surface block mb-1">
          Email
        </label>
        <input
          id="info-email"
          type="email"
          value={payload.email}
          onChange={(event) => setPayload((current) => ({ ...current, email: event.target.value }))}
          className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="jane@example.com"
        />
        <ValidationMessage message={errors.email} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="communication-style" className="text-sm font-semibold text-on-surface block mb-1">
            Communication Style
          </label>
          <select
            id="communication-style"
            value={payload.preferences.communicationStyle}
            onChange={(event) => updateCommunicationStyle(event.target.value as CommunicationStyle)}
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="direct">Direct</option>
            <option value="gentle">Gentle</option>
            <option value="informational">Informational</option>
          </select>
        </div>

        <div>
          <label htmlFor="check-in-frequency" className="text-sm font-semibold text-on-surface block mb-1">
            Check-In Frequency
          </label>
          <select
            id="check-in-frequency"
            value={payload.preferences.checkInFrequency}
            onChange={(event) => updateCheckInFrequency(event.target.value as CheckInFrequency)}
            className="w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="as_needed">As Needed</option>
          </select>
        </div>
      </div>

      <label className="inline-flex items-center gap-3 text-on-surface text-sm font-medium">
        <input
          type="checkbox"
          checked={payload.preferences.wantsReminders}
          onChange={(event) =>
            setPayload((current) => ({
              ...current,
              preferences: {
                ...current.preferences,
                wantsReminders: event.target.checked,
              },
            }))
          }
          className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
        />
        Enable reminders
      </label>

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
