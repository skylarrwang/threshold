import { useHousingStore } from '@/store/housingStore';
import { useJobStore } from '@/store/jobStore';
import { useBenefitsStore } from '@/store/benefitsStore';

// Stage weights: each step in the happy-path pipeline gets a sequential weight.
// Terminal-negative statuses (denied, rejected, withdrawn) are excluded.

const HOUSING_STAGE_WEIGHT: Record<string, number> = {
  discovered: 1,
  contacted: 2,
  documents_gathering: 3,
  applied: 4,
  screening: 5,
  waitlisted: 6,
  voucher_issued: 7,
  unit_search: 8,
  interview_scheduled: 9,
  approved: 10,
  lease_review: 11,
  moved_in: 12,
  appeal_filed: 5, // re-entering the process ≈ screening
};
const HOUSING_MAX = 12;

const JOB_STAGE_WEIGHT: Record<string, number> = {
  interested: 1,
  preparing: 2,
  applied: 3,
  screening: 4,
  interview_scheduled: 5,
  interviewed: 6,
  follow_up: 7,
  offer_received: 8,
  negotiating: 9,
  accepted: 10,
  started: 11,
};
const JOB_MAX = 11;

export interface ProgressSummary {
  housing: number;
  housingStageLabel?: string;
  employment: number;
  employmentStageLabel?: string;
  benefits: number;
  overall: number;
}

export function useProgressSummary(): ProgressSummary {
  const housingPipeline = useHousingStore((s) => s.pipeline);
  const jobPipeline = useJobStore((s) => s.pipeline);
  const benefits = useBenefitsStore((s) => s.benefits);

  // --- Housing: best active application's stage progress ---
  let housing = 0;
  let housingStageLabel: string | undefined;
  if (housingPipeline?.applications?.length) {
    let bestWeight = 0;
    let bestLabel: string | undefined;
    for (const app of housingPipeline.applications) {
      const weight = HOUSING_STAGE_WEIGHT[app.status];
      if (weight != null && weight > bestWeight) {
        bestWeight = weight;
        bestLabel = app.stage_label ?? app.status;
      }
    }
    if (bestWeight > 0) {
      housing = Math.round((bestWeight / HOUSING_MAX) * 100);
      housingStageLabel = bestLabel;
    }
  }

  // --- Employment: best active application's stage progress ---
  let employment = 0;
  let employmentStageLabel: string | undefined;
  const jobs = jobPipeline?.applications ?? [];
  if (jobs.length) {
    let bestWeight = 0;
    let bestLabel: string | undefined;
    for (const job of jobs) {
      const weight = JOB_STAGE_WEIGHT[job.status];
      if (weight != null && weight > bestWeight) {
        bestWeight = weight;
        bestLabel = job.stage_label ?? job.status;
      }
    }
    if (bestWeight > 0) {
      employment = Math.round((bestWeight / JOB_MAX) * 100);
      employmentStageLabel = bestLabel;
    }
  }

  // --- Benefits: enrolled / total (unchanged) ---
  const enrolledBenefits = benefits.filter((b) => b.status === 'enrolled').length;
  const benefitsPercent = benefits.length > 0 ? Math.round((enrolledBenefits / benefits.length) * 100) : 0;

  // --- Overall: weighted composite of all domains ---
  const overall = Math.round(
    housing * 0.40 + employment * 0.40 + benefitsPercent * 0.20,
  );

  return { housing, housingStageLabel, employment, employmentStageLabel, benefits: benefitsPercent, overall };
}
