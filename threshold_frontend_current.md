# Threshold Frontend — Current State

> Accurate as of March 2026. Supersedes `threshold_frontend_design.md`.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | TailwindCSS v4 (CSS-first config via `@tailwindcss/vite`) |
| State | Zustand (no middleware) |
| Routing | React Router v7 |
| Animation | Framer Motion (available, lightly used) |
| Icons | Material Symbols 3.0 (variable fonts via CDN) |
| HTTP | `fetch()` via `src/lib/api.ts` (proxied by Vite to `:8000`) |
| WebSocket | `src/lib/websocket.ts` — `useChatSocket()` hook with exponential backoff |

---

## Design System

### Color tokens (Anchor palette)

| Role | Hex | Tailwind class |
|---|---|---|
| Primary | `#006565` | `bg-primary`, `text-primary` |
| Secondary | `#4b53bc` | `bg-secondary`, `text-secondary` |
| Tertiary | `#8b4823` | `bg-tertiary`, `text-tertiary` |
| Surface | `#f9f9f9` | `bg-surface` |

Full Material You token hierarchy: `surface`, `surface-container-*`, `on-surface`, `on-surface-variant`, `outline`, `outline-variant`, `primary-fixed`, `secondary-fixed`, `tertiary-fixed`, `error-container`.

### Typography

- **Headline font:** `font-headline` — used for headings and navigation labels
- **Body font:** `font-body` — default text

### Icons

Material Symbols Outlined, variable font. Fill weight controlled via `fontVariationSettings: "'FILL' 1"`. Loaded from Google CDN in `index.html`.

---

## Navigation

### Desktop (≥ 768px)
Fixed left sidebar (`w-64`) via `AppShell.tsx` + `SideNav.tsx`.

9 navigation items:
1. Dashboard (`/dashboard`)
2. Chat (`/chat`)
3. Employment (`/employment`)
4. Housing (`/housing`)
5. Benefits (`/benefits`)
6. Documents (`/documents`)
7. AI Applications (`/ai-applications`)
8. Resources (`/resources`)
9. Settings (`/settings`)

### Mobile (< 768px)
Bottom navigation bar (`BottomNav.tsx`) with 5 items: Dashboard, Chat, Employment, Housing, Benefits.

The sidebar and bottom nav are rendered by `AppShell.tsx`, which wraps all authenticated routes.

`/onboarding` renders outside `AppShell` (full-screen, no nav).

---

## Pages

| Route | Component | Status |
|---|---|---|
| `/onboarding` | `OnboardingPage.tsx` | 3-screen intake flow; calls `PATCH /api/profile` |
| `/dashboard` | `DashboardPage.tsx` | Mock data — milestones, appointments, action plan |
| `/chat` | `ChatPage.tsx` | Wired to backend via WebSocket |
| `/employment` | `EmploymentPage.tsx` | Mock Kanban board |
| `/housing` | `HousingPage.tsx` | Mock housing search results |
| `/benefits` | `BenefitsPage.tsx` | Mock benefit cards |
| `/documents` | `DocumentsPage.tsx` | Vault tab (mock) + Generated tab (fetches `/api/documents`) |
| `/ai-applications` | `AIApplicationsPage.tsx` | Stub |
| `/resources` | `ResourcesPage.tsx` | Stub |
| `/settings` | `SettingsPage.tsx` | Partially wired |

---

## Stores (`src/store/`)

All stores use Zustand. No persistence layer yet (in-memory only).

| Store | Key state | Backend wired? |
|---|---|---|
| `chatStore.ts` | messages, wsStatus, streamingMessageId, activeToolCall, isCrisisMode | ✅ via useChatSocket |
| `profileStore.ts` | UserProfile fields | ❌ mock |
| `jobStore.ts` | JobApplication[] | ❌ mock |
| `housingStore.ts` | HousingVoucher[], ShelterInfo | ❌ mock |
| `benefitsStore.ts` | BenefitApplication[] | ❌ mock |
| `documentsStore.ts` | documents (mock) + generatedDocuments (fetches `/api/documents`) | ⚠️ partial |

---

## Chat Architecture

### WebSocket (`src/lib/websocket.ts`)

