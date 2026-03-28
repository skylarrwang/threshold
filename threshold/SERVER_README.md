# Threshold Server Bridge

The server (`threshold/server.py`) is a thin FastAPI layer that connects the React frontend to the Python backend. It does not contain business logic — it exposes existing backend services over HTTP and WebSocket.

## Architecture

```
┌─────────────────────┐      ┌───────────────────────┐      ┌──────────────────────┐
│   React Frontend    │      │   FastAPI Server       │      │   Python Backend     │
│   (Vite :5173)      │      │   (:8000)              │      │                      │
│                     │      │                        │      │                      │
│  /api/* ──proxy──>  │ ──── │  REST endpoints        │ ──── │  threshold/db/       │
│                     │      │    /api/profile         │      │    (SQLAlchemy CRUD)  │
│                     │      │    /api/intake/status    │      │                      │
│                     │      │    /api/documents/upload │      │  threshold/services/ │
│                     │      │                        │      │    (OCR, interview    │
│  /ws ───proxy──>    │ ──── │  WebSocket             │ ──── │     context)         │
│                     │      │    /ws                  │      │                      │
│                     │      │                        │      │  threshold/agents/   │
│                     │      │                        │      │    (orchestrator)     │
└─────────────────────┘      └───────────────────────┘      └──────────────────────┘
```

## Running

Start both processes in separate terminals:

```bash
# Terminal 1: API server
python main.py serve

# Terminal 2: Frontend dev server
cd frontend && npm run dev
```

The Vite dev server proxies `/api/*` and `/ws` to `localhost:8000` automatically (configured in `vite.config.ts`), so the frontend always calls its own origin — no CORS issues in development.

## REST Endpoints

| Method | Path | What it does |
|--------|------|--------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/profile` | Full profile (all sections from DB) |
| `GET` | `/api/profile/exists` | Whether any profile data has been entered |
| `PATCH` | `/api/profile` | Update fields in a section: `{section, fields}` |
| `GET` | `/api/profile/completion` | Completion % with per-section breakdown |
| `GET` | `/api/intake/status` | Missing fields by priority (critical/important) |
| `GET` | `/api/intake/interview-context` | Prompt context for the interview agent |
| `GET` | `/api/intake/post-ocr-summary` | User-facing summary after document upload |
| `POST` | `/api/documents/upload` | Upload a document image for OCR extraction |

### Example: Upload a document

```bash
curl -X POST http://localhost:8000/api/documents/upload \
  -F "file=@conditions_of_supervision.jpg"
```

Returns:
```json
{
  "ok": true,
  "document_type": "Conditions of Supervision",
  "raw_extraction": { ... },
  "mapped_fields": {
    "identity": {"legal_name": "Marcus Johnson"},
    "supervision": {"supervision_type": "parole", "po_name": "Officer Williams"}
  },
  "fields_written": 8,
  "sections_updated": ["identity", "supervision", "documents"]
}
```

### Example: Check what's missing

```bash
curl http://localhost:8000/api/intake/status
```

Returns which fields are filled, which critical fields are still needed, and human-readable descriptions the interview agent uses to know what to ask.

## WebSocket Protocol

Connect to `ws://localhost:8000/ws` (or `/ws` through the Vite proxy).

### Client -> Server

```json
{"type": "user_message", "content": "I need help finding a job"}
{"type": "ping"}
```

### Server -> Client

```json
{"type": "thinking"}
{"type": "token", "content": "I can"}
{"type": "token", "content": " help"}
{"type": "token", "content": " with"}
{"type": "message_complete"}
{"type": "error", "message": "..."}
```

The `token` messages stream the response in small chunks. The frontend accumulates them until `message_complete` arrives.

## Frontend API Client

`frontend/src/lib/api.ts` provides typed functions for all endpoints:

```typescript
import { fetchProfile, uploadDocument, createChatSocket } from '@/lib/api';

// REST
const profile = await fetchProfile();
const result = await uploadDocument(file);

// WebSocket
const socket = createChatSocket((msg) => {
  if (msg.type === 'token') appendToResponse(msg.content);
  if (msg.type === 'message_complete') finishResponse();
});
socket.sendMessage("I need help with SNAP");
```

## What the Server Does NOT Do

- **No auth** — this is a single-user local app. The server binds to `127.0.0.1` only.
- **No file persistence** — uploaded document images are processed and discarded.
- **No business logic** — all intelligence lives in the agents and services. The server just routes.
- **No SSR** — the frontend is a standalone Vite SPA.
