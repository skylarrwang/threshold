import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { fetchProfile, fetchProfileCompletion } from '@/lib/api';
import type { UserProfile } from '@/types';

const EMPTY_PROFILE: UserProfile = {
  user_id: '',
  created_at: '',
  last_updated: '',
  personal: { name: '', age_range: '', home_state: '', release_date: '', time_served: '', offense_category: 'other', comfort_with_technology: 'moderate' },
  situation: { housing_status: 'unknown', employment_status: '', benefits_enrolled: [], supervision_type: 'none', immediate_needs: [] },
  goals: { short_term_goals: [], long_term_goals: [], values: [], strengths: [], concerns: [] },
  support: { has_case_worker: false, support_contacts: [], trusted_people: [] },
  preferences: { communication_style: 'direct', check_in_frequency: 'weekly', wants_reminders: true, privacy_level: 'high' },
};

interface ProfileState {
  profile: UserProfile;
  overallProgress: number;
  isLoading: boolean;
  error: string | null;
  loadProfile: () => Promise<void>;
}

/**
 * Map the DB-shaped profile (identity, housing, supervision, employment, etc.)
 * to the frontend UserProfile shape (personal, situation, goals, support, preferences).
 */
function mapDbToFrontend(userId: string, db: Record<string, Record<string, unknown>>): UserProfile {
  const identity = db.identity ?? {};
  const housing = db.housing ?? {};
  const employment = db.employment ?? {};
  const supervision = db.supervision ?? {};
  const benefits = db.benefits ?? {};
  const health = db.health ?? {};
  const prefs = db.preferences ?? {};

  return {
    user_id: userId,
    created_at: (identity.created_at as string) ?? '',
    last_updated: (identity.updated_at as string) ?? '',
    personal: {
      name: (identity.legal_name as string) ?? '',
      age_range: '',
      gender_identity: (identity.gender_identity as string) ?? '',
      home_state: (identity.state_of_release as string) ?? '',
      release_date: (supervision.release_date as string) ?? '',
      time_served: (supervision.time_served as string) ?? '',
      offense_category: (supervision.offense_category as string as UserProfile['personal']['offense_category']) ?? 'other',
      comfort_with_technology: (prefs.comfort_with_technology as string) ?? 'moderate',
    },
    situation: {
      housing_status: (housing.housing_status as string as UserProfile['situation']['housing_status']) ?? 'unknown',
      employment_status: (employment.employment_status as string) ?? '',
      benefits_enrolled: ((benefits.benefits_enrolled as string) ?? '').split(',').map(s => s.trim()).filter(Boolean),
      supervision_type: (supervision.supervision_type as string as UserProfile['situation']['supervision_type']) ?? 'none',
      supervision_end_date: (supervision.supervision_end_date as string) ?? '',
      immediate_needs: [],
    },
    goals: {
      short_term_goals: [],
      long_term_goals: [],
      values: [],
      strengths: [],
      concerns: [],
    },
    support: {
      has_case_worker: !!(supervision.po_name),
      case_worker_name: (supervision.po_name as string) ?? '',
      support_contacts: [],
      trusted_people: [],
    },
    preferences: {
      communication_style: (prefs.communication_style as string as UserProfile['preferences']['communication_style']) ?? 'direct',
      check_in_frequency: (prefs.check_in_frequency as string as UserProfile['preferences']['check_in_frequency']) ?? 'weekly',
      wants_reminders: (prefs.wants_reminders as boolean) ?? true,
      privacy_level: (prefs.privacy_level as string as UserProfile['preferences']['privacy_level']) ?? 'high',
    },
  };
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
  profile: EMPTY_PROFILE,
  overallProgress: 0,
  isLoading: false,
  error: null,

  loadProfile: async () => {
    set({ isLoading: true, error: null });
    try {
      const [profileRes, completionRes] = await Promise.all([
        fetchProfile(),
        fetchProfileCompletion(),
      ]);
      const mapped = mapDbToFrontend(profileRes.user_id, profileRes.profile);
      set({
        profile: mapped,
        overallProgress: completionRes.overall_pct,
        isLoading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : 'Failed to load profile',
        isLoading: false,
      });
    }
  },
    }),
    {
      name: 'threshold-profile',
      partialize: (state) => ({ profile: state.profile, overallProgress: state.overallProgress }),
    },
  ),
);
