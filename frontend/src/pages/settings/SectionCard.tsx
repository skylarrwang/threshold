import { useState } from 'react';
import { SECTION_ICONS } from './fieldConfig';
import { FIELD_TYPE_MAP } from './fieldConfig';
import { SettingsField } from './SettingsField';
import type { MatrixSection, MatrixField } from '@/lib/api';

interface SectionCardProps {
  section: MatrixSection;
  sectionData: Record<string, unknown>;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  editDraft: Record<string, unknown>;
  onFieldChange: (fieldKey: string, value: unknown) => void;
}

/** Check whether a conditional field's parent boolean is truthy. */
function isParentTrue(
  parentField: MatrixField | undefined,
  data: Record<string, unknown>,
): boolean {
  if (!parentField) return true;
  const val = data[parentField.key];
  return val === true || val === 'true' || val === 'True';
}

export function SectionCard({
  section,
  sectionData,
  isEditing,
  onStartEdit,
  onCancel,
  onSave,
  saving,
  editDraft,
  onFieldChange,
}: SectionCardProps) {
  const [expanded, setExpanded] = useState(true);
  const icon = SECTION_ICONS[section.key] ?? 'category';
  const data = isEditing ? editDraft : sectionData;

  // For conditional fields, find the parent: the field right before them in the list
  // that is a boolean field (the backend inserts conditionals after their parent).
  function getParentField(field: MatrixField, idx: number): MatrixField | undefined {
    if (!field.conditional) return undefined;
    // Walk backward to find the non-conditional boolean parent
    for (let i = idx - 1; i >= 0; i--) {
      const prev = section.fields[i];
      if (!prev.conditional) {
        const cfg = FIELD_TYPE_MAP[prev.key];
        if (cfg?.type === 'boolean') return prev;
        break;
      }
    }
    return undefined;
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/12 overflow-hidden transition-all">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-surface-container-low/40 transition-colors"
      >
        <span className="material-symbols-outlined text-xl text-primary">{icon}</span>
        <span className="flex-1 text-sm font-bold text-on-surface">{section.label}</span>
        <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full">
          {section.filled}/{section.total}
        </span>
        <span
          className={`material-symbols-outlined text-base text-outline transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-5 pb-5">
          {/* Edit / Save / Cancel controls */}
          <div className="flex justify-end gap-2 mb-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-on-surface-variant hover:text-on-surface rounded-lg hover:bg-surface-container-high transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wide bg-primary text-on-primary rounded-lg hover:bg-primary-container active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartEdit();
                }}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary hover:bg-primary/8 rounded-lg transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
            {section.fields.map((field, idx) => {
              // Hide conditional fields when parent is false
              const parentField = getParentField(field, idx);
              if (field.conditional && !isParentTrue(parentField, data)) {
                return null;
              }

              return (
                <SettingsField
                  key={field.key}
                  fieldKey={field.key}
                  label={field.label}
                  value={data[field.key]}
                  isEditing={isEditing}
                  onChange={(val) => onFieldChange(field.key, val)}
                  source={field.source}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
