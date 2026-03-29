/**
 * Singleton WebSocket connection to the Threshold backend.
 *
 * Only ONE connection is maintained regardless of how many components call
 * useChatSocket(). A ref-count tracks active consumers — the socket connects
 * when the first consumer mounts and disconnects when the last unmounts.
 *
 * Reconnects with exponential backoff: 1s → 2s → 4s → … → 30s max.
 */
import { useEffect, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import type { WsMessage } from './api';

// ── Singleton state (module-level, not per-hook) ────────────────────────────

let ws: WebSocket | null = null;
let refCount = 0;
let alive = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;

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
      store.setToolCall(null);
      // Mark any in-progress steps as completed
      for (const step of store.agentSteps) {
        if (step.status === 'started') {
          store.addOrUpdateStep({ ...step, status: 'completed' });
        }
      }
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

    case 'clear_stream':
      store.clearStreamContent();
      break;

    case 'agent_step':
      if (msg.id && msg.step_type && msg.status && msg.label) {
        store.addOrUpdateStep({
          id: msg.id,
          stepType: msg.step_type,
          status: msg.status,
          label: msg.label,
          detail: msg.detail,
          icon: msg.icon,
          timestamp: Date.now(),
        });
      }
      break;

    case 'crisis_response':
      store.setCrisisMode(true);
      break;

    case 'error':
      console.error('[ws] agent error:', msg.message);
      break;
  }
}

function connect() {
  if (!alive || ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
    return;
  }

  useChatStore.getState().setWsStatus('connecting');

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;
  const socket = new WebSocket(url);

  socket.onopen = () => {
    reconnectDelay = 1000;
    useChatStore.getState().setWsStatus('connected');
  };

  socket.onmessage = (event) => {
    try {
      const msg: WsMessage = JSON.parse(event.data as string);
      handleMessage(msg);
    } catch {
      console.error('[ws] malformed message:', event.data);
    }
  };

  socket.onclose = () => {
    ws = null;
    useChatStore.getState().setWsStatus('disconnected');
    if (alive) {
      const delay = reconnectDelay;
      reconnectDelay = Math.min(delay * 2, 30_000);
      reconnectTimer = setTimeout(connect, delay);
    }
  };

  socket.onerror = () => {
    socket.close();
  };

  ws = socket;
}

function acquire() {
  refCount++;
  if (refCount === 1) {
    alive = true;
    connect();
  }
}

function release() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    alive = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = null;
    ws?.close();
    ws = null;
  }
}

// ── HMR cleanup (Vite dev only) ─────────────────────────────────────────────
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    alive = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
    ws = null;
    refCount = 0;
  });
}

// ── React hook ──────────────────────────────────────────────────────────────

export function useChatSocket() {
  useEffect(() => {
    acquire();
    return () => release();
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[ws] not connected — message dropped');
      return;
    }

    const store = useChatStore.getState();
    store.clearSteps();
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

    ws.send(JSON.stringify({ type: 'user_message', content, conversation_id: store.activeConversationId }));
  }, []);

  return { sendMessage };
}
