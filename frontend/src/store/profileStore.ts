// ─────────────────────────────────────────────────────────
// ⚠️  STUB STORE — all data is mock / hardcoded
//    Backend API exists but is not yet wired to this store.
//    See: TODO.md item #10 and src/fixtures/mockData.ts
// ─────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { UserProfile } from '@/types';
import { MOCK_PROFILE, MOCK_OVERALL_PROGRESS } from '@/fixtures/mockData';

interface ProfileState {
  profile: UserProfile;
  overallProgress: number;
}

export const useProfileStore = create<ProfileState>()(() => ({
  profile: MOCK_PROFILE,
  overallProgress: MOCK_OVERALL_PROGRESS,
}));
