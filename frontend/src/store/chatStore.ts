import { create } from 'zustand';
import type { Message } from '@/types';
import { createChatSocket, type WsMessage } from '@/lib/api';

interface ChatState {
  messages: Message[];
  isTyping: boolean;
  isConnected: boolean;
  streamingMessageId: string | null;

  addMessage: (message: Message) => void;
  setTyping: (typing: boolean) => void;
  sendMessage: (content: string) => void;
  initSocket: () => void;
  disconnectSocket: () => void;
}

export const AI_CONVERSATION_ID = 'conv-ai';
const AI_SENDER_ID = 'threshold-ai';
const AI_SENDER_NAME = 'Threshold';
const USER_SENDER_ID = 'user';
const USER_SENDER_NAME = 'You';

let socket: ReturnType<typeof createChatSocket> | null = null;

export const useChatStore = create<ChatState>()((set, get) => ({
  messages: [
    {
      id: 'msg-welcome',
      conversationId: AI_CONVERSATION_ID,
      senderId: AI_SENDER_ID,
      senderName: AI_SENDER_NAME,
      content: "Hey — I'm Threshold, your re-entry assistant. I can help with jobs, housing, benefits, supervision, documents, and more. What's on your mind?",
      timestamp: new Date().toISOString(),
      isRead: true,
      isAI: true,
    },
  ],
  isTyping: false,
  isConnected: false,
  streamingMessageId: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setTyping: (typing) => set({ isTyping: typing }),

  sendMessage: (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const state = get();

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      conversationId: AI_CONVERSATION_ID,
      senderId: USER_SENDER_ID,
      senderName: USER_SENDER_NAME,
      content: trimmed,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    state.addMessage(userMsg);

    if (socket?.connected) {
      socket.sendMessage(trimmed);
    } else {
      state.initSocket();
      setTimeout(() => {
        socket?.sendMessage(trimmed);
      }, 500);
    }
  },

  initSocket: () => {
    if (socket) return;

    socket = createChatSocket((msg: WsMessage) => {
      const state = get();

      switch (msg.type) {
        case 'thinking': {
          set({ isTyping: true });
          break;
        }

        case 'token': {
          const { streamingMessageId } = state;

          if (!streamingMessageId) {
            set({ isTyping: false });
            const aiMsgId = `msg-ai-${Date.now()}`;
            const aiMsg: Message = {
              id: aiMsgId,
              conversationId: AI_CONVERSATION_ID,
              senderId: AI_SENDER_ID,
              senderName: AI_SENDER_NAME,
              content: msg.content || '',
              timestamp: new Date().toISOString(),
              isRead: true,
              isAI: true,
            };
            set((s) => ({
              messages: [...s.messages, aiMsg],
              streamingMessageId: aiMsgId,
            }));
          } else {
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === streamingMessageId
                  ? { ...m, content: m.content + (msg.content || '') }
                  : m
              ),
            }));
          }
          break;
        }

        case 'message_complete': {
          set({ streamingMessageId: null, isTyping: false });
          break;
        }

        case 'error': {
          set({ isTyping: false, streamingMessageId: null });
          const errorMsg: Message = {
            id: `msg-error-${Date.now()}`,
            conversationId: AI_CONVERSATION_ID,
            senderId: AI_SENDER_ID,
            senderName: AI_SENDER_NAME,
            content: `Something went wrong: ${msg.message || 'Unknown error'}. Please try again.`,
            timestamp: new Date().toISOString(),
            isRead: true,
            isAI: true,
          };
          set((s) => ({ messages: [...s.messages, errorMsg] }));
          break;
        }
      }
    });

    set({ isConnected: true });
  },

  disconnectSocket: () => {
    socket?.close();
    socket = null;
    set({ isConnected: false });
  },
}));
