import { cn } from '@/lib/utils';
import type { DomainCardState, WorkflowUpdate } from '@/types';
import { DomainCardShell } from './DomainCardShell';

/**
 * Housing checklist items mapped to tool completions.
 * Each item is checked off when the corresponding tool(s) have run at least once.
 */
const CHECKLIST: {
  id: string;
  label: string;
  detail?: string;
  icon: string;
  tools: string[];
}[] = [
  {
    id: 'pipeline_check',
    label: 'Check existing applications',
    icon: 'checklist',
    tools: ['get_housing_pipeline_status'],
  },
  {
    id: 'profile_review',
    label: 'Review your situation',
    detail: 'Location, offense category, housing status, income',
    icon: 'person_search',
    tools: ['read_user_memory'],
  },
  {
    id: 'reentry_search',
    label: 'Search reentry housing programs',
    icon: 'domain',
    tools: ['find_reentry_housing'],
  },
  {
    id: 'hud_search',
    label: 'Search HUD counseling & 211',
    icon: 'travel_explore',
    tools: ['search_housing'],
  },
  {
    id: 'shelter_search',
    label: 'Find emergency shelters',
    icon: 'night_shelter',
    tools: ['find_emergency_shelter'],
  },
  {
    id: 'pha_guide',
    label: 'Look up public housing / Section 8',
    icon: 'account_balance',
    tools: ['get_pha_guide'],
  },
  {
    id: 'fair_chance',
    label: 'Check fair chance housing laws',
    icon: 'gavel',
    tools: ['get_fair_chance_housing_laws'],
  },
  {
    id: 'fair_market_rents',
    label: 'Look up fair market rents',
    icon: 'payments',
    tools: ['get_fair_market_rents'],
  },
  {
    id: 'app_prep',
    label: 'Prepare application documents',
    detail: 'ID, income proof, SSN, references',
    icon: 'assignment',
    tools: ['prepare_housing_application'],
  },
  {
    id: 'app_logged',
    label: 'Log housing application(s)',
    icon: 'assignment_turned_in',
    tools: ['log_housing_application'],
  },
];

function getCompletedTools(events: WorkflowUpdate[]): Set<string> {
  const tools = new Set<string>();
  for (const evt of events) {
    if (evt.event === 'tool_result' && evt.tool) {
      tools.add(evt.tool);
    }
  }
  return tools;
}

function getToolDetail(events: WorkflowUpdate[], tool: string): string | undefined {
  // Find the last event for this tool and extract a meaningful detail
  const matching = events.filter((e) => e.tool === tool && e.event === 'tool_result');
  if (matching.length === 0) return undefined;
  const last = matching[matching.length - 1];
  const count = last.payload?.count as number | undefined;
  if (count) return `Found ${count}`;
  const program = last.payload?.program as string | undefined;
  if (program) return program;
  return undefined;
}

export function HousingCard({ card }: { card: DomainCardState }) {
  const completedTools = getCompletedTools(card.events);
  const checkedCount = CHECKLIST.filter((item) =>
    item.tools.some((t) => completedTools.has(t)),
  ).length;
  // Only show items that have been completed OR are relevant (always show all for now)
  // Filter out items that haven't been hit and aren't useful context
  const visibleItems = CHECKLIST.filter((item) => {
    const isChecked = item.tools.some((t) => completedTools.has(t));
    // Always show checked items; for unchecked, show items that are broadly relevant
    // (skip shelter/FMR if they weren't searched — those are situational)
    if (isChecked) return true;
    if (item.id === 'shelter_search' || item.id === 'fair_market_rents') return false;
    return true;
  });

  const collapsedSummary = `${checkedCount} of ${visibleItems.length} steps completed`;

  return (
    <DomainCardShell
      icon="home"
      title="Housing"
      isActive={card.isActive}
      completedAt={card.completedAt}
      collapsedSummary={collapsedSummary}
    >
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-on-surface-variant/60">
            Progress
          </span>
          <span className="text-[10px] font-bold text-primary tabular-nums">
            {checkedCount}/{visibleItems.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-outline-variant/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${visibleItems.length ? (checkedCount / visibleItems.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-0.5">
        {visibleItems.map((item) => {
          const isChecked = item.tools.some((t) => completedTools.has(t));
          const isRunning = card.isActive && !isChecked &&
            card.events.some((e) => e.event === 'tool_result') &&
            !isChecked;
          const detail = isChecked ? getToolDetail(card.events, item.tools[0]) : item.detail;

          // Find if this tool is the one currently being worked on
          // (it's the next unchecked item while the agent is active)
          const isNext = card.isActive && !isChecked &&
            visibleItems.filter((v) => v.tools.some((t) => completedTools.has(t))).length ===
            visibleItems.indexOf(item) - (visibleItems.filter((v, vi) => vi < visibleItems.indexOf(item) && !v.tools.some((t) => completedTools.has(t))).length);

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-start gap-2 py-1.5 px-1 rounded-md transition-all duration-300',
                isChecked && 'opacity-80',
              )}
              style={isChecked ? { animation: 'fadeSlideIn 0.3s ease-out' } : undefined}
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300',
                  isChecked
                    ? 'bg-primary'
                    : 'border border-outline-variant/30',
                )}
              >
                {isChecked && (
                  <span
                    className="material-symbols-outlined text-on-primary"
                    style={{ fontVariationSettings: "'FILL' 1", fontSize: '12px' }}
                  >
                    check
                  </span>
                )}
              </div>

              {/* Label + detail */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    'text-[11px] leading-snug block',
                    isChecked
                      ? 'text-on-surface-variant/60 line-through decoration-primary/30'
                      : 'text-on-surface font-medium',
                  )}
                >
                  {item.label}
                </span>
                {detail && (
                  <span className={cn(
                    'text-[10px] block mt-0.5',
                    isChecked ? 'text-primary/60 font-medium' : 'text-on-surface-variant/40',
                  )}>
                    {detail}
                  </span>
                )}
              </div>

              {/* Icon */}
              <span
                className={cn(
                  'material-symbols-outlined flex-shrink-0',
                  isChecked ? 'text-primary/40' : 'text-on-surface-variant/20',
                )}
                style={{ fontSize: '14px' }}
              >
                {item.icon}
              </span>
            </div>
          );
        })}
      </div>

      {/* Active spinner */}
      {card.isActive && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline-variant/10">
          <span className="material-symbols-outlined text-primary animate-spin" style={{ fontSize: '14px' }}>
            progress_activity
          </span>
          <span className="text-[10px] text-on-surface-variant/60 font-medium">
            Housing specialist is working...
          </span>
        </div>
      )}
    </DomainCardShell>
  );
}
