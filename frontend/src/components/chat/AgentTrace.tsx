import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { cn } from '@/lib/utils';
import type { AgentStep } from '@/types';

const STEP_ICONS: Record<string, string> = {
  thinking: 'psychology',
  subagent: 'smart_toy',
  tool: 'build',
  node: 'account_tree',
  reasoning: 'neurology',
};

function stepIcon(step: AgentStep): string {
  return step.icon || STEP_ICONS[step.stepType] || 'radio_button_checked';
}

function StepRow({ step, isLatest }: { step: AgentStep; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const active = step.status === 'started';
  const completed = step.status === 'completed';
  const hasDetail = step.stepType === 'reasoning' && !!step.detail;

  return (
    <div className="transition-all duration-300">
      <div
        className={cn(
          'flex items-center gap-2.5 py-1.5',
          isLatest && active ? 'opacity-100' : 'opacity-80',
          hasDetail && 'cursor-pointer',
        )}
        onClick={hasDetail ? () => setExpanded((e) => !e) : undefined}
      >
        {/* Icon */}
        <div
          className={cn(
            'w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0',
            completed
              ? step.stepType === 'reasoning' ? 'bg-tertiary/15' : 'bg-primary/15'
              : 'bg-secondary-fixed/40',
          )}
        >
          <span
            className={cn(
              'material-symbols-outlined text-xs',
              completed
                ? step.stepType === 'reasoning' ? 'text-tertiary' : 'text-primary'
                : 'text-secondary',
              active && isLatest && 'animate-pulse',
            )}
            style={{ fontVariationSettings: "'FILL' 1", fontSize: '14px' }}
          >
            {step.stepType === 'reasoning' ? 'psychology' : completed ? 'check_circle' : stepIcon(step)}
          </span>
        </div>

        {/* Label */}
        <span
          className={cn(
            'text-xs leading-snug flex-1',
            completed ? 'text-on-surface-variant/70' : 'text-on-surface-variant font-medium',
          )}
        >
          {step.stepType === 'reasoning' ? 'Thought process' : step.label}
        </span>

        {/* Expand chevron for reasoning */}
        {hasDetail && (
          <span
            className={cn(
              'material-symbols-outlined text-xs text-outline transition-transform duration-200',
              expanded ? 'rotate-180' : '',
            )}
            style={{ fontSize: '14px' }}
          >
            expand_more
          </span>
        )}

        {/* Animated dots for active step */}
        {active && isLatest && (
          <div className="flex gap-0.5 mr-1">
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

      {/* Expandable reasoning detail */}
      {hasDetail && expanded && (
        <div className="ml-7.5 mt-1 mb-2 px-3 py-2 rounded-lg bg-surface-container-high/40 text-[11px] text-on-surface-variant/70 leading-relaxed whitespace-pre-wrap">
          {step.detail}
        </div>
      )}
    </div>
  );
}

export function AgentTrace() {
  const { agentSteps, streamingMessageId } = useChatStore();
  const [collapsed, setCollapsed] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const isActive = streamingMessageId !== null;

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [agentSteps.length]);

  if (agentSteps.length === 0) return null;

  const completedCount = agentSteps.filter((s) => s.status === 'completed').length;
  const activeStep = agentSteps.findLast((s) => s.status === 'started');
  const lastStepId = agentSteps[agentSteps.length - 1]?.id;

  const doneThinking =
    !isActive &&
    agentSteps.length > 0 &&
    agentSteps[agentSteps.length - 1].status === 'completed';

  return (
    <div
      className={cn(
        'mx-4 mb-3 rounded-xl border overflow-hidden transition-all duration-300',
        doneThinking
          ? 'border-outline-variant/10 bg-surface-container-low/50'
          : 'border-outline-variant/20 bg-surface-container-low',
      )}
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-container-high/30 transition-colors"
      >
        <span
          className={cn(
            'material-symbols-outlined text-sm transition-transform duration-200',
            collapsed ? '-rotate-90' : 'rotate-0',
          )}
          style={{ fontVariationSettings: "'FILL' 0", fontSize: '16px' }}
        >
          expand_more
        </span>

        <span className="text-[11px] font-semibold text-on-surface-variant tracking-wide uppercase flex-1 text-left">
          {doneThinking
            ? `Completed ${completedCount} steps`
            : activeStep
              ? activeStep.label
              : 'Working...'}
        </span>

        {/* Step counter badge */}
        <span className="text-[10px] text-outline font-medium tabular-nums">
          {completedCount}/{agentSteps.length}
        </span>

        {/* Progress shimmer for active */}
        {!doneThinking && (
          <div className="w-8 h-1 rounded-full bg-outline-variant/10 overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-secondary/50 to-transparent animate-[shimmer_1.5s_ease-in-out_infinite]" />
          </div>
        )}
      </button>

      {/* Step list — collapsible */}
      {!collapsed && (
        <div
          ref={listRef}
          className={cn(
            'px-3 pb-2 overflow-y-auto transition-all duration-300',
            agentSteps.length > 6 ? 'max-h-48' : '',
          )}
        >
          <div className="border-l border-outline-variant/20 ml-2 pl-3 space-y-0.5">
            {agentSteps.map((step) => (
              <StepRow
                key={step.id + step.status}
                step={step}
                isLatest={step.id === lastStepId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
