import type { JobApplication } from '@/types';

interface KanbanCardProps {
  job: JobApplication;
}

const logoColors = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-tertiary text-on-tertiary',
  'bg-primary-container text-on-primary-container',
];

function getLogoColor(initial: string): string {
  const idx = initial.charCodeAt(0) % logoColors.length;
  return logoColors[idx];
}

export function KanbanCard({ job }: KanbanCardProps) {
  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-[0_4px_16px_rgba(26,28,28,0.06)] hover:shadow-[0_8px_24px_rgba(26,28,28,0.10)] transition-shadow cursor-pointer">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-headline flex-shrink-0 ${getLogoColor(job.logoInitial)}`}
        >
          {job.logoInitial}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-headline font-bold text-sm text-on-surface leading-tight truncate">
            {job.title}
          </h4>
          <p className="text-xs text-on-surface-variant truncate">{job.company}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-on-surface-variant mb-2">
        <span className="material-symbols-outlined text-[14px]">location_on</span>
        <span className="text-[11px]">{job.location}</span>
      </div>

      {job.salary && (
        <div className="flex items-center gap-1 text-on-surface-variant mb-2">
          <span className="material-symbols-outlined text-[14px]">payments</span>
          <span className="text-[11px] font-medium">{job.salary}</span>
        </div>
      )}

      {job.notes && (
        <p className="text-[11px] italic text-on-surface-variant mt-2 leading-snug">
          {job.notes}
        </p>
      )}
    </div>
  );
}
