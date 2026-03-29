import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from '@/lib/api';
import { cn } from '@/lib/utils';

interface FieldInfo {
  key: string;
  label: string;
  filled: boolean;
  source: string;
  conditional?: boolean;
}

interface SectionInfo {
  key: string;
  label: string;
  filled: number;
  total: number;
  fields: FieldInfo[];
}

const SECTION_ICONS: Record<string, string> = {
  identity: 'person',
  documents: 'description',
  supervision: 'gavel',
  housing: 'home',
  employment: 'work',
  health: 'health_and_safety',
  benefits: 'account_balance',
};

export function ProfileReviewPage() {
  const navigate = useNavigate();
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [profileData, setProfileData] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<{ section: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [matrixRes, profileRes] = await Promise.all([
        fetch('/api/profile/completion/matrix'),
        fetch('/api/profile'),
      ]);
      const matrix: SectionInfo[] = await matrixRes.json();
      const profile = await profileRes.json();
      setSections(matrix);
      setProfileData(profile.profile || {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalFilled = sections.reduce((sum, s) => sum + s.filled, 0);
  const totalFields = sections.reduce((sum, s) => sum + s.total, 0);
  const overallPct = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;
  const missingCritical = sections.reduce(
    (sum, s) => sum + s.fields.filter((f) => !f.filled).length, 0
  );

  function startEdit(sectionKey: string, field: FieldInfo) {
    const currentVal = profileData[sectionKey]?.[field.key];
    setEditingField({ section: sectionKey, field: field.key });
    setEditValue(
      currentVal != null
        ? Array.isArray(currentVal) ? (currentVal as string[]).join(', ') : String(currentVal)
        : ''
    );
  }

  async function saveEdit() {
    if (!editingField) return;
    setSaving(true);
    try {
      let value: unknown = editValue;
      if (editValue.toLowerCase() === 'true') value = true;
      else if (editValue.toLowerCase() === 'false') value = false;

      await updateProfile(editingField.section, { [editingField.field]: value });
      setEditingField(null);
      setEditValue('');
      await fetchData();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }

  function formatValue(val: unknown): string {
    if (val == null) return '';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '—';
    return String(val);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-pulse text-on-surface-variant text-sm">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-surface-container-lowest border-b border-outline-variant/20 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                fact_check
              </span>
            </div>
            <div>
              <h1 className="font-headline font-extrabold text-xl text-on-surface">Review Your Profile</h1>
              <p className="text-xs text-on-surface-variant">
                Here's everything we've captured. Tap any field to correct it.
              </p>
            </div>
          </div>

          {/* Overall progress */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${overallPct}%` }}
              />
            </div>
            <span className="text-sm font-bold text-on-surface">{overallPct}%</span>
          </div>
          {missingCritical > 0 && (
            <p className="text-xs text-on-surface-variant mt-2">
              {missingCritical} field{missingCritical === 1 ? '' : 's'} still empty — you can fill these in later.
            </p>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
        {sections.map((section) => (
          <div
            key={section.key}
            className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 overflow-hidden"
          >
            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/10">
              <span className="material-symbols-outlined text-lg text-on-surface-variant">
                {SECTION_ICONS[section.key] || 'folder'}
              </span>
              <span className="font-headline font-bold text-sm text-on-surface">{section.label}</span>
              <span className="ml-auto text-xs text-outline font-medium">
                {section.filled}/{section.total}
              </span>
            </div>

            {/* Fields */}
            <div className="divide-y divide-outline-variant/10">
              {section.fields.map((field) => {
                const val = profileData[section.key]?.[field.key];
                const isEditing = editingField?.section === section.key && editingField?.field === field.key;

                return (
                  <div
                    key={field.key}
                    className={cn(
                      'px-5 py-3 flex items-center gap-3 transition-colors',
                      field.conditional && 'pl-9',
                      !isEditing && 'hover:bg-surface-container-low cursor-pointer',
                    )}
                    onClick={() => !isEditing && startEdit(section.key, field)}
                  >
                    {/* Status dot */}
                    <div className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      field.filled ? 'bg-primary' : 'bg-outline-variant/40'
                    )} />

                    {/* Label + value */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-on-surface-variant">{field.label}</span>
                        <span className={cn(
                          'text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider',
                          field.source === 'document'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : field.source === 'manual'
                              ? 'bg-tertiary-container text-on-tertiary-container'
                              : 'bg-surface-container text-outline'
                        )}>
                          {field.source}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="flex items-center gap-2 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            className="flex-1 px-3 py-2 bg-surface border border-primary/40 rounded-lg text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveEdit();
                              if (e.key === 'Escape') setEditingField(null);
                            }}
                          />
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="px-3 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold"
                          >
                            {saving ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingField(null)}
                            className="px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <p className={cn(
                          'text-sm truncate',
                          field.filled ? 'text-on-surface' : 'text-outline italic'
                        )}>
                          {field.filled ? formatValue(val) : 'Not provided'}
                        </p>
                      )}
                    </div>

                    {/* Edit icon */}
                    {!isEditing && (
                      <span className="material-symbols-outlined text-sm text-outline opacity-0 group-hover:opacity-100">
                        edit
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="space-y-3 pt-4 pb-10">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-4 rounded-xl font-headline font-bold text-sm bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] shadow-md shadow-primary/20 transition-all duration-200"
          >
            Looks Good — Continue to Dashboard
            <span className="material-symbols-outlined text-sm ml-1.5 align-middle">arrow_forward</span>
          </button>
          <button
            onClick={() => navigate('/interview')}
            className="w-full py-3 rounded-xl font-headline font-bold text-xs text-outline hover:text-on-surface hover:bg-surface-container-low transition-all duration-200"
          >
            Redo Voice Interview
          </button>
        </div>
      </div>
    </div>
  );
}
