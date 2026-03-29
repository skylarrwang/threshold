import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AgentStep, Conversation, Message } from '@/types';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

let convCounter = 1;

function makeConversation(title?: string): Conversation {
  const id = `conv-${Date.now()}-${convCounter++}`;
  return {
    id,
    title: title || 'New chat',
    lastMessage: '',
    lastTimestamp: new Date().toISOString(),
    unreadCount: 0,
  };
}

function makeWelcomeMessage(conversationId: string): Message {
  return {
    id: `msg-welcome-${conversationId}`,
    conversationId,
    senderId: 'ai-threshold',
    senderName: 'Threshold AI',
    content:
      "Hi! I'm here to help you navigate re-entry. I can search for jobs, housing, check your benefits eligibility, and more. What would you like to work on today?",
    timestamp: new Date().toISOString(),
    isRead: true,
    isAI: true,
  };
}

const firstConversation = makeConversation('New chat');

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string;
  messages: Message[];
  isTyping: boolean;
  wsStatus: WsStatus;
  streamingMessageId: string | null;
  activeToolCall: { tool: string; label: string } | null;
  isCrisisMode: boolean;
  agentSteps: AgentStep[];
  setActiveConversation: (id: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  addMessage: (message: Message) => void;
  setTyping: (typing: boolean) => void;
  appendToken: (token: string) => void;
  setStreamingMessageId: (id: string | null) => void;
  setToolCall: (call: { tool: string; label: string } | null) => void;
  setCrisisMode: (on: boolean) => void;
  setWsStatus: (s: WsStatus) => void;
  dismissCrisis: () => void;
  clearStreamContent: () => void;
  addOrUpdateStep: (step: AgentStep) => void;
  clearSteps: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
  (set) => ({
  conversations: [firstConversation],
  activeConversationId: firstConversation.id,
  messages: [makeWelcomeMessage(firstConversation.id)],
  isTyping: false,
  wsStatus: 'disconnected',
  streamingMessageId: null,
  activeToolCall: null,
  isCrisisMode: false,
  agentSteps: [],

  setActiveConversation: (id) =>
    set({ activeConversationId: id, agentSteps: [] }),

  createConversation: () =>
    set((state) => {
      const conv = makeConversation();
      return {
        conversations: [...state.conversations, conv],
        activeConversationId: conv.id,
        messages: [...state.messages, makeWelcomeMessage(conv.id)],
        agentSteps: [],
        streamingMessageId: null,
        activeToolCall: null,
      };
    }),

  deleteConversation: (id) =>
    set((state) => {
      const remaining = state.conversations.filter((c) => c.id !== id);
      // Always keep at least one conversation
      if (remaining.length === 0) {
        const fresh = makeConversation();
        return {
          conversations: [fresh],
          activeConversationId: fresh.id,
          messages: [makeWelcomeMessage(fresh.id)],
          agentSteps: [],
          streamingMessageId: null,
          activeToolCall: null,
        };
      }
      const newActive =
        state.activeConversationId === id ? remaining[remaining.length - 1].id : state.activeConversationId;
      return {
        conversations: remaining,
        activeConversationId: newActive,
        messages: state.messages.filter((m) => m.conversationId !== id),
        agentSteps: state.activeConversationId === id ? [] : state.agentSteps,
        streamingMessageId: state.activeConversationId === id ? null : state.streamingMessageId,
        activeToolCall: state.activeConversationId === id ? null : state.activeToolCall,
      };
    }),

  addMessage: (message) =>
    set((state) => {
      // Auto-title: use first user message as the conversation title
      const conv = state.conversations.find((c) => c.id === message.conversationId);
      const isFirstUserMsg = conv?.title === 'New chat' && !message.isAI;
      const title = isFirstUserMsg ? message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '') : undefined;

      return {
        messages: [...state.messages, message],
        conversations: state.conversations.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: message.content || '...',
                lastTimestamp: message.timestamp,
                ...(title ? { title } : {}),
              }
            : c
        ),
      };
    }),

  setTyping: (typing) => set({ isTyping: typing }),

  appendToken: (token) =>
    set((state) => {
      if (!state.streamingMessageId) return state;
      return {
        messages: state.messages.map((m) =>
          m.id === state.streamingMessageId ? { ...m, content: m.content + token } : m
        ),
      };
    }),
  setStreamingMessageId: (id) => set({ streamingMessageId: id }),
  setToolCall: (call) => set({ activeToolCall: call }),
  setCrisisMode: (on) => set({ isCrisisMode: on }),
  setWsStatus: (s) => set({ wsStatus: s }),
  dismissCrisis: () => set({ isCrisisMode: false }),

  clearStreamContent: () =>
    set((state) => {
      if (!state.streamingMessageId) return state;
      return {
        messages: state.messages.map((m) =>
          m.id === state.streamingMessageId ? { ...m, content: '' } : m
        ),
      };
    }),

  addOrUpdateStep: (step) =>
    set((state) => {
      const idx = state.agentSteps.findIndex((s) => s.id === step.id);
      if (idx >= 0) {
        const updated = [...state.agentSteps];
        updated[idx] = { ...updated[idx], ...step };
        return { agentSteps: updated };
      }
      return { agentSteps: [...state.agentSteps, step] };
    }),

  clearSteps: () => set({ agentSteps: [] }),
}),
  {
    name: 'threshold-chat',
    partialize: (state) => ({
      conversations: state.conversations,
      activeConversationId: state.activeConversationId,
      messages: state.messages,
    }),
  },
));
