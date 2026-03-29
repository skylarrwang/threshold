# Threshold — TODO & Implementation Notes

> Gap analysis against `threshold_impl.md` and `interview/info_collection.md`.
> Items are ordered roughly by impact on demo quality.

---

## 🐛 Bugs (break things right now)

### 1. Onboarding sends wrong section names to the API

`OnboardingPage.tsx` calls `updateProfile('personal', ...)` and `updateProfile('situation', ...)`.
The backend `PATCH /api/profile` expects section names from `TABLE_MAP` in `crud.py`:
`identity`, `documents`, `supervision`, `housing`, `employment`, `health`, `benefits`, `preferences`.

Neither `personal` nor `situation` exist — both calls silently fail with `{"ok": false, "error": "Unknown schema section"}`.

**Fix:** Update `OnboardingPage.tsx` to use the correct section names:
- Screen 1: `updateProfile('identity', { legal_name: name, state_of_release: location })`
- Screen 2: `updateProfile('housing', { housing_status })` + `updateProfile('supervision', { supervision_type })`
- Screen 3: store `immediate_needs` somewhere (no direct DB field — write to preferences or skip for now)

---

## 🔴 High priority — needed for a working demo

### 2. WebSocket doesn't emit tool/subagent events

`server.py` runs `agent.invoke()` synchronously, then character-streams the final text.
The frontend `ToolCard` and `CrisisBlock` components depend on `tool_start`, `tool_end`, `subagent_start`, `subagent_end`, and `crisis_response` events that never arrive.

**Fix:** Switch `_handle_chat_message` to use `agent.stream()` with `stream_mode="messages"` and inspect each chunk:
- `AIMessageChunk` with content → emit `token`
- `ToolMessage` or `AIMessage` with `tool_calls` → emit `tool_start` / `tool_end`
- Tool name `crisis_response` → emit `crisis_response`
- Subagent task messages → emit `subagent_start` / `subagent_end`

LangGraph streaming with deepagents needs testing — the event shape depends on what `create_deep_agent()` emits. Start by logging all streamed chunks to figure out the structure, then map to the WS event protocol.

### 3. `GET /api/documents` endpoint missing

`DocumentsPage.tsx` Generated tab calls `GET /api/documents`. The server has no such endpoint. The tab always shows the empty state.

**Fix:** Add to `server.py`:
```python
@app.get("/api/documents")
async def list_generated_documents():
    # Read from data/documents/ directory
    # Return list of GeneratedDocument objects
    docs_dir = DATA_DIR / "documents"
    ...
```
The orchestrator writes cover letters/resumes to `data/documents/` via `write_file`. The endpoint should list those files and return their metadata (type, title, word count, created date). Parse the type from filename convention or a metadata sidecar.

### 4. Agents can't see the rich DB profile

The orchestrator reads from the Pydantic `UserProfile` via `read_user_memory()` (the encrypted `.enc` file). It has no access to the full DB schema — so it doesn't know the PO name, curfew times, medications, certifications, etc. even though those fields are stored in the DB after OCR.

**Fix (option A, simpler):** In `memory_tools.py`, make `read_user_memory()` also query the DB and merge the data. The orchestrator gets one combined context string.

**Fix (option B, proper):** Add a `build_agent_context()` function in `services/interview_context.py` that reads the DB and returns a formatted string — then inject it into the orchestrator system prompt alongside the existing Pydantic profile. The `SYSTEM_PROMPT_TEMPLATE` in `orchestrator.py` already has a `{memory_context}` slot.

---

## 🟡 Medium priority — completes the spec

### 5. Interview agent (§4 of `threshold_impl.md`) — the biggest gap

The spec calls for a 6-phase conversational AI agent that fills the DB via the `interview_context.py` service (which already exists and knows which fields are missing by priority). There's no CLI `interview` command, no interview agent, and the 3-screen card-select onboarding is a stopgap.

**How to build it:**

The infrastructure is already in place:
- `GET /api/intake/status` returns exactly what the interview needs: missing fields by priority tier with human-readable descriptions
- `GET /api/intake/interview-context` calls `build_interview_prompt_context()` which generates the interview prompt
- `PATCH /api/profile` writes answers back to the DB

Option A (frontend-driven, easiest): extend the onboarding into a multi-step conversational UI. After the 3-screen card flow, redirect to `/chat` with a pre-filled prompt that kicks off the interview. The orchestrator handles the interview conversationally using `read_user_memory` + `update_profile_field` to fill gaps. No new backend needed.

