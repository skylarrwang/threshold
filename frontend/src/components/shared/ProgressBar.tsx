import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  gradient?: boolean;
}

export function ProgressBar({ value, max = 100, className, showLabel = false, gradient = true }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            gradient ? 'bg-gradient-to-r from-primary to-primary-container' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-bold text-primary min-w-[3ch]">{Math.round(percent)}%</span>
      )}
    </div>
  );
}
