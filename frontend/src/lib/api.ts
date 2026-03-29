/**
 * API client for the Threshold backend.
 *
 * All REST calls go through fetch() to /api/* (proxied to :8000 by Vite).
 * WebSocket is managed by useChatSocket() in lib/websocket.ts.
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

async function del<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
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

export interface UploadedDocument {
  id: string;
  document_type: string;
  sections_updated: string[];
  fields_written: number;
  uploaded_at: string;
  raw_extraction?: Record<string, unknown>;
  mapped_fields?: Record<string, Record<string, unknown>>;
  file_path?: string | null;
  mime_type?: string | null;
}

export async function fetchUploadedDocuments() {
  return get<UploadedDocument[]>('/documents/uploads');
}

export async function fetchUploadedDocumentDetail(docId: string) {
  return get<UploadedDocument>(`/documents/uploads/${docId}`);
}

export async function fetchFieldCompletion() {
  return get<Record<string, Record<string, boolean>>>('/profile/completion/fields');
}

export interface MatrixField {
  key: string;
  label: string;
  filled: boolean;
  source: 'document' | 'conversation' | 'manual';
  conditional?: boolean;
}

export interface MatrixSection {
  key: string;
  label: string;
  filled: number;
  total: number;
  fields: MatrixField[];
}

export async function fetchProfileMatrix() {
  return get<MatrixSection[]>('/profile/completion/matrix');
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
  return get<import('@/types').GeneratedDocument[]>('/documents/generated');
}

export function getGeneratedDocumentDownloadUrl(docId: string) {
  return `/api/documents/generated/${docId}/download`;
}

// ---------------------------------------------------------------------------
// Housing pipeline
// ---------------------------------------------------------------------------

export async function fetchHousingPipeline() {
  return get<import('@/types').HousingPipelineSummary>('/housing/pipeline');
}

export async function fetchHousingAlerts() {
  return get<import('@/types').HousingAlerts>('/housing/alerts');
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

export async function updateHousingApplication(id: string, data: Record<string, string>) {
  return patch<import('@/types').HousingApplication>(`/housing/applications/${id}`, data);
}

export async function deleteHousingApplication(id: string) {
  return del<{ ok: boolean }>(`/housing/applications/${id}`);
}

export async function fetchFairChanceLaws(state: string) {
  return get<import('@/types').FairChanceLaw>(`/housing/fair-chance-laws/${state}`);
}

// ---------------------------------------------------------------------------
// Employment pipeline
// ---------------------------------------------------------------------------

export async function fetchEmploymentPipeline() {
  return get<import('@/types').JobPipelineSummary>('/employment/pipeline');
}

export async function fetchEmploymentAlerts() {
  return get<import('@/types').JobAlerts>('/employment/alerts');
}

export async function logJobApplication(data: {
  company: string;
  position: string;
  status?: string;
  notes?: string;
  apply_url?: string;
  follow_up_date?: string;
  deadline?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  source?: string;
}) {
  return post<import('@/types').JobApplication>('/employment/applications', data);
}

export async function updateJobApplication(id: string, data: Record<string, string>) {
  return patch<import('@/types').JobApplication>(`/employment/applications/${id}`, data);
}

export async function deleteJobApplication(id: string) {
  return del<{ ok: boolean }>(`/employment/applications/${id}`);
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
  | 'agent_step'
  | 'clear_stream'
  | 'workflow_update'
  | 'error'
  | 'pong';

export interface WsMessage {
  type: WsMessageType;
  content?: string;
  message?: string;
  tool_id?: string;
  tool_name?: string;
  display_label?: string;
  id?: string;
  step_type?: 'thinking' | 'subagent' | 'tool' | 'node' | 'reasoning';
  status?: 'started' | 'completed';
  label?: string;
  detail?: string;
  icon?: string;
  // workflow_update fields
  domain?: string;
  workflow_event?: string;
  workflow_stage?: number;
  tool?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
}

