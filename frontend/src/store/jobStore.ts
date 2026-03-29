import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JobPipelineSummary, JobApplication, JobAlerts } from '@/types';
import {
  fetchEmploymentPipeline,
  fetchEmploymentAlerts,
  logJobApplication,
  updateJobApplication,
  deleteJobApplication,
} from '@/lib/api';

interface JobState {
  pipeline: JobPipelineSummary | null;
  pipelineLoading: boolean;
  pipelineError: string | null;

  alerts: JobAlerts | null;
  alertsLoading: boolean;

  // Convenience accessor for legacy components
  jobs: JobApplication[];

  // Modal state
  logModalOpen: boolean;
  editModalOpen: boolean;
  editingApplication: JobApplication | null;

  // Actions
  fetchPipeline: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  logApplication: (data: {
    company: string;
    position: string;
    status?: string;
    notes?: string;
    apply_url?: string;
    follow_up_date?: string;
    deadline?: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    source?: string;
  }) => Promise<JobApplication | null>;
  updateApplication: (id: string, data: Record<string, string>) => Promise<JobApplication | null>;
  deleteApplication: (id: string) => Promise<boolean>;
  setLogModalOpen: (open: boolean) => void;
  setEditModalOpen: (open: boolean, app?: JobApplication) => void;
}

export const useJobStore = create<JobState>()(
  persist(
    (set, get) => ({
  pipeline: null,
  pipelineLoading: false,
  pipelineError: null,

  alerts: null,
  alertsLoading: false,

  jobs: [],

  logModalOpen: false,
  editModalOpen: false,
  editingApplication: null,

  async fetchPipeline() {
    set({ pipelineLoading: true, pipelineError: null });
    try {
      const data = await fetchEmploymentPipeline();
      set({
        pipeline: data,
        jobs: data.applications,
        pipelineLoading: false,
      });
    } catch (e) {
      set({ pipelineError: (e as Error).message, pipelineLoading: false });
    }
  },

  async fetchAlerts() {
    set({ alertsLoading: true });
    try {
      const data = await fetchEmploymentAlerts();
      set({ alerts: data, alertsLoading: false });
    } catch {
      set({ alertsLoading: false });
    }
  },

  async logApplication(data) {
    try {
      const result = await logJobApplication(data);
      // Re-fetch pipeline to get updated state
      await get().fetchPipeline();
      return result;
    } catch {
      return null;
    }
  },

  async updateApplication(id, data) {
    try {
      const result = await updateJobApplication(id, data);
      await get().fetchPipeline();
      return result;
    } catch {
      return null;
    }
  },

  async deleteApplication(id) {
    try {
      await deleteJobApplication(id);
      await get().fetchPipeline();
      return true;
    } catch {
      return false;
    }
  },

  setLogModalOpen(open: boolean) {
    set({ logModalOpen: open });
  },

  setEditModalOpen(open: boolean, app?: JobApplication) {
    set({ editModalOpen: open, editingApplication: app ?? null });
  },
    }),
    {
      name: 'threshold-jobs',
      partialize: (state) => ({ pipeline: state.pipeline, jobs: state.jobs }),
    },
  ),
);
