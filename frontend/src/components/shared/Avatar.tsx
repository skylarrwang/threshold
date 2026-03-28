import { cn } from '@/lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  online?: boolean;
}

export function Avatar({ name, size = 'md', className, online }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'rounded-full bg-primary-fixed flex items-center justify-center font-bold text-on-primary-fixed',
          sizeClasses[size]
        )}
      >
        {initials}
      </div>
      {online !== undefined && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white',
            online ? 'bg-primary' : 'bg-outline-variant'
          )}
        />
      )}
    </div>
  );
}
