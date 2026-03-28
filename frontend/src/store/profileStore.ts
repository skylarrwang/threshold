import { create } from 'zustand';
import type { UserProfile } from '@/types';

interface ProfileState {
  profile: UserProfile;
  overallProgress: number;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const mockProfile: UserProfile = {
  user_id: 'marcus-001',
  created_at: '2024-08-15T10:00:00Z',
  last_updated: '2024-10-20T14:30:00Z',
  personal: {
    name: 'Marcus Chen',
    age_range: '30-35',
    gender_identity: 'male',
    home_state: 'California',
    release_date: '2024-08-01',
    time_served: '3 years',
    offense_category: 'non-violent',
    comfort_with_technology: 'moderate',
  },
  situation: {
    housing_status: 'shelter',
    employment_status: 'job searching',
    benefits_enrolled: ['SNAP', 'Medicaid'],
    supervision_type: 'parole',
    supervision_end_date: '2026-08-01',
    immediate_needs: ['employment', 'permanent housing', 'transportation'],
  },
  goals: {
    short_term_goals: ['Get state ID', 'Find stable housing', 'Complete Ready-to-Work cert'],
    long_term_goals: ['Secure full-time employment', 'Financial independence', 'Reunite with family'],
    values: ['family', 'honesty', 'self-improvement'],
    strengths: ['resilience', 'communication', 'cooking skills'],
    concerns: ['employment gaps on resume', 'housing costs'],
  },
  support: {
    has_case_worker: true,
    case_worker_name: 'Diana',
    support_contacts: ['Diana (Counselor)', 'James Chen (Brother)'],
    trusted_people: ['James Chen'],
  },
  preferences: {
    communication_style: 'direct',
    check_in_frequency: 'weekly',
    wants_reminders: true,
    privacy_level: 'high',
  },
};

export const useProfileStore = create<ProfileState>()((set) => ({
  profile: mockProfile,
  overallProgress: 64,
  updateProfile: (updates) => set((state) => ({ profile: { ...state.profile, ...updates } })),
}));
