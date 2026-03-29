import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DomainCardShellProps {
  icon: string;
  title: string;
  isActive: boolean;
  completedAt?: number;
  collapsedSummary?: string;
  children: React.ReactNode;
}

export function DomainCardShell({
  icon,
  title,
  isActive,
  completedAt,
  collapsedSummary,
  children,
}: DomainCardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const isCompleted = !isActive && !!completedAt;

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-right-4',
        isActive
          ? 'border-primary/30 bg-surface-container-low shadow-sm'
          : isCompleted
            ? 'border-outline-variant/15 bg-surface-container-low/60'
            : 'border-outline-variant/20 bg-surface-container-low',
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => isCompleted && setCollapsed((c) => !c)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors',
          isCompleted && 'cursor-pointer hover:bg-surface-container-high/30',
        )}
      >
        <div
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center',
            isActive ? 'bg-primary/15' : 'bg-outline-variant/10',
          )}
        >
          <span
            className={cn(
              'material-symbols-outlined text-sm',
              isActive ? 'text-primary' : 'text-on-surface-variant/60',
            )}
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '16px' }}
          >
            {icon}
          </span>
        </div>

        <span
          className={cn(
            'text-xs font-semibold tracking-wide uppercase flex-1 text-left',
            isActive ? 'text-on-surface' : 'text-on-surface-variant/70',
          )}
        >
          {title}
        </span>

        {isActive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[10px] text-primary font-medium">Live</span>
          </div>
        )}

        {isCompleted && (
          <>
            <span
              className="material-symbols-outlined text-xs text-primary/60"
              style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
            >
              check_circle
            </span>
            <span
              className={cn(
                'material-symbols-outlined text-xs text-outline transition-transform duration-200',
                collapsed ? '-rotate-90' : 'rotate-0',
              )}
              style={{ fontSize: '14px' }}
            >
              expand_more
            </span>
          </>
        )}
      </button>

      {/* Body */}
      {!collapsed ? (
        <div className="px-3 pb-3">{children}</div>
      ) : (
        collapsedSummary && (
          <div className="px-3 pb-2.5">
            <p className="text-[11px] text-on-surface-variant/60">{collapsedSummary}</p>
          </div>
        )
      )}
    </div>
  );
}
