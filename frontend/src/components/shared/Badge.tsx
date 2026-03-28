import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type BadgeVariant = 'active' | 'pending' | 'action' | 'error' | 'done' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  active: 'bg-primary text-on-primary',
  pending: 'bg-secondary-fixed text-on-secondary-fixed',
  action: 'bg-tertiary-fixed text-on-tertiary-fixed',
  error: 'bg-error-container text-on-error-container',
  done: 'bg-primary text-on-primary',
  default: 'bg-surface-container-high text-on-surface-variant',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
