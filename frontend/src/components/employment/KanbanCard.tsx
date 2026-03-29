import { useState } from 'react';
import type { JobApplication, JobPipelineStage } from '@/types';
import { useJobStore } from '@/store/jobStore';

interface KanbanCardProps {
  job: JobApplication;
  onEdit?: (job: JobApplication) => void;
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

/** Add business days to a date (skips weekends) */
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
}

/** Format date as MM/DD/YYYY */
function formatShortDate(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
}

/** Calculate days between two dates */
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Status options for the move dropdown, grouped by column
const statusOptions: { label: string; value: JobPipelineStage }[] = [
  { label: 'Interested', value: 'interested' },
  { label: 'Preparing', value: 'preparing' },
  { label: 'Applied', value: 'applied' },
  { label: 'Screening', value: 'screening' },
  { label: 'Interview Scheduled', value: 'interview_scheduled' },
  { label: 'Interviewed', value: 'interviewed' },
  { label: 'Follow Up', value: 'follow_up' },
  { label: 'Offer Received', value: 'offer_received' },
  { label: 'Negotiating', value: 'negotiating' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Started', value: 'started' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' },
];

export function KanbanCard({ job, onEdit }: KanbanCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const deleteApplication = useJobStore((s) => s.deleteApplication);
  const updateApplication = useJobStore((s) => s.updateApplication);

  // Derive logo initial from company name
  const logoInitial = job.company.charAt(0).toUpperCase();

  // Determine stage categories
  const isInProgressStage = job.status === 'interested' || job.status === 'preparing';
  const isAppliedStage = job.status === 'applied' || job.status === 'screening';

  // Calculate follow-up suggestion for applied jobs
  const appliedDate = job.created_at ? new Date(job.created_at) : null;
  const today = new Date();

  let daysSinceApplied: number | null = null;
  let suggestedFollowUpDate: string | null = null;

  if (isAppliedStage && appliedDate) {
    daysSinceApplied = daysBetween(appliedDate, today);
    // Suggest follow-up 5 business days after applying
    const followUpDate = addBusinessDays(appliedDate, 5);
    suggestedFollowUpDate = formatShortDate(followUpDate);
  }

  // Check if user already has an explicit follow-up date set
  const hasExplicitFollowUp = Boolean(job.follow_up_date);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${job.position}" at ${job.company}?`)) {
      await deleteApplication(job.id);
    }
  };

  const handleStatusChange = async (newStatus: JobPipelineStage) => {
    setMenuOpen(false);
    if (newStatus !== job.status) {
      await updateApplication(job.id, { status: newStatus });
    }
  };

  return (
    <div
      className="bg-surface-container-lowest p-5 rounded-xl shadow-[0_4px_16px_rgba(26,28,28,0.06)] hover:shadow-[0_8px_24px_rgba(26,28,28,0.10)] transition-shadow cursor-pointer relative group"
      onClick={() => onEdit?.(job)}
    >
      {/* Action buttons - top right */}
      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move/status menu button */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            title="Change status"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <>
              {/* Backdrop to close menu */}
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                }}
              />
              <div className="absolute right-0 top-8 z-20 bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant py-2 min-w-[180px]">
                <p className="px-3 py-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wide">
                  Move to
                </p>
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStatusChange(option.value);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-container-high transition-colors flex items-center gap-2 ${
                      option.value === job.status ? 'text-primary font-medium' : 'text-on-surface'
                    }`}
                  >
                    {option.value === job.status && (
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    )}
                    <span className={option.value === job.status ? '' : 'ml-5'}>{option.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delete button - only for in-progress jobs */}
        {isInProgressStage && (
          <button
            onClick={handleDelete}
            className="p-1.5 rounded-lg hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        )}
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold font-headline flex-shrink-0 ${getLogoColor(logoInitial)}`}
        >
          {logoInitial}
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <h4 className="font-headline font-bold text-sm text-on-surface leading-tight truncate">
            {job.position}
          </h4>
          <p className="text-xs text-on-surface-variant truncate">{job.company}</p>
        </div>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap items-center gap-1 mb-2">
        {job.stage_label && (
          <span className="text-[10px] font-medium bg-surface-container-high px-2 py-0.5 rounded-full text-on-surface-variant">
            {job.stage_label}
          </span>
        )}
        {job.fair_chance_employer && (
          <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
            Fair Chance
          </span>
        )}
        {job.source && (
          <span className="text-[10px] font-medium bg-surface-container-high px-2 py-0.5 rounded-full text-on-surface-variant">
            via {job.source}
          </span>
        )}
      </div>

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

      {/* For applied jobs: personalized follow-up suggestion */}
      {isAppliedStage && !hasExplicitFollowUp && suggestedFollowUpDate && (
        <>
          {/* Brown: actionable suggestion as question */}
          <div className="flex items-center gap-1 text-tertiary mb-1">
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            <span className="text-[11px] font-medium">Follow up on {suggestedFollowUpDate}?</span>
          </div>
          {/* Gray: context */}
          {daysSinceApplied !== null && (
            <p className="text-[11px] text-on-surface-variant ml-5 mb-2">
              Applied {daysSinceApplied === 0 ? 'today' : daysSinceApplied === 1 ? 'yesterday' : `${daysSinceApplied} days ago`}
            </p>
          )}
        </>
      )}

      {/* Explicit follow-up date (user-set) - shown confidently */}
      {hasExplicitFollowUp && (
        <div className="flex items-center gap-1 text-tertiary mb-2">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span className="text-[11px] font-medium">Follow up: {job.follow_up_date}</span>
        </div>
      )}

      {/* Next action hint - only show for non-applied, non-in-progress stages */}
      {job.next_action && !isAppliedStage && !isInProgressStage && (
        <div className="flex items-center gap-1 text-tertiary mb-2">
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          <span className="text-[11px] font-medium">{job.next_action}</span>
        </div>
      )}

      {/* Notes - hide for applied and in-progress jobs */}
      {job.notes && !isAppliedStage && !isInProgressStage && (
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
