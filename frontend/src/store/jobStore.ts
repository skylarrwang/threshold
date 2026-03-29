// ─────────────────────────────────────────────────────────
// ⚠️  STUB STORE — all data is mock / hardcoded
//    Backend API exists but is not yet wired to this store.
//    See: TODO.md item #10 and src/fixtures/mockData.ts
// ─────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { JobApplication } from '@/types';
import { MOCK_JOBS } from '@/fixtures/mockData';

interface JobState {
  jobs: JobApplication[];
}

export const useJobStore = create<JobState>()(() => ({
  jobs: MOCK_JOBS,
}));