Option B (dedicated interview agent): build `agents/interview.py` as a separate LangGraph graph (per §4 spec). System prompt reads from `GET /api/intake/interview-context` to know what's missing. Runs trauma-informed 6-phase flow. Writes to DB via PATCH. Add `uv run python main.py interview` CLI command. This is the spec-faithful approach.

### 6. Supervision and Community subagents missing

Spec calls for 6 subagents. Currently: employment, housing, benefits, legal, form_filler (5). Missing:
- **Supervision subagent** — tracks parole/probation conditions, check-in dates, reporting requirements. Right now `supervision_tracker.py` is a tool but there's no subagent that can reason about it. With a proper DB profile (item 4 fixed), this becomes much more useful.
- **Community subagent** — resource finder, 211 lookups, community programs, peer support groups.

**How to build:** Follow the pattern in any existing subagent (e.g. `legal.py`). Define a dict with `name`, `description`, `system_prompt`, `tools`, `model`. Import and add to `subagents=[]` in `orchestrator.py`. Add routing rules to the orchestrator system prompt.

### 7. `tasks` and `export` CLI commands missing

`threshold_impl.md` §7 specifies:
- `tasks` — show active todo list from `TodoListMiddleware`
- `export` — copy `data/documents/shared/` to user-chosen path

Both are missing from `main.py`. Low complexity to add.

---

## 🟢 Lower priority — polish and completeness

### 8. Real LLM token streaming (not character simulation)

The server currently runs `agent.invoke()` and then simulates streaming by character-chunking the result with `asyncio.sleep(0.01)`. This means:
- The user waits the full processing time before any text appears
- Tool execution isn't interleaved with output
- The streaming cursor in the frontend shows but nothing actually streams

This is tied to item 2 (switching to `agent.stream()`). Once that's done, real tokens flow immediately.

### 9. Prompt caching

`threshold_impl.md` §11.2 recommends caching the user profile block (reduces cost ~80%). The profile is re-sent with every orchestrator invocation. `ChatAnthropic` supports this via `cache_control`.

**How:** Wrap the profile context block in the system prompt with `cache_control: {"type": "ephemeral"}`. Check `langchain-anthropic` docs for current syntax — it may be via `bind_tools` or a message-level extra.

### 10. Frontend profile stores not wired to backend

`profileStore.ts`, `jobStore.ts`, `housingStore.ts`, `benefitsStore.ts` all use mock data and never call the API. The dashboard shows Tyler Chen's hardcoded mock data regardless of what's in the DB.

**How:** Add `fetchProfile()` call in each store's init, mapping DB fields to frontend types. The `GET /api/profile` endpoint already returns the full DB profile organized by section. Start with `profileStore` since it feeds the dashboard header and chat context.

### 11. Settings page profile completion

`SettingsPage.tsx` has some wiring already (it imports `fetchProfileCompletion` from api.ts). The backend `GET /api/profile/completion` returns per-section completion percentages. Make the settings page display real completion data.

---

## Architecture notes for future reference

**Two data layers (by design):**
- `threshold/memory/profile.py` (Pydantic, encrypted JSON) — lightweight agent context, used by the CLI chat loop and `read_user_memory()` tool
- `threshold/db/models.py` (SQLAlchemy, SQLite) — full schema, used by the server API and OCR pipeline

The intention is that agents get a summarized context string, not raw DB queries. `build_interview_prompt_context()` in `services/interview_context.py` is the bridge — it reads the DB and formats it for agent consumption. Item 4 above is about making sure agents actually use this.

**Intake pipeline (design intent, partially built):**
```
Upload doc → OCR (Gemini Flash) → upsert_from_extraction() → DB
                                                               ↓
                                          build_interview_prompt_context()
                                                               ↓
                                          Interview agent asks for missing fields
                                                               ↓
                                                PATCH /api/profile → DB
```
Steps 1–2 work. Steps 3–4 (interview agent) are the main gap.

**Section name map** (easy to confuse):

| Frontend call | Correct section name | Table |
|---|---|---|
| `personal` | `identity` | `user_identity` |
| `situation.housing` | `housing` | `housing_profile` |
| `situation.supervision` | `supervision` | `supervision_profile` |
| `situation.employment` | `employment` | `employment_profile` |
| `situation.benefits` | `benefits` | `benefits_profile` |
| `preferences` | `preferences` | `user_preferences` |
