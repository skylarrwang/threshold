/**
 * useChatSocket — React hook that manages the WebSocket connection to the
 * Threshold backend and dispatches incoming events to chatStore.
 *
 * Reconnects with exponential backoff: 1s → 2s → 4s → 8s → … → 30s max.
 */
import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import type { WsMessage } from './api';

const TOOL_LABELS: Record<string, string> = {
  search_jobs: 'Searching for jobs near you...',
  search_housing: 'Finding housing options...',
};

function getToolLabel(toolName: string, displayLabel?: string): string | null {
  if (displayLabel) return displayLabel;
  if (toolName === 'read_user_memory' || toolName === 'log_event') return null;
  if (toolName.startsWith('check_') && toolName.endsWith('_eligibility')) {
    const benefit = toolName
      .replace('check_', '')
      .replace('_eligibility', '')
      .replace(/_/g, ' ');
    return `Checking ${benefit} eligibility...`;
  }
  return TOOL_LABELS[toolName] ?? 'Working on this — give me a moment...';
}

function handleMessage(msg: WsMessage) {
  const store = useChatStore.getState();

  switch (msg.type) {
    case 'token':
      if (msg.content) store.appendToken(msg.content);
      break;

    case 'message_complete':
      store.setStreamingMessageId(null);
      break;

    case 'tool_start': {
      const label = getToolLabel(msg.tool_name ?? '', msg.display_label as string | undefined);
      if (label) store.setToolCall({ tool: msg.tool_name ?? '', label });
      break;
    }

    case 'tool_end':
      store.setToolCall(null);
      break;

    case 'subagent_start':
      store.setToolCall({ tool: 'subagent', label: 'Working on this — give me a moment...' });
      break;

    case 'subagent_end':
      store.setToolCall(null);
      break;

    case 'crisis_response':
      store.setCrisisMode(true);
      break;

    case 'error':
      console.error('[ws] agent error:', msg.message);
      break;
  }
}

export function useChatSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const aliveRef = useRef(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);

  function connect() {
    if (!aliveRef.current) return;

    useChatStore.getState().setWsStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => {
      reconnectDelayRef.current = 1000;
      useChatStore.getState().setWsStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data as string);
        handleMessage(msg);
      } catch {
        console.error('[ws] malformed message:', event.data);
      }
    };

    ws.onclose = () => {
      useChatStore.getState().setWsStatus('disconnected');
      if (aliveRef.current) {
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, 30_000);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  useEffect(() => {
    aliveRef.current = true;
    connect();
    return () => {
      aliveRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  }, []);

  function sendMessage(content: string) {
    const ws = socketRef.current;
    if (ws?.readyState !== WebSocket.OPEN) {
      console.warn('[ws] not connected — message dropped');
      return;
    }

    const store = useChatStore.getState();
    const aiMsgId = `msg-ai-${Date.now()}`;

    store.addMessage({
      id: aiMsgId,
      conversationId: store.activeConversationId,
      senderId: 'ai-threshold',
      senderName: 'Threshold AI',
      content: '',
      timestamp: new Date().toISOString(),
      isRead: true,
      isAI: true,
    });
    store.setStreamingMessageId(aiMsgId);

    ws.send(JSON.stringify({ type: 'user_message', content }));
  }

  return { sendMessage };
}
