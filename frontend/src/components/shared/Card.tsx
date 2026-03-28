import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  variant?: 'base' | 'section' | 'elevated';
  className?: string;
  children: ReactNode;
}

export function Card({ variant = 'base', className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        {
          'bg-surface-container-lowest': variant === 'base' || variant === 'elevated',
          'bg-surface-container-low': variant === 'section',
          'shadow-[0_8px_32px_rgba(26,28,28,0.06)]': variant === 'elevated',
        },
        className
      )}
    >
      {children}
    </div>
  );
}
