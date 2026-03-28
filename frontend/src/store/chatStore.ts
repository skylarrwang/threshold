import { create } from 'zustand';
import type { Conversation, Message } from '@/types';

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string;
  messages: Message[];
  isTyping: boolean;
  setActiveConversation: (id: string) => void;
  addMessage: (message: Message) => void;
  setTyping: (typing: boolean) => void;
}

const mockConversations: Conversation[] = [
  {
    id: 'conv-001',
    participantName: 'Diana',
    participantType: 'counselor',
    lastMessage: "Great progress on your ID documents! Let's focus on the Ready-to-Work cert next.",
    lastTimestamp: '2024-10-20T14:30:00Z',
    unreadCount: 1,
    isOnline: true,
  },
  {
    id: 'conv-002',
    participantName: 'AI Assistant',
    participantType: 'ai',
    lastMessage: "I found 3 job listings matching your skills in the Oakland area.",
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
    content: "Hi Marcus! I saw you picked up your State ID last week — that's a huge step. Really proud of your progress.",
    timestamp: '2024-10-18T09:00:00Z',
    isRead: true,
  },
  {
    id: 'msg-002',
    conversationId: 'conv-001',
    senderId: 'marcus-001',
    senderName: 'Marcus Chen',
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
    id: 'msg-004',
    conversationId: 'conv-001',
    senderId: 'marcus-001',
    senderName: 'Marcus Chen',
    content: "That's amazing! I'll look at the MTA offer today. Should I accept it or keep interviewing?",
    timestamp: '2024-10-20T11:00:00Z',
    isRead: true,
  },
  {
    id: 'msg-005',
    conversationId: 'conv-001',
    senderId: 'counselor-diana',
    senderName: 'Diana',
    content: "Great progress on your ID documents! Let's focus on the Ready-to-Work cert next.",
    timestamp: '2024-10-20T14:30:00Z',
    isRead: false,
  },
];

export const useChatStore = create<ChatState>()((set) => ({
  conversations: mockConversations,
  activeConversationId: 'conv-001',
  messages: mockMessages,
  isTyping: false,
  setActiveConversation: (id) => set({ activeConversationId: id }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setTyping: (typing) => set({ isTyping: typing }),
}));
