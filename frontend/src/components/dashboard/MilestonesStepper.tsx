import type { Milestone } from '@/types';
import { cn } from '@/lib/utils';

interface MilestonesStepperProps {
  milestones: Milestone[];
}

function getStepLabel(status: Milestone['status']): { text: string; className: string } {
  switch (status) {
    case 'completed':
      return { text: 'Completed', className: 'text-primary' };
    case 'active':
      return { text: 'Next Phase', className: 'text-on-surface-variant' };
    case 'pending':
      return { text: 'Pending', className: 'text-on-surface-variant opacity-40' };
  }
}

function getDotClass(status: Milestone['status']): string {
  switch (status) {
    case 'completed':
      return 'bg-primary ring-4 ring-white';
    case 'active':
      return 'bg-white border-4 border-primary ring-4 ring-white';
    case 'pending':
      return 'bg-surface-container-high ring-4 ring-white';
  }
}

export function MilestonesStepper({ milestones }: MilestonesStepperProps) {
  const total = milestones.length;
  const completedCount = milestones.filter((m) => m.status === 'completed').length;
  const filledPercent = total > 1 ? (completedCount / (total - 1)) * 100 : 0;

  return (
    <div className="relative pl-5 space-y-7">
      {/* Background stepper line */}
      <div className="absolute left-[6px] top-1 w-0.5 h-full bg-primary-fixed rounded-full">
        {/* Filled portion */}
        <div
          className="w-full bg-primary rounded-full transition-all duration-500"
          style={{ height: `${filledPercent}%` }}
        />
      </div>

      {milestones.map((milestone) => {
        const label = getStepLabel(milestone.status);
        const dotClass = getDotClass(milestone.status);
        const isLowOpacity = milestone.status === 'pending';

        return (
          <div key={milestone.id} className="relative">
            <div
              className={cn(
                'absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full',
                dotClass
              )}
            />
            <p className={cn('text-xs font-bold uppercase', label.className)}>{label.text}</p>
            <p
              className={cn(
                'text-sm font-bold text-on-surface leading-5',
                isLowOpacity && 'opacity-40'
              )}
            >
              {milestone.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
