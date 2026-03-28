import type { ReactNode } from 'react';
import { ValidationMessage } from '@/components/infoCollection/ValidationMessage';

const inputClassName =
  'w-full rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary';

interface SectionProps {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SectionAccordion({ title, description, defaultOpen = false, children }: SectionProps) {
  return (
    <details className="group rounded-xl border border-outline-variant/25 bg-surface-container-lowest" open={defaultOpen}>
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-on-surface">{title}</h3>
          <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
        <span className="material-symbols-outlined text-on-surface-variant transition-transform group-open:rotate-180">expand_more</span>
      </summary>
      <div className="px-4 pb-4 space-y-4">{children}</div>
    </details>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function TextField({ id, label, value, onChange, error, required, type = 'text', placeholder, disabled }: TextFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-on-surface block mb-1">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={inputClassName}
      />
      <ValidationMessage message={error} />
    </div>
  );
}

interface TextAreaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function TextAreaField({ id, label, value, onChange, error, required, placeholder, disabled }: TextAreaFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-on-surface block mb-1">
        {label}
        {required ? ' *' : ''}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={disabled}
        className={inputClassName}
      />
      <ValidationMessage message={error} />
    </div>
  );
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function SelectField({ id, label, value, onChange, options, error, required, disabled }: SelectFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-on-surface block mb-1">
        {label}
        {required ? ' *' : ''}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClassName} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ValidationMessage message={error} />
    </div>
  );
}

interface ToggleFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleField({ id, label, checked, onChange }: ToggleFieldProps) {
  return (
    <label htmlFor={id} className="inline-flex items-center gap-3 text-on-surface text-sm font-medium">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-outline-variant/40 text-primary focus:ring-primary"
      />
      {label}
    </label>
  );
}

export function parseCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toCsv(values: string[]): string {
  return values.join(', ');
}
