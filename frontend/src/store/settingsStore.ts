import { create } from 'zustand';
import { fetchProfile, fetchProfileMatrix, updateProfile } from '@/lib/api';
import type { MatrixSection } from '@/lib/api';

export type ProfileData = Record<string, Record<string, unknown>>;

/** Labels for the preferences section (excluded from the matrix endpoint). */
const PREFERENCES_FIELDS = [
  { key: 'communication_style', label: 'Communication Style' },
  { key: 'check_in_frequency', label: 'Check-in Frequency' },
  { key: 'wants_reminders', label: 'Wants Reminders' },
  { key: 'privacy_level', label: 'Privacy Level' },
  { key: 'comfort_with_technology', label: 'Tech Comfort' },
  { key: 'literacy_concerns', label: 'Literacy Concerns' },
] as const;

function buildPreferencesSection(data: Record<string, unknown> | undefined): MatrixSection {
  const fields = PREFERENCES_FIELDS.map(({ key, label }) => {
    const value = data?.[key];
    const filled = value !== null && value !== undefined && value !== '' && value !== '[]';
    return { key, label, filled, source: 'manual' as const };
  });
  return {
    key: 'preferences',
    label: 'Preferences',
    filled: fields.filter((f) => f.filled).length,
    total: fields.length,
    fields,
  };
}

interface SettingsState {
  matrix: MatrixSection[];
  profileData: ProfileData;
  loading: boolean;
  error: string | null;

  editingSection: string | null;
  editDraft: Record<string, unknown>;
  saving: boolean;

  fetchSettingsData: () => Promise<void>;
  startEditing: (sectionKey: string) => void;
  cancelEditing: () => void;
  updateDraftField: (fieldKey: string, value: unknown) => void;
  saveSection: () => Promise<boolean>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  matrix: [],
  profileData: {},
  loading: false,
  error: null,

  editingSection: null,
  editDraft: {},
  saving: false,

  fetchSettingsData: async () => {
    set({ loading: true, error: null });
    try {
      const [matrixData, profileRes] = await Promise.all([
        fetchProfileMatrix(),
        fetchProfile(),
      ]);
      const profile = profileRes.profile as ProfileData;
      const prefsSection = buildPreferencesSection(profile.preferences);
      set({
        matrix: [...matrixData, prefsSection],
        profileData: profile,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: (e as Error).message });
    }
  },

  startEditing: (sectionKey: string) => {
    const { profileData } = get();
    set({
      editingSection: sectionKey,
      editDraft: { ...(profileData[sectionKey] ?? {}) },
    });
  },

  cancelEditing: () => {
    set({ editingSection: null, editDraft: {} });
  },

  updateDraftField: (fieldKey: string, value: unknown) => {
    set((state) => ({
      editDraft: { ...state.editDraft, [fieldKey]: value },
    }));
  },

  saveSection: async () => {
    const { editingSection, editDraft, profileData } = get();
    if (!editingSection) return false;

    set({ saving: true });
    try {
      await updateProfile(editingSection, editDraft);
      // Optimistic local update
      set({
        profileData: { ...profileData, [editingSection]: { ...editDraft } },
        editingSection: null,
        editDraft: {},
        saving: false,
      });
      // Refresh matrix completion counts
      get().fetchSettingsData();
      return true;
    } catch (e) {
      set({ saving: false });
      console.error('Failed to save section:', e);
      return false;
    }
  },
}));
