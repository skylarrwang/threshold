// ─────────────────────────────────────────────────────────
// ⚠️  STUB STORE — all data is mock / hardcoded
//    Backend API exists but is not yet wired to this store.
//    See: TODO.md item #10 and src/fixtures/mockData.ts
// ─────────────────────────────────────────────────────────

import { create } from 'zustand';
import type { HousingVoucher, ShelterInfo } from '@/types';
import {
  MOCK_HOUSING_VOUCHER,
  MOCK_SHELTER,
  MOCK_MOVE_IN_CHECKLIST,
} from '@/fixtures/mockData';

interface HousingState {
  voucher: HousingVoucher;
  shelter: ShelterInfo;
  moveInChecklist: { id: string; item: string; done: boolean }[];
}

export const useHousingStore = create<HousingState>()(() => ({
  voucher: MOCK_HOUSING_VOUCHER,
  shelter: MOCK_SHELTER,
  moveInChecklist: MOCK_MOVE_IN_CHECKLIST,
}));
