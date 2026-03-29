import { useHousingStore } from '@/store/housingStore';
import { useJobStore } from '@/store/jobStore';
import { useBenefitsStore } from '@/store/benefitsStore';
import { useDocumentsStore } from '@/store/documentsStore';
import { useProfileStore } from '@/store/profileStore';

export interface ProgressSummary {
  housing: number;
  employment: number;
  benefits: number;
  documents: number;
  overall: number;
}

export function useProgressSummary(): ProgressSummary {
  const housing = useHousingStore((s) => s.voucher.progressPercent);
  const jobs = useJobStore((s) => s.jobs);
  const benefits = useBenefitsStore((s) => s.benefits);
  const documents = useDocumentsStore((s) => s.completionPercent);
  const overall = useProfileStore((s) => s.overallProgress);

  const activeJobs = jobs.filter((j) => j.status === 'offer' || j.status === 'interviewing').length;
  const employment = jobs.length > 0 ? Math.round((activeJobs / jobs.length) * 100) : 0;

  const activeBenefits = benefits.filter((b) => b.status === 'active').length;
  const benefitsPercent = benefits.length > 0 ? Math.round((activeBenefits / benefits.length) * 100) : 0;

  return { housing, employment, benefits: benefitsPercent, documents, overall };
}
