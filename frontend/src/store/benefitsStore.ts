// ─────────────────────────────────────────────────────────
// ⚠️  STUB STORE — all data is mock / hardcoded
//    Backend API exists but is not yet wired to this store.
//    See: TODO.md item #10 and src/fixtures/mockData.ts
// ─────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { BenefitApplication } from '@/types';
import { MOCK_BENEFITS, MOCK_BENEFITS_TOTAL_MONTHLY } from '@/fixtures/mockData';

interface BenefitsState {
  benefits: BenefitApplication[];
  totalMonthly: number;
}

export const useBenefitsStore = create<BenefitsState>()(() => ({
  benefits: MOCK_BENEFITS,
  totalMonthly: MOCK_BENEFITS_TOTAL_MONTHLY,
}));
