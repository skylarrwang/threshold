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
  // Derive logo initial from company name
  const logoInitial = job.company.charAt(0).toUpperCase();

  return (
    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-[0_4px_16px_rgba(26,28,28,0.06)] hover:shadow-[0_8px_24px_rgba(26,28,28,0.10)] transition-shadow cursor-pointer">
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-headline flex-shrink-0 ${getLogoColor(logoInitial)}`}
        >
          {logoInitial}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-headline font-bold text-sm text-on-surface leading-tight truncate">
            {job.position}
          </h4>
          <p className="text-xs text-on-surface-variant truncate">{job.company}</p>
        </div>
      </div>

      {/* Stage label badge */}
      {job.stage_label && (
        <div className="flex items-center gap-1 text-on-surface-variant mb-2">
          <span className="text-[10px] font-medium bg-surface-container-high px-2 py-0.5 rounded-full">
            {job.stage_label}
          </span>
        </div>
      )}

      {/* Interview info if scheduled */}
      {job.interview_date && (
        <div className="flex items-center gap-1 text-primary mb-2">
          <span className="material-symbols-outlined text-[14px]">event</span>
          <span className="text-[11px] font-medium">
            Interview: {job.interview_date}
            {job.interview_time && ` at ${job.interview_time}`}
          </span>
        </div>
      )}

      {/* Offer salary if available */}
      {job.offer_salary && (
        <div className="flex items-center gap-1 text-secondary mb-2">
          <span className="material-symbols-outlined text-[14px]">payments</span>
          <span className="text-[11px] font-medium">{job.offer_salary}</span>
        </div>
      )}

      {/* Follow-up date if set */}
      {job.follow_up_date && (
        <div className="flex items-center gap-1 text-on-surface-variant mb-2">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span className="text-[11px]">Follow up: {job.follow_up_date}</span>
        </div>
      )}

      {/* Next action hint */}
      {job.next_action && (
        <div className="flex items-center gap-1 text-tertiary mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          <span className="text-[11px] font-medium">{job.next_action}</span>
        </div>
      )}

      {job.notes && (
        <p className="text-[11px] italic text-on-surface-variant mt-2 leading-snug">
          {job.notes}
        </p>
      )}

      {/* Apply URL link */}
      {job.apply_url && (
        <a
          href={job.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          View posting
        </a>
      )}
    </div>
  );
}
