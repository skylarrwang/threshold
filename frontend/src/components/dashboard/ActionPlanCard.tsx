import type { ActionPlanItem } from '@/types';
import { cn } from '@/lib/utils';

interface ActionPlanCardProps {
  item: ActionPlanItem;
}

function getStatusBadge(status: ActionPlanItem['status']) {
  switch (status) {
    case 'in_progress':
      return (
        <span className="px-3 py-1 bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold rounded-full uppercase tracking-wider">
          In Progress
        </span>
      );
    case 'pending':
      return (
        <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-wider">
          Pending
        </span>
      );
    case 'done':
      return (
        <span className="px-3 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-full uppercase tracking-wider">
          Done
        </span>
      );
  }
}

export function ActionPlanCard({ item }: ActionPlanCardProps) {
  const isDone = item.status === 'done';

  return (
    <div
      className={cn(
        'group relative bg-surface-container-lowest p-6 rounded-xl transition-all duration-300',
        'border-b-2 border-transparent hover:border-primary',
        isDone && 'opacity-70'
      )}
    >
      <div className="flex items-start gap-6">
        <div
          className={cn(
            'p-4 rounded-xl',
            isDone ? 'bg-primary/10 text-primary' : 'bg-surface-container-low text-primary'
          )}
        >
          <span className="material-symbols-outlined text-3xl">{item.icon}</span>
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-start mb-1">
            <h4
              className={cn(
                'text-lg font-bold text-on-surface',
                isDone && 'line-through'
              )}
            >
              {item.title}
            </h4>
            {getStatusBadge(item.status)}
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
