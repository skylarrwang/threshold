import { create } from 'zustand';
import type { HousingVoucher, ShelterInfo } from '@/types';

interface HousingState {
  voucher: HousingVoucher;
  shelter: ShelterInfo;
  moveInChecklist: { id: string; item: string; done: boolean }[];
}

export const useHousingStore = create<HousingState>()(() => ({
  voucher: {
    id: 'voucher-001',
    type: 'Section 8 Housing Choice',
    status: 'active',
    issuedDate: '2024-09-01',
    expiryDate: '2024-12-01',
    waitlistRank: 47,
    estimatedDate: 'November 2024',
    progressPercent: 68,
  },
  shelter: {
    name: 'Sunrise Transitional Housing',
    address: '1402 Broadway Ave, Oakland, CA 94612',
    phone: '(510) 555-0187',
    checkInDate: '2024-08-05',
    notes: 'Single room, curfew 10pm. Case manager: David Rodriguez',
  },
  moveInChecklist: [
    { id: 'mc-1', item: 'Section 8 voucher active', done: true },
    { id: 'mc-2', item: 'Income verification docs', done: true },
    { id: 'mc-3', item: 'Reference letter from counselor', done: false },
    { id: 'mc-4', item: 'First/last month deposit saved', done: false },
    { id: 'mc-5', item: 'Utility account setup', done: false },
  ],
}));
