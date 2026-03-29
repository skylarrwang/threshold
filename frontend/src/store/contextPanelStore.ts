/**
 * Zustand store for the live context panel.
 *
 * Tracks domain cards that persist across multiple agent calls within a session.
 * Checklist items accumulate — they never reset when the same subagent runs again.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DomainCardState, WorkflowDomain, WorkflowUpdate } from '@/types';
import type { WsMessage } from '@/lib/api';

interface ContextPanelState {
  cards: DomainCardState[];
  crisisActive: boolean;

  handleWorkflowUpdate: (msg: WsMessage) => void;
  clearCards: () => void;
  dismissCrisis: () => void;
}

let eventCounter = 0;

export const useContextPanelStore = create<ContextPanelState>()(
  persist(
    (set) => ({
      cards: [],
      crisisActive: false,

      handleWorkflowUpdate: (msg) => {
        const domain = msg.domain as WorkflowDomain | undefined;
        const event = msg.workflow_event as WorkflowUpdate['event'] | undefined;
        if (!domain || !event) return;

        const now = Date.now();
        const update: WorkflowUpdate = {
          id: `wf-${++eventCounter}`,
          timestamp: now,
          domain,
          event,
          tool: msg.tool as string | undefined,
          label: (msg.label as string) ?? '',
          workflowStage: msg.workflow_stage as number | undefined,
          payload: msg.payload as Record<string, unknown> | undefined,
        };

        if (event === 'crisis') {
          set({ crisisActive: true });
          return;
        }

        set((state) => {
          const cards = [...state.cards];
          const idx = cards.findIndex((c) => c.domain === domain);

          if (event === 'start') {
            if (idx >= 0) {
              // Reactivate — keep existing events, just mark active
              cards[idx] = {
                ...cards[idx],
                isActive: true,
                completedAt: undefined,
              };
            } else {
              cards.push({
                domain,
                isActive: true,
                startedAt: now,
                workflowStage: 0,
                events: [],
              });
            }
          } else if (event === 'tool_result') {
            if (idx >= 0) {
              cards[idx] = {
                ...cards[idx],
                workflowStage: Math.max(
                  cards[idx].workflowStage,
                  update.workflowStage ?? cards[idx].workflowStage,
                ),
                events: [...cards[idx].events, update],
              };
            }
          } else if (event === 'end') {
            if (idx >= 0) {
              cards[idx] = {
                ...cards[idx],
                isActive: false,
                completedAt: now,
                events: [...cards[idx].events, update],
              };
            }
          }

          return { cards };
        });
      },

      clearCards: () => {
        eventCounter = 0;
        set({ cards: [], crisisActive: false });
      },

      dismissCrisis: () => set({ crisisActive: false }),
    }),
    {
      name: 'threshold-context-panel',
      partialize: (state) => ({
        cards: state.cards,
      }),
    },
  ),
);
