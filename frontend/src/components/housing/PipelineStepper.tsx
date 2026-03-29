import { cn } from '@/lib/utils';
import type { HousingPipelineStage, HousingApplication } from '@/types';

const STAGES: { key: HousingPipelineStage; label: string; icon: string }[] = [
  { key: 'discovered', label: 'Found', icon: 'search' },
  { key: 'contacted', label: 'Contacted', icon: 'call' },
  { key: 'documents_gathering', label: 'Docs', icon: 'description' },
  { key: 'applied', label: 'Applied', icon: 'send' },
  { key: 'screening', label: 'Screening', icon: 'fact_check' },
  { key: 'waitlisted', label: 'Waitlist', icon: 'hourglass_top' },
  { key: 'interview_scheduled', label: 'Interview', icon: 'event' },
  { key: 'approved', label: 'Approved', icon: 'check_circle' },
  { key: 'lease_review', label: 'Lease', icon: 'contract' },
  { key: 'moved_in', label: 'Moved In', icon: 'home' },
];

interface PipelineStepperProps {
  applications: HousingApplication[];
}

export function PipelineStepper({ applications }: PipelineStepperProps) {
  // Count applications at each stage
  const countByStage: Record<string, number> = {};
  for (const app of applications) {
    countByStage[app.status] = (countByStage[app.status] || 0) + 1;
  }

  // Find the furthest active stage
  const stageOrder = STAGES.map((s) => s.key);
  let furthestIndex = -1;
  for (const app of applications) {
    if (app.status === 'denied' || app.status === 'appeal_filed') continue;
    const idx = stageOrder.indexOf(app.status);
    if (idx > furthestIndex) furthestIndex = idx;
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-center gap-1 min-w-[640px]">
        {STAGES.map((stage, i) => {
          const count = countByStage[stage.key] || 0;
          const isReached = i <= furthestIndex;
          const isCurrent = i === furthestIndex;

          return (
            <div key={stage.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                    isCurrent
                      ? 'bg-primary text-on-primary shadow-md'
                      : isReached
                        ? 'bg-primary/20 text-primary'
                        : 'bg-surface-container-high text-on-surface-variant/40'
                  )}
                >
                  <span className="material-symbols-outlined text-xl">{stage.icon}</span>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wide mt-1.5 text-center',
                    isCurrent
                      ? 'text-primary'
                      : isReached
                        ? 'text-on-surface'
                        : 'text-on-surface-variant/50'
                  )}
                >
                  {stage.label}
                </span>
                {count > 0 && (
                  <span className="text-[10px] font-bold text-primary mt-0.5">{count}</span>
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    'h-0.5 flex-1 min-w-4 mt-[-18px]',
                    i < furthestIndex ? 'bg-primary/30' : 'bg-outline-variant/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
