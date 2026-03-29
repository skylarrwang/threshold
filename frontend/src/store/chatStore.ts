import { create } from 'zustand';
import type { Conversation, Message } from '@/types';

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string;
  messages: Message[];
  isTyping: boolean;
  wsStatus: WsStatus;
  streamingMessageId: string | null;
  activeToolCall: { tool: string; label: string } | null;
  isCrisisMode: boolean;
  setActiveConversation: (id: string) => void;
  addMessage: (message: Message) => void;
  setTyping: (typing: boolean) => void;
  appendToken: (token: string) => void;
  setStreamingMessageId: (id: string | null) => void;
  setToolCall: (call: { tool: string; label: string } | null) => void;
  setCrisisMode: (on: boolean) => void;
  setWsStatus: (s: WsStatus) => void;
  dismissCrisis: () => void;
}

const mockConversations: Conversation[] = [
  {
    id: 'conv-001',
    participantName: 'Diana',
    participantType: 'counselor',
    lastMessage: "Great progress on your ID documents! Let's focus on the Ready-to-Work cert next.",
    lastTimestamp: '2024-10-20T14:30:00Z',
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: 'conv-002',
    participantName: 'Threshold AI',
    participantType: 'ai',
    lastMessage: "I found 3 job listings matching your skills in the Hartford area.",
    lastTimestamp: '2024-10-20T10:15:00Z',
    unreadCount: 0,
    isOnline: true,
  },
  {
    id: 'conv-003',
    participantName: 'Resource Center',
    participantType: 'resource',
    lastMessage: 'Your housing application has been received.',
    lastTimestamp: '2024-10-19T16:00:00Z',
    unreadCount: 0,
    isOnline: false,
  },
];

const mockMessages: Message[] = [
  {
    id: 'msg-001',
    conversationId: 'conv-001',
    senderId: 'counselor-diana',
    senderName: 'Diana',
    content: "Hi Tyler! I saw you picked up your State ID last week — that's a huge step. Really proud of your progress.",
    timestamp: '2024-10-18T09:00:00Z',
    isRead: true,
  },
  {
    id: 'msg-002',
    conversationId: 'conv-001',
    senderId: 'tyler-001',
    senderName: 'Tyler Chen',
    content: "Thanks Diana! It feels good to have that checked off. What should I focus on next?",
    timestamp: '2024-10-18T09:15:00Z',
    isRead: true,
  },
  {
    id: 'msg-003',
    conversationId: 'conv-001',
    senderId: 'counselor-diana',
    senderName: 'Diana',
    content: "Let's work on the Ready-to-Work certification. I've enrolled you in a program starting Oct 28. Also, the Metro Transit Authority has sent you an offer — please review it carefully.",
    timestamp: '2024-10-18T09:20:00Z',
    isRead: true,
  },
  {
    id: 'msg-ai-001',
    conversationId: 'conv-002',
    senderId: 'ai-threshold',
    senderName: 'Threshold AI',
    content: "Hi Tyler! I'm here to help you navigate re-entry. I can search for jobs, housing, check your benefits eligibility, and more. What would you like to work on today?",
    timestamp: '2024-10-20T10:15:00Z',
    isRead: true,
    isAI: true,
  },
];

export const useChatStore = create<ChatState>()((set) => ({
  conversations: mockConversations,
  activeConversationId: 'conv-002',
  messages: mockMessages,
  isTyping: false,
  wsStatus: 'disconnected',
  streamingMessageId: null,
  activeToolCall: null,
  isCrisisMode: false,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
      conversations: state.conversations.map((c) =>
        c.id === message.conversationId
          ? { ...c, lastMessage: message.content || '...', lastTimestamp: message.timestamp }
          : c
      ),
    })),

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
}));
