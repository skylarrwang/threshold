import { useJobStore } from '@/store/jobStore';
import { KanbanCard } from './KanbanCard';

interface Column {
  id: string;
  label: string;
  status: 'applied' | 'interviewing' | 'offer';
  dotColor: string;
  badgeColor: string;
  badgeTextColor: string;
}

const columns: Column[] = [
  {
    id: 'applied',
    label: 'Applied',
    status: 'applied',
    dotColor: 'bg-on-surface-variant',
    badgeColor: 'bg-surface-container-high',
    badgeTextColor: 'text-on-surface-variant',
  },
  {
    id: 'interviewing',
    label: 'Interviewing',
    status: 'interviewing',
    dotColor: 'bg-primary',
    badgeColor: 'bg-primary-fixed',
    badgeTextColor: 'text-primary',
  },
  {
    id: 'offer',
    label: 'Offer Received',
    status: 'offer',
    dotColor: 'bg-secondary',
    badgeColor: 'bg-secondary-fixed',
    badgeTextColor: 'text-on-secondary-fixed',
  },
];

export function KanbanBoard() {
  const jobs = useJobStore((s) => s.jobs);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {columns.map((col) => {
        const colJobs = jobs.filter((j) => j.status === col.status);
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
              colJobs.map((job) => <KanbanCard key={job.id} job={job} />)
            ) : (
              <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center opacity-50">
                <span className="material-symbols-outlined text-3xl mb-2 text-on-surface-variant">
                  celebration
                </span>
                <p className="text-xs font-medium text-on-surface-variant italic">
                  Persistence pays off. Keep pushing.
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
