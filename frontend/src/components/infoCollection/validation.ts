import type { InfoCollectionPayload } from '@/types/infoCollection';

export type FormErrors = Partial<Record<'name' | 'email', string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateInfoForm(payload: InfoCollectionPayload): FormErrors {
  const errors: FormErrors = {};

  if (!payload.name.trim()) {
    errors.name = 'Name is required.';
  }

  if (!payload.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_RE.test(payload.email)) {
    errors.email = 'Enter a valid email address.';
  }

  return errors;
}
