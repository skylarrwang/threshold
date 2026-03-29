/**
 * API client for the Threshold backend.
 *
 * All REST calls go through fetch() to /api/* (proxied to :8000 by Vite).
 * WebSocket connects to /ws (proxied to ws://localhost:8000/ws).
 */

const API_BASE = '/api';

// ---------------------------------------------------------------------------
// REST helpers
// ---------------------------------------------------------------------------

async function get<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function patch<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export async function fetchProfile() {
  return get<{ user_id: string; profile: Record<string, Record<string, unknown>> }>('/profile');
}

export async function checkProfileExists() {
  return get<{ exists: boolean }>('/profile/exists');
}

export async function updateProfile(section: string, fields: Record<string, unknown>) {
  return patch<{ ok: boolean }>('/profile', { section, fields });
}

export async function fetchProfileCompletion() {
  return get<{
    overall_pct: number;
    filled: number;
    total: number;
    by_section: Record<string, { filled: number; total: number; missing: string[] }>;
  }>('/profile/completion');
}

// ---------------------------------------------------------------------------
// Intake pipeline
// ---------------------------------------------------------------------------

export async function fetchIntakeStatus() {
  return get('/intake/status');
}

export async function fetchPostOcrSummary() {
  return get('/intake/post-ocr-summary');
}

export async function uploadDocument(file: File) {
  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export async function healthCheck() {
  return get<{ status: string; timestamp: string }>('/health');
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function fetchGeneratedDocuments() {
  return get<import('@/types').GeneratedDocument[]>('/documents');
}

// ---------------------------------------------------------------------------
// Housing pipeline
// ---------------------------------------------------------------------------

export async function fetchHousingPipeline() {
  return get<import('@/types').HousingPipelineSummary>('/housing/pipeline');
}

export async function logHousingApplication(data: {
  program: string;
  status: string;
  notes?: string;
  follow_up_date?: string;
  contact_name?: string;
  contact_phone?: string;
}) {
  return post<import('@/types').HousingApplication>('/housing/applications', data);
}

export async function fetchFairChanceLaws(state: string) {
  return get<import('@/types').FairChanceLaw>(`/housing/fair-chance-laws/${state}`);
}

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

export type WsMessageType =
  | 'token'
  | 'message_complete'
  | 'thinking'
  | 'tool_start'
  | 'tool_end'
  | 'crisis_response'
  | 'subagent_start'
  | 'subagent_end'
  | 'error'
  | 'pong';

export interface WsMessage {
  type: WsMessageType;
  content?: string;
  message?: string;
  tool_id?: string;
  tool_name?: string;
  display_label?: string;
  [key: string]: unknown;
}

export type WsHandler = (msg: WsMessage) => void;

/**
 * Creates a managed WebSocket connection to the backend.
 * Handles reconnection automatically.
 */
export function createChatSocket(onMessage: WsHandler) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = `${protocol}//${window.location.host}/ws`;

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let alive = true;

  function connect() {
    if (!alive) return;

    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[ws] connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch {
        console.error('[ws] bad message', event.data);
      }
    };

    ws.onclose = () => {
      console.log('[ws] disconnected');
      if (alive) {
        reconnectTimer = setTimeout(connect, 2000);
      }
    };

    ws.onerror = (err) => {
      console.error('[ws] error', err);
      ws?.close();
    };
  }

  connect();

  return {
    send(msg: Record<string, unknown>) {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      } else {
        console.warn('[ws] not connected, message dropped');
      }
    },

    sendMessage(content: string) {
      this.send({ type: 'user_message', content });
    },

    close() {
      alive = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },

    get connected() {
      return ws?.readyState === WebSocket.OPEN;
    },
  };
}
