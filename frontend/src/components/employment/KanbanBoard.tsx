import { useJobStore } from '@/store/jobStore';
import { KanbanCard } from './KanbanCard';
import { Button } from '@/components/shared/Button';
import type { JobPipelineStage } from '@/types';

interface Column {
  id: string;
  label: string;
  // Backend stages that map to this column
  stages: JobPipelineStage[];
  dotColor: string;
  badgeColor: string;
  badgeTextColor: string;
}

// Map the 13-stage pipeline to 4 UI columns
const columns: Column[] = [
  {
    id: 'in_progress',
    label: 'In Progress',
    stages: ['interested', 'preparing'],
    dotColor: 'bg-tertiary',
    badgeColor: 'bg-tertiary-fixed',
    badgeTextColor: 'text-on-tertiary-fixed',
  },
  {
    id: 'applied',
    label: 'Applied',
    stages: ['applied', 'screening'],
    dotColor: 'bg-on-surface-variant',
    badgeColor: 'bg-surface-container-high',
    badgeTextColor: 'text-on-surface-variant',
  },
  {
    id: 'interviewing',
    label: 'Interviewing',
    stages: ['interview_scheduled', 'interviewed', 'follow_up'],
    dotColor: 'bg-primary',
    badgeColor: 'bg-primary-fixed',
    badgeTextColor: 'text-primary',
  },
  {
    id: 'offer',
    label: 'Offer Received',
    stages: ['offer_received', 'negotiating', 'accepted', 'started'],
    dotColor: 'bg-secondary',
    badgeColor: 'bg-secondary-fixed',
    badgeTextColor: 'text-on-secondary-fixed',
  },
];

export function KanbanBoard() {
  const jobs = useJobStore((s) => s.jobs);
  const pipelineLoading = useJobStore((s) => s.pipelineLoading);
  const pipelineError = useJobStore((s) => s.pipelineError);
  const fetchPipeline = useJobStore((s) => s.fetchPipeline);
  const setEditModalOpen = useJobStore((s) => s.setEditModalOpen);
  const setLogModalOpen = useJobStore((s) => s.setLogModalOpen);

  if (pipelineLoading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span>Loading applications...</span>
        </div>
      </div>
    );
  }

  if (pipelineError) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-error text-center">
          <span className="material-symbols-outlined text-3xl mb-2">error</span>
          <p>Failed to load applications</p>
          <button
            onClick={() => fetchPipeline()}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // Filter out rejected/withdrawn for the main board
  const activeJobs = jobs.filter((j) => j.status !== 'rejected' && j.status !== 'withdrawn');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
      {columns.map((col) => {
        const colJobs = activeJobs.filter((j) => col.stages.includes(j.status));
        return (
          <div key={col.id} className="bg-surface-container-low rounded-xl p-4 space-y-3">
            {/* Column header */}
            <div className="flex items-center gap-2 px-1 mb-1">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dotColor}`} />
              <h3 className="font-headline font-bold text-sm text-on-surface">{col.label}</h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto ${col.badgeColor} ${col.badgeTextColor}`}
              >
                {colJobs.length}
              </span>
            </div>

            {/* Cards */}
            {colJobs.length > 0 ? (
              colJobs.map((job) => (
                <KanbanCard
                  key={job.id}
                  job={job}
                  onEdit={(j) => setEditModalOpen(true, j)}
                />
              ))
            ) : (
              <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center opacity-50">
                <span className="material-symbols-outlined text-3xl mb-2 text-on-surface-variant">
                  celebration
                </span>
                <p className="text-xs font-medium text-on-surface-variant italic mb-3">
                  Persistence pays off. Keep pushing.
                </p>
                {col.id === 'applied' && (
                  <Button variant="ghost" size="sm" onClick={() => setLogModalOpen(true)}>
                    Log your first application
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