`useChatSocket()` hook — call once in `ChatPage`, pass `sendMessage` down to `ChatInput`.

```
ChatPage  → useChatSocket()  → WebSocket /ws
                             ↓ incoming events
                             → chatStore dispatch
```

**Incoming event → store action map:**

| Event | Action |
|---|---|
| `token` | `appendToken(content)` |
| `message_complete` | `setStreamingMessageId(null)` |
| `tool_start` | `setToolCall({ tool, label })` |
| `tool_end` | `setToolCall(null)` |
| `subagent_start` | `setToolCall({ tool: 'subagent', ... })` |
| `subagent_end` | `setToolCall(null)` |
| `crisis_response` | `setCrisisMode(true)` |
| `error` | `console.error` |

Reconnection: exponential backoff starting at 1 s, doubling up to 30 s max.

### Chat components

| Component | Role |
|---|---|
| `ChatInput.tsx` | Textarea + send button + WS status dot |
| `MessageThread.tsx` | Scrollable message list, streaming cursor, ToolCard |
| `ToolCard.tsx` | Inline indicator for active tool call; collapses on completion |
| `CrisisBlock.tsx` | Full-width card with 988/Crisis Text Line/SAMHSA; pinned above thread |
| `InsightSidebar.tsx` | Contextual insights panel (right column, large screens) |

### Connection status dot (ChatInput)

- Green: `wsStatus === 'connected'`
- Amber + pulse: `wsStatus === 'connecting'`
- Muted: `wsStatus === 'disconnected'`

---

## Onboarding Flow

3-screen card-select intake. Renders outside `AppShell`. Progress dots at top, Skip always visible.

| Screen | Fields |
|---|---|
| 1 — Identity | Name (text), Location (text, default "Hartford, CT") |
| 2 — Situation | Housing status (card select, auto-advance) + Supervision (grid select) |
| 3 — Needs | Immediate needs (multi-select cards) → calls `PATCH /api/profile` → `/dashboard` |

---

## Documents Page

Two-tab layout:

**Vault tab** — identity/legal/employment documents, upload area with OCR extraction, completion card.

**Generated tab** — AI-created letters/resumes fetched from `GET /api/documents`. Cards with Copy + Edit in Chat actions. Empty state prompts user to chat.

---

## Key Files

```
frontend/
├── src/
│   ├── App.tsx                     # Router config
│   ├── lib/
│   │   ├── api.ts                  # fetch + WebSocket client factories
│   │   └── websocket.ts            # useChatSocket hook
│   ├── store/                      # Zustand stores (see table above)
│   ├── types/index.ts              # Shared TS interfaces
│   ├── components/
│   │   ├── chat/                   # ChatInput, MessageThread, ToolCard, CrisisBlock, InsightSidebar
│   │   ├── layout/                 # AppShell, SideNav, BottomNav
│   │   └── shared/                 # Button, Card, Badge, ProgressBar, StickyNote, Avatar, StatusDot
│   └── pages/                      # One component per route (see page table)
├── vite.config.ts                  # Proxy: /api → :8000, /ws → ws://localhost:8000/ws
└── index.html                      # Material Symbols CDN link
```

---

## What's NOT built (out of scope)

| Feature | Reason |
|---|---|
| PWA / service worker | Local-first app, offline not needed |
| Dark mode | Not requested |
| Push notifications | Out of scope |
| Drag-drop Kanban | Mock data anyway |
| Video call button | Dead UI — removed from ChatPage |
| Export as PDF | Post-hackathon |
| Performance budget | Post-hackathon |

---

## Backend API expectations

The frontend expects these endpoints on `localhost:8000`:

| Method | Path | Used by |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/profile` | profileStore |
| `GET` | `/api/profile/exists` | OnboardingPage (future) |
| `PATCH` | `/api/profile` | OnboardingPage, SettingsPage |
| `GET` | `/api/profile/completion` | SettingsPage |
| `POST` | `/api/documents/upload` | DocumentsPage (OCR) |
| `GET` | `/api/documents` | DocumentsPage → Generated tab |
| `WS` | `/ws` | ChatPage via useChatSocket |

Start the backend: `uv run python main.py serve`
