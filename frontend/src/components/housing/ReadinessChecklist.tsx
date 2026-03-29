import { ProgressBar } from '@/components/shared/ProgressBar';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  helpAction?: string;
}

interface ReadinessChecklistProps {
  items: ChecklistItem[];
}

export function ReadinessChecklist({ items }: ReadinessChecklistProps) {
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-surface-container-lowest rounded-xl p-6 shadow-[0_2px_8px_rgba(26,28,28,0.04)]">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-headline font-bold text-on-surface">Move-In Readiness</h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {completed} of {total} complete
          </p>
        </div>
        <span className="text-sm font-bold text-primary">{percent}%</span>
      </div>

      <ProgressBar value={percent} className="mb-5" />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <span
              className={`material-symbols-outlined text-lg flex-shrink-0 ${
                item.done ? 'text-primary' : 'text-on-surface-variant/30'
              }`}
              style={item.done ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.done ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span
              className={`text-sm ${
                item.done ? 'text-on-surface font-medium' : 'text-on-surface-variant'
              }`}
            >
              {item.label}
            </span>
            {item.done && (
              <span className="ml-auto text-[10px] font-bold text-primary uppercase tracking-wide">
                Done
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
