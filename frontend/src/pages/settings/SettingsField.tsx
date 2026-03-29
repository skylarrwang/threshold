import { useState, type KeyboardEvent } from 'react';
import { FIELD_TYPE_MAP, type FieldInputType } from './fieldConfig';

/* ------------------------------------------------------------------ */
/* Shared styling tokens                                               */
/* ------------------------------------------------------------------ */

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface border border-outline-variant/20 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all';

const labelClass = 'block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1.5';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getFieldType(fieldKey: string): FieldInputType {
  return FIELD_TYPE_MAP[fieldKey]?.type ?? 'text';
}

function formatReadValue(value: unknown, fieldKey: string): string {
  if (value === null || value === undefined || value === '') return '';

  const type = getFieldType(fieldKey);

  if (type === 'boolean') {
    if (value === true || value === 'true' || value === 'True') return 'Yes';
    if (value === false || value === 'false' || value === 'False') return 'No';
    return String(value);
  }

  if (type === 'json_array') {
    if (typeof value === 'string') {
      try {
        const arr = JSON.parse(value);
        if (Array.isArray(arr)) return arr.join(', ');
      } catch {
        return value;
      }
    }
    if (Array.isArray(value)) return value.join(', ');
  }

  if (type === 'number') {
    return typeof value === 'number' ? value.toLocaleString() : String(value);
  }

  return String(value);
}

function parseArrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      /* not JSON */
    }
    if (value === '' || value === '[]') return [];
    return [value];
  }
  return [];
}

/* ------------------------------------------------------------------ */
/* Sub-components: Edit inputs                                         */
/* ------------------------------------------------------------------ */

function TextInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number | string;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      className={inputClass}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

function DateInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="date"
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function TimeInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="time"
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function BooleanToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 ${
        value ? 'bg-primary' : 'bg-outline-variant/40'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select...</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
        </option>
      ))}
    </select>
  );
}

function ChipArrayInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInputValue('');
    }
  };

  const removeItem = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      removeItem(value.length - 1);
    }
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((item, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary-container text-on-primary-container text-xs font-medium"
            >
              {typeof item === 'object' ? JSON.stringify(item) : item}
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-on-primary-container/60 hover:text-on-primary-container transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        className={inputClass}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addItem}
        placeholder="Type and press Enter to add"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

interface SettingsFieldProps {
  fieldKey: string;
  label: string;
  value: unknown;
  isEditing: boolean;
  onChange: (value: unknown) => void;
  source?: string;
}

export function SettingsField({
  fieldKey,
  label,
  value,
  isEditing,
  onChange,
  source,
}: SettingsFieldProps) {
  const config = FIELD_TYPE_MAP[fieldKey];
  const type = config?.type ?? 'text';
  const readOnly = config?.readOnly ?? false;

  // SSN mask
  const displayValue =
    fieldKey === 'ssn_encrypted' && value
      ? '***-**-****'
      : formatReadValue(value, fieldKey);

  /* ---- Read mode ---- */
  if (!isEditing || readOnly) {
    return (
      <div className="py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className={labelClass}>{label}</span>
          {source && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-outline bg-surface-container-high px-1.5 py-0.5 rounded">
              {source}
            </span>
          )}
        </div>
        {displayValue ? (
          type === 'boolean' ? (
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  value === true || value === 'true' || value === 'True'
                    ? 'bg-primary'
                    : 'bg-outline-variant/50'
                }`}
              />
              <span className="text-sm text-on-surface">{displayValue}</span>
            </div>
          ) : type === 'json_array' ? (
            <div className="flex flex-wrap gap-1.5">
              {parseArrayValue(value).map((item, idx) => (
                <span
                  key={idx}
                  className="inline-block px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium"
                >
                  {typeof item === 'object' ? JSON.stringify(item) : item}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-on-surface">{displayValue}</span>
          )
        ) : (
          <span className="text-sm text-outline italic">Not provided</span>
        )}
      </div>
    );
  }

  /* ---- Edit mode ---- */
  return (
    <div className="py-2">
      <label className={labelClass}>{label}</label>
      {type === 'boolean' && (
        <BooleanToggle
          value={value === true || value === 'true' || value === 'True'}
          onChange={onChange}
        />
      )}
      {type === 'select' && (
        <SelectInput
          value={String(value ?? '')}
          options={config?.options ?? []}
          onChange={onChange}
        />
      )}
      {type === 'json_array' && (
        <ChipArrayInput value={parseArrayValue(value)} onChange={onChange} />
      )}
      {type === 'date' && (
        <DateInput value={String(value ?? '')} onChange={onChange} />
      )}
      {type === 'time' && (
        <TimeInput value={String(value ?? '')} onChange={onChange} />
      )}
      {type === 'number' && (
        <NumberInput value={value as number | string ?? ''} onChange={onChange} />
      )}
      {type === 'text' && (
        <TextInput value={String(value ?? '')} onChange={onChange} />
      )}
    </div>
  );
}
