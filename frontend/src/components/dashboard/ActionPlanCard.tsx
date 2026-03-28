import type { ActionPlanItem } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/shared/Badge';

interface ActionPlanCardProps {
  item: ActionPlanItem;
}

const ACTION_BADGE: Record<ActionPlanItem['status'], { variant: 'pending' | 'default' | 'done'; label: string }> = {
  in_progress: { variant: 'pending', label: 'In Progress' },
  pending: { variant: 'default', label: 'Pending' },
  done: { variant: 'done', label: 'Done' },
};

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
            <Badge variant={ACTION_BADGE[item.status].variant}>
              {ACTION_BADGE[item.status].label}
            </Badge>
          </div>
          <p className="text-sm text-on-surface-variant leading-relaxed">{item.description}</p>
        </div>
      </div>
    </div>
  );
}
