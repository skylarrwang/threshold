import { create } from 'zustand';
import type { HousingPipelineSummary, HousingApplication, FairChanceLaw } from '@/types';
import { fetchHousingPipeline, logHousingApplication, fetchFairChanceLaws } from '@/lib/api';

interface HousingState {
  pipeline: HousingPipelineSummary | null;
  pipelineLoading: boolean;
  pipelineError: string | null;

  fairChanceLaw: FairChanceLaw | null;
  fairChanceLawLoading: boolean;

  // Modal state
  logModalOpen: boolean;

  // Actions
  fetchPipeline: () => Promise<void>;
  logApplication: (data: {
    program: string;
    status: string;
    notes?: string;
    follow_up_date?: string;
    contact_name?: string;
    contact_phone?: string;
  }) => Promise<HousingApplication | null>;
  fetchFairChanceLaw: (state: string) => Promise<void>;
  setLogModalOpen: (open: boolean) => void;
}

export const useHousingStore = create<HousingState>()((set, get) => ({
  pipeline: null,
  pipelineLoading: false,
  pipelineError: null,

  fairChanceLaw: null,
  fairChanceLawLoading: false,

  logModalOpen: false,

  async fetchPipeline() {
    set({ pipelineLoading: true, pipelineError: null });
    try {
      const data = await fetchHousingPipeline();
      set({ pipeline: data, pipelineLoading: false });
    } catch (e) {
      set({ pipelineError: (e as Error).message, pipelineLoading: false });
    }
  },

  async logApplication(data) {
    try {
      const result = await logHousingApplication(data);
      // Re-fetch pipeline to get updated state
      await get().fetchPipeline();
      return result;
    } catch {
      return null;
    }
  },

  async fetchFairChanceLaw(state: string) {
    set({ fairChanceLawLoading: true });
    try {
      const data = await fetchFairChanceLaws(state);
      set({ fairChanceLaw: data, fairChanceLawLoading: false });
    } catch {
      set({ fairChanceLawLoading: false });
    }
  },

  setLogModalOpen(open: boolean) {
    set({ logModalOpen: open });
  },
}));
