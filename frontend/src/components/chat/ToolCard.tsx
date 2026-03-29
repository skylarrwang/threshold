import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const TOOL_ICONS: Record<string, string> = {
  search_jobs: 'work',
  autofill_job_application: 'open_in_browser',
  search_housing: 'home',
  subagent: 'smart_toy',
};

function getIcon(tool: string): string {
  if (tool.startsWith('check_') && tool.endsWith('_eligibility')) return 'fact_check';
  return TOOL_ICONS[tool] ?? 'manage_search';
}

type Phase = 'active' | 'completing' | 'done';

interface ToolCardProps {
  activeToolCall: { tool: string; label: string } | null;
}

export function ToolCard({ activeToolCall }: ToolCardProps) {
  const [phase, setPhase] = useState<Phase>('done');
  const [snapshot, setSnapshot] = useState<{ tool: string; label: string } | null>(null);

  useEffect(() => {
    if (activeToolCall) {
      setSnapshot(activeToolCall);
      setPhase('active');
    } else if (phase === 'active') {
      setPhase('completing');
      const t = setTimeout(() => setPhase('done'), 1800);
      return () => clearTimeout(t);
    }
  }, [activeToolCall]);

  if (phase === 'done' || !snapshot) return null;

  const icon = getIcon(snapshot.tool);
  const isCompleting = phase === 'completing';

  return (
    <div
      className={cn(
        'mx-4 mb-3 rounded-xl border border-outline-variant/20 bg-surface-container-low overflow-hidden',
        'transition-all duration-300',
        isCompleting ? 'opacity-60' : 'opacity-100'
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="w-7 h-7 rounded-lg bg-secondary-fixed/40 flex items-center justify-center flex-shrink-0">
          <span
            className={cn(
              'material-symbols-outlined text-sm text-secondary',
              !isCompleting && 'animate-pulse'
            )}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {isCompleting ? 'check_circle' : icon}
          </span>
        </div>

        <span className="text-xs font-medium text-on-surface-variant flex-1">
          {isCompleting ? `✓ ${snapshot.label.replace(/\.\.\.$/, 'done')}` : snapshot.label}
        </span>

        {!isCompleting && (
          <div className="flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1 h-1 rounded-full bg-secondary animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress shimmer */}
      {!isCompleting && (
        <div className="h-0.5 bg-outline-variant/10 overflow-hidden">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-secondary/40 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
      )}
    </div>
  );
}
