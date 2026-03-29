/**
 * Live Context Panel — the right column of the two-column chat layout.
 *
 * Shows agent trace at top, then domain cards that materialize as subagents
 * activate and tools complete. Crisis card takes priority above all others.
 */
import { useEffect, useRef } from 'react';
import { useContextPanelStore } from '@/store/contextPanelStore';
import { useHousingStore } from '@/store/housingStore';
import { AgentTrace } from './AgentTrace';
import { CrisisCard } from '@/components/context-cards/CrisisCard';
import { HousingCard } from '@/components/context-cards/HousingCard';
import { cn } from '@/lib/utils';

export function ContextPanel() {
  const { cards, crisisActive } = useContextPanelStore();
  const fetchPipeline = useHousingStore((s) => s.fetchPipeline);
  const fetchAlerts = useHousingStore((s) => s.fetchAlerts);
  const prevActiveRef = useRef<Record<string, boolean>>({});

  // Auto-refresh domain data when a subagent completes
  useEffect(() => {
    for (const card of cards) {
      const wasActive = prevActiveRef.current[card.domain];
      if (wasActive && !card.isActive) {
        if (card.domain === 'housing') {
          fetchPipeline();
          fetchAlerts();
        }
      }
    }
    const next: Record<string, boolean> = {};
    for (const card of cards) {
      next[card.domain] = card.isActive;
    }
    prevActiveRef.current = next;
  }, [cards, fetchPipeline, fetchAlerts]);

  const hasAnyContent = cards.length > 0 || crisisActive;
  const anyActive = cards.some((c) => c.isActive);

  // Sort cards: most recently started first
  const sortedCards = [...cards].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-outline-variant/15 flex-shrink-0">
        <span
          className="material-symbols-outlined text-on-surface-variant/60"
          style={{ fontSize: '18px' }}
        >
          monitoring
        </span>
        <span className="text-xs font-semibold text-on-surface-variant tracking-wide uppercase flex-1">
          Live Context
        </span>
        {anyActive && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[10px] text-primary font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 no-scrollbar">
        {/* Agent trace — always visible */}
        <AgentTrace />

        {/* Crisis card — appears above all domain cards */}
        {crisisActive && <CrisisCard />}

        {/* Domain cards */}
        {sortedCards.map((card) => {
          switch (card.domain) {
            case 'housing':
              return <HousingCard key={card.domain} card={card} />;
            // Future: employment, benefits, legal
            default:
              return null;
          }
        })}

        {/* Empty state */}
        {!hasAnyContent && (
          <div className={cn(
            'flex flex-col items-center justify-center py-12 text-center',
            'text-on-surface-variant/30',
          )}>
            <span
              className="material-symbols-outlined mb-2"
              style={{ fontSize: '32px' }}
            >
              dashboard
            </span>
            <p className="text-xs font-medium">Context cards will appear here</p>
            <p className="text-[10px] mt-0.5">as the conversation progresses</p>
          </div>
        )}
      </div>
    </div>
  );
}
