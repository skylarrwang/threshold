# Threshold — TODO & Implementation Notes

> Gap analysis against `threshold_impl.md` and `interview/info_collection.md`.
> Items are ordered roughly by impact on demo quality.

---

## ✅ Completed

### 1. ~~Onboarding sends wrong section names to the API~~ — FIXED
Fixed `OnboardingPage.tsx` to use correct section names: `identity`, `housing`, `supervision`.

### 2. ~~WebSocket doesn't emit tool/subagent events~~ — ALREADY IMPLEMENTED
Server already uses `astream_events()` v2 API. All event types (tool_start, tool_end, subagent_start, subagent_end, crisis_response, token, thinking) are emitted and handled by the frontend.

### 3. ~~`GET /api/documents` endpoint missing~~ — FIXED
Added endpoint to `server.py` that lists generated documents from `data/documents/`.

### 4. ~~Agents can't see the rich DB profile~~ — FIXED
`read_user_memory()` and `build_system_prompt()` now query the SQLite DB for full profile data (PO name, curfew, medications, certifications, applications) and merge it into the agent context.

### 5. ~~Interview agent~~ — IMPLEMENTED (Option A: frontend-driven)
After onboarding, user is redirected to `/chat?interview=true` which auto-sends an interview prompt. The orchestrator uses `read_user_memory` + `update_profile_field` to fill profile gaps conversationally.

### 6. ~~Supervision and Community subagents missing~~ — FIXED
Added `supervision.py` and `community.py` subagents. Registered in orchestrator with routing rules and capability descriptions. Now 7 subagents total.

### 7. ~~`tasks` and `export` CLI commands missing~~ — FIXED
Added both commands to `main.py`.

### 8. ~~Real LLM token streaming~~ — ALREADY IMPLEMENTED
Same as item 2 — `astream_events()` provides real token streaming.

### 10. ~~Frontend profileStore not wired~~ — FIXED
`profileStore.ts` now calls `GET /api/profile` and maps DB fields to frontend types. DashboardPage triggers `loadProfile()` on mount. Other stores (jobStore, housingStore, benefitsStore) were already wired.

### 11. ~~Settings page profile completion~~ — ALREADY IMPLEMENTED
`settingsStore.ts` already calls `fetchProfileMatrix()` and `fetchProfile()`.

---

## 🟡 Remaining Items

### 9. Prompt caching

`threshold_impl.md` §11.2 recommends caching the user profile block (reduces cost ~80%). The profile is re-sent with every orchestrator invocation.

**Blocker:** Orchestrator currently uses xAI Grok via ChatOpenAI, not Anthropic. Grok does not document prompt caching support. Revisit if/when switching to Anthropic models.

### 5b. Reentry timeline generation

After profile creation (OCR + interview), generate a personalized day-by-day / week-by-week timeline of priority actions based on the user's profile. Surface on the Dashboard as the "Plan" panel. Not yet implemented.

---

## Architecture notes for future reference

**Unified data layer (SQLite DB as single source of truth):**
- `threshold/db/models.py` (SQLAlchemy, SQLite) — all profile data: identity, housing, supervision, employment, health, benefits, preferences, goals, support, financial
- `threshold/db/profile_bridge.py` — bridge that loads DB data into a Pydantic `UserProfile` object for agent consumption, and maps dot-notation field paths to DB writes
- `threshold/memory/profile.py` — Pydantic model definitions only (no longer reads/writes the encrypted JSON file in production)
- The old encrypted JSON file (`structured_profile.json.enc`) is no longer used. All reads and writes go through the DB.

**Intake pipeline (fully built):**
```
Upload doc → OCR (Gemini Flash) → upsert_from_extraction() → DB
                                                               ↓
                                          build_interview_prompt_context()
                                                               ↓
                                          Onboarding → /chat?interview=true
                                                               ↓
                                          Orchestrator fills gaps via update_profile_field()
```

**Section name map** (easy to confuse):

| Frontend call | Correct section name | Table |
|---|---|---|
| `identity` | `identity` | `user_identity` |
| `housing` | `housing` | `housing_profile` |
| `supervision` | `supervision` | `supervision_profile` |
| `employment` | `employment` | `employment_profile` |
| `benefits` | `benefits` | `benefits_profile` |
| `preferences` | `preferences` | `user_preferences` |
