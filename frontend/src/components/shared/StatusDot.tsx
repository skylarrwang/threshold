import { cn } from '@/lib/utils';

interface StatusDotProps {
  online: boolean;
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ online, pulse = true, className }: StatusDotProps) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'w-2.5 h-2.5 rounded-full',
          online ? 'bg-primary' : 'bg-outline-variant'
        )}
      />
      {online && pulse && (
        <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-50" />
      )}
    </div>
  );
}
