import type { HousingApplication, HousingPipelineStage } from '@/types';
import { ApplicationCard } from './ApplicationCard';

const STAGE_ORDER: HousingPipelineStage[] = [
  'interview_scheduled',
  'screening',
  'applied',
  'voucher_issued',
  'unit_search',
  'waitlisted',
  'lease_review',
  'documents_gathering',
  'contacted',
  'discovered',
  'approved',
  'moved_in',
  'denied',
  'appeal_filed',
];

const STAGE_LABELS: Record<string, string> = {
  discovered: 'Found Programs',
  contacted: 'Contacted Intake',
  documents_gathering: 'Gathering Documents',
  applied: 'Applied',
  screening: 'Background Screening',
  waitlisted: 'On Waitlist',
  voucher_issued: 'Voucher Issued',
  unit_search: 'Searching for Unit',
  interview_scheduled: 'Interview / Viewing Set',
  approved: 'Approved',
  lease_review: 'Reviewing Lease',
  moved_in: 'Moved In',
  denied: 'Denied',
  appeal_filed: 'Appeal Filed',
};

interface ApplicationListProps {
  applications: HousingApplication[];
  onUpdateStatus?: (id: string) => void;
}

export function ApplicationList({ applications, onUpdateStatus }: ApplicationListProps) {
  // Group by stage
  const grouped: Record<string, HousingApplication[]> = {};
  for (const app of applications) {
    (grouped[app.status] ||= []).push(app);
  }

  return (
    <div className="space-y-6">
      {STAGE_ORDER.map((stage) => {
        const apps = grouped[stage];
        if (!apps || apps.length === 0) return null;

        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {STAGE_LABELS[stage] || stage}
              </h4>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {apps.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {apps.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  onUpdateStatus={onUpdateStatus}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
