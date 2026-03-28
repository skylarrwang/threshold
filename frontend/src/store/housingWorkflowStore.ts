import { create } from 'zustand';
import type {
  HousingQuestionnaireInput,
  HousingSubagentPhaseProgress,
  HousingWorkflowPhase,
  HousingWorkflowResults,
  InitHousingWorkflowResponse,
} from '@/types/housing';

const FIRST_TIME_STORAGE_KEY = 'threshold_housing_workflow_started';

const emptyResults: HousingWorkflowResults = {
  qualifications: [],
  listings: [],
  applications: [],
};

function createInitialProgress(): Record<HousingWorkflowPhase, HousingSubagentPhaseProgress> {
  return {
    qualifications: {
      phase: 'qualifications',
      status: 'idle',
    },
    search: {
      phase: 'search',
      status: 'idle',
    },
    applications: {
      phase: 'applications',
      status: 'idle',
    },
  };
}

interface HousingWorkflowState {
  isFirstTime: boolean;
  questionnaire: HousingQuestionnaireInput | null;
  subagentProgress: Record<HousingWorkflowPhase, HousingSubagentPhaseProgress>;
  results: HousingWorkflowResults;
  resultSource: 'mock' | 'live' | null;
  workflowId: string | null;
  isSubmitting: boolean;
  error: string | null;
  initializeFromProfile: (housingStatus?: string) => void;
  setQuestionnaire: (questionnaire: HousingQuestionnaireInput) => void;
  setFirstTime: (isFirstTime: boolean) => void;
  setSubagentProgress: (
    phase: HousingWorkflowPhase,
    updates: Partial<HousingSubagentPhaseProgress>
  ) => void;
  setResults: (results: Partial<HousingWorkflowResults>) => void;
  startWorkflow: () => void;
  applyInitResponse: (response: InitHousingWorkflowResponse) => void;
  setError: (error: string | null) => void;
  resetWorkflow: () => void;
}

export const useHousingWorkflowStore = create<HousingWorkflowState>()((set) => ({
  isFirstTime: false,
  questionnaire: null,
  subagentProgress: createInitialProgress(),
  results: emptyResults,
  resultSource: null,
  workflowId: null,
  isSubmitting: false,
  error: null,

  initializeFromProfile: (housingStatus) => {
    const hasWorkflowStarted = localStorage.getItem(FIRST_TIME_STORAGE_KEY) === 'true';
    const likelyNeedsWorkflow =
      housingStatus === 'shelter' ||
      housingStatus === 'couch_surfing' ||
      housingStatus === 'unhoused' ||
      housingStatus === 'unknown';

    set({
      isFirstTime: !hasWorkflowStarted && likelyNeedsWorkflow,
    });
  },

  setQuestionnaire: (questionnaire) => set({ questionnaire }),

  setFirstTime: (isFirstTime) => set({ isFirstTime }),

  setSubagentProgress: (phase, updates) =>
    set((state) => ({
      subagentProgress: {
        ...state.subagentProgress,
        [phase]: {
          ...state.subagentProgress[phase],
          ...updates,
          phase,
        },
      },
    })),

  setResults: (results) =>
    set((state) => ({
      results: {
        ...state.results,
        ...results,
      },
    })),

  startWorkflow: () =>
    set({
      isSubmitting: true,
      error: null,
      subagentProgress: {
        qualifications: {
          phase: 'qualifications',
          status: 'running',
          message: 'Verifying voucher and housing program qualifications.',
          updatedAt: new Date().toISOString(),
        },
        search: {
          phase: 'search',
          status: 'idle',
          message: 'Waiting for qualification outputs.',
          updatedAt: new Date().toISOString(),
        },
        applications: {
          phase: 'applications',
          status: 'idle',
          message: 'Waiting for listing shortlist.',
          updatedAt: new Date().toISOString(),
        },
      },
    }),

  applyInitResponse: (response) => {
    const nextProgress = createInitialProgress();

    for (const trigger of response.subagentTriggers) {
      const status =
        trigger.status === 'started'
          ? 'running'
          : trigger.status === 'completed'
            ? 'completed'
            : trigger.status === 'failed'
              ? 'failed'
              : 'idle';

      nextProgress[trigger.phase] = {
        phase: trigger.phase,
        status,
        message: `${trigger.agentName}: ${trigger.detail}`,
        updatedAt: response.startedAt,
      };
    }

    localStorage.setItem(FIRST_TIME_STORAGE_KEY, 'true');

    set({
      isFirstTime: false,
      isSubmitting: false,
      workflowId: response.workflowId,
      resultSource: response.source,
      subagentProgress: nextProgress,
      results: response.results,
      error: null,
    });
  },

  setError: (error) => set({ error, isSubmitting: false }),

  resetWorkflow: () => {
    localStorage.removeItem(FIRST_TIME_STORAGE_KEY);
    set({
      isFirstTime: true,
      questionnaire: null,
      subagentProgress: createInitialProgress(),
      results: emptyResults,
      resultSource: null,
      workflowId: null,
      isSubmitting: false,
      error: null,
    });
  },
}));
