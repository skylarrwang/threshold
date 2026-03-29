import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { SectionCard } from './settings/SectionCard';

export function SettingsPage() {
  const {
    matrix,
    profileData,
    loading,
    error,
    editingSection,
    editDraft,
    saving,
    fetchSettingsData,
    startEditing,
    cancelEditing,
    updateDraftField,
    saveSection,
  } = useSettingsStore();

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  const totalFilled = matrix.reduce((sum, s) => sum + s.filled, 0);
  const totalFields = matrix.reduce((sum, s) => sum + s.total, 0);
  const overallPct = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;

  if (loading && matrix.length === 0) {
    return (
      <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-surface-container-high rounded-xl w-48" />
          <div className="h-4 bg-surface-container-high rounded-lg w-64" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-surface-container-high rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
      {/* Page header */}
      <section className="mb-8">
        <p className="text-xs font-bold tracking-widest uppercase text-primary mb-2">
          Your Profile
        </p>
        <h1 className="text-3xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface mb-2">
          Settings
        </h1>
        <p className="text-on-surface-variant text-sm max-w-2xl mb-4">
          Review and edit all your profile information. Click Edit on any section to make changes.
        </p>

        {/* Overall completion */}
        <div className="flex items-center gap-4 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/12">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-label text-on-surface font-semibold">
                Profile Completion
              </span>
              <span className="text-sm font-bold text-primary">{overallPct}%</span>
            </div>
            <ProgressBar value={overallPct} />
          </div>
          <span className="text-xs text-on-surface-variant whitespace-nowrap">
            {totalFilled} of {totalFields} fields
          </span>
        </div>
      </section>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error-container text-on-error-container text-sm flex items-center justify-between">
          <span>Failed to load profile: {error}</span>
          <button
            onClick={fetchSettingsData}
            className="px-3 py-1 text-xs font-bold uppercase bg-error text-on-error rounded-lg hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}

      {/* Section cards */}
      <div className="space-y-4">
        {matrix.map((section) => (
          <SectionCard
            key={section.key}
            section={section}
            sectionData={profileData[section.key] ?? {}}
            isEditing={editingSection === section.key}
            onStartEdit={() => startEditing(section.key)}
            onCancel={cancelEditing}
            onSave={saveSection}
            saving={saving}
            editDraft={editingSection === section.key ? editDraft : {}}
            onFieldChange={updateDraftField}
          />
        ))}
      </div>
    </div>
  );
}
