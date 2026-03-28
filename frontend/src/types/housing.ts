export type HousingUrgency = 'immediate' | 'within_30_days' | 'within_90_days';

export interface HousingQuestionnaireInput {
  location: string;
  budget: number;
  familySize: number;
  accessibilityNeeds: string[];
  urgency: HousingUrgency;
}

export type HousingWorkflowPhase = 'qualifications' | 'search' | 'applications';
export type HousingPhaseStatus = 'idle' | 'running' | 'completed' | 'failed';

export interface HousingSubagentPhaseProgress {
  phase: HousingWorkflowPhase;
  status: HousingPhaseStatus;
  message?: string;
  updatedAt?: string;
}

export interface HousingQualificationResult {
  program: string;
  eligible: boolean;
  reason: string;
  nextSteps: string[];
}

export interface HousingListingResult {
  id: string;
  title: string;
  address: string;
  rent: number;
  bedrooms: number;
  accessible: boolean;
  matchScore: number;
  sourceUrl?: string;
}

export type HousingApplicationStatus =
  | 'queued'
  | 'submitted'
  | 'review'
  | 'approved'
  | 'rejected';

export interface HousingApplicationResult {
  listingId: string;
  listingTitle: string;
  status: HousingApplicationStatus;
  submittedAt?: string;
  notes?: string;
}

export interface HousingWorkflowResults {
  qualifications: HousingQualificationResult[];
  listings: HousingListingResult[];
  applications: HousingApplicationResult[];
}

export interface HousingSubagentTrigger {
  phase: HousingWorkflowPhase;
  agentName: string;
  status: 'queued' | 'started' | 'completed' | 'failed';
  detail: string;
}

export interface InitHousingWorkflowResponse {
  workflowId: string;
  startedAt: string;
  source: 'mock' | 'live';
  subagentTriggers: HousingSubagentTrigger[];
  results: HousingWorkflowResults;
}
