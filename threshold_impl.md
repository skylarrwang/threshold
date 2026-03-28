# THRESHOLD

**Re-Entry AI Agent — Technical Implementation Spec**

*Instructions for Claude Code*

> **Stack:** Python 3.12 · deepagents 0.4 · LangGraph 1.1 · Anthropic Claude API · SQLite + AES-256
>
> **Hackathon Build · 24 Hours**

---

## 1. Project Overview

Threshold is a local-first, trauma-informed AI assistant for people navigating re-entry after incarceration. It is built as a specialized deep agent fork: a single orchestrator that spawns domain-specific subagents for employment, housing, benefits, supervision compliance, legal documents, and community wellbeing.

This document is a complete implementation specification for Claude Code. Follow each section in order. When a task says "implement", write the code. When it says "test", run the tests. Do not skip steps.

> **IMPORTANT: Read This First**
>
> This spec assumes you have cloned the repo, activated a Python 3.12 venv, and set `ANTHROPIC_API_KEY` in `.env`. All paths are relative to the project root unless otherwise noted.

### 1.1 System Architecture (4 Layers)

| Layer | Component | Description |
|-------|-----------|-------------|
| 0 | Intake Interview Agent | One-time trauma-informed 6-phase interview. Builds the user's structured profile. Runs before anything else. |
| 1 | Memory & Filesystem | Local-first encrypted SQLite + flat files. Observation stream, reflection engine, profile JSON. AES-256 at rest. |
| 2 | Orchestrator Agent | Top-level deepagents graph. Routes user queries, runs proactive check-in loop, spawns subagents via `task()` tool. |
| 3 | Domain Subagents (×6) | Employment, Housing, Benefits, Supervision, Docs/Legal, Community. Each is a compiled LangGraph subgraph. |

---

## 2. Repository Setup

Complete these steps before writing any application code.

### 2.1 Directory Structure

Create the following directory tree:

```
threshold/
├── agents/
│   ├── __init__.py
│   ├── orchestrator.py         # Top-level deepagents graph
│   ├── interview.py            # Intake interview agent
│   ├── subagents/
│   │   ├── __init__.py
│   │   ├── employment.py
│   │   ├── housing.py
│   │   ├── benefits.py
│   │   ├── supervision.py
│   │   ├── documents.py
│   │   └── community.py
├── memory/
│   ├── __init__.py
│   ├── profile.py              # Structured profile read/write
│   ├── observation_stream.py   # Event logging
│   ├── reflection.py           # Nightly reflection synthesis
│   └── encryption.py           # AES-256 helpers
├── tools/
│   ├── __init__.py
│   ├── job_search.py
│   ├── housing_search.py
│   ├── benefits_lookup.py
│   ├── supervision_tracker.py
│   ├── document_generator.py
│   └── resource_finder.py
├── data/                       # Runtime data (gitignored)
│   ├── profile/
│   ├── memory/
│   ├── tracking/
│   ├── documents/
│   └── resources/
├── skills/                     # deepagents skill definitions
│   ├── job_application/
│   │   └── SKILL.md
│   └── housing_search/
│       └── SKILL.md
├── tests/
│   ├── test_interview.py
│   ├── test_memory.py
│   └── test_agents.py
├── AGENTS.md                   # deepagents persistent memory
├── langgraph.json
├── pyproject.toml
├── .env.example
└── main.py                     # CLI entrypoint
```

### 2.2 Dependencies (pyproject.toml)

Create `pyproject.toml` with the following contents:

```toml
[project]
name = "threshold"
version = "0.1.0"
requires-python = ">=3.12"

[project.dependencies]
deepagents = "^0.4.12"
langgraph = "^1.1.3"
langgraph-checkpoint-sqlite = "^3.0"
langchain-anthropic = "^0.3"
langchain-core = "^0.3"
anthropic = "^0.40"
cryptography = "^42"           # AES-256 via Fernet
python-dotenv = "^1.0"
rich = "^13"                   # Terminal UI
typer = "^0.12"                # CLI
pydantic = "^2.7"              # Schema validation
httpx = "^0.27"                # Async HTTP for tool calls
```

Install with: `uv sync` (or: `pip install -e ".[dev]" --break-system-packages`)

### 2.3 Environment Variables (.env.example)

```env
ANTHROPIC_API_KEY=sk-ant-...
THRESHOLD_DATA_DIR=./data        # Local data directory
THRESHOLD_ENCRYPTION_KEY=        # 32-byte base64 key (generate below)
THRESHOLD_MODEL=claude-3-5-haiku-20241022   # Default model
THRESHOLD_INTERVIEW_MODEL=claude-3-5-sonnet-20241022  # Richer model for interview
LANGCHAIN_TRACING_V2=false       # Set true for LangSmith debug
LANGCHAIN_API_KEY=               # Optional: LangSmith
```

Generate the encryption key with:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## 3. Memory & Filesystem Layer

Implement the memory layer first. All agents depend on it. Use local SQLite (via langgraph-checkpoint-sqlite) for agent state, and AES-256 encrypted JSON files for the user profile and sensitive records.

### 3.1 Encryption Module (`memory/encryption.py`)

Implement a simple AES-256 wrapper using Fernet (symmetric encryption). All sensitive files must be encrypted at rest.

**Required functions:**

- `encrypt_file(data: dict, path: Path) → None` — JSON-serialize, Fernet-encrypt, write to `.enc` file
- `decrypt_file(path: Path) → dict` — read `.enc` file, Fernet-decrypt, JSON-parse
- `get_fernet() → Fernet` — load key from `THRESHOLD_ENCRYPTION_KEY` env var

### 3.2 Structured Profile (`memory/profile.py`)

The profile is the output of the intake interview. It is the central data structure that all agents read from. Implement a Pydantic model and file I/O functions.

**UserProfile Pydantic model — include these fields:**

- `user_id`: str (UUID4)
- `created_at`: datetime
- `last_updated`: datetime
- `personal`: PersonalContext — `name` (optional), `age_range`, `gender_identity` (optional), `home_state`, `release_date`, `time_served`, `offense_category` (non-violent/violent/drug/financial/other), `comfort_with_technology`
- `situation`: SituationContext — `housing_status` (housed/shelter/couch_surfing/unhoused), `employment_status`, `benefits_enrolled` (list), `supervision_type` (none/probation/parole/supervised_release), `supervision_end_date` (optional), `immediate_needs` (list of strings)
- `goals`: GoalsContext — `short_term_goals` (list), `long_term_goals` (list), `values` (list), `strengths` (list), `concerns` (list)
- `support`: SupportContext — `has_case_worker` (bool), `case_worker_name` (optional), `support_contacts` (list), `trusted_people` (list)
- `preferences`: PreferenceContext — `communication_style` (direct/gentle/informational), `check_in_frequency` (daily/weekly/as_needed), `wants_reminders` (bool), `privacy_level` (high/medium/low)

**Implement these file I/O functions:**

- `save_profile(profile: UserProfile) → None` — encrypt to `data/profile/structured_profile.json.enc`
- `load_profile() → UserProfile | None` — decrypt and parse, return None if not found
- `profile_exists() → bool`

### 3.3 Observation Stream (`memory/observation_stream.py`)

The observation stream is a rolling log of events — every tool call result, every user message summary, every milestone. Based on the Smallville generative agents architecture.

**Observation model:**

- `observation_id`: UUID4
- `timestamp`: datetime
- `agent`: str — which agent generated it (orchestrator, employment, etc.)
- `event_type`: `Literal["user_message", "tool_result", "milestone", "check_in", "reflection"]`
- `content`: str — plain text summary
- `importance`: float — 0.0–1.0 score (compute with LLM call or heuristic)
- `tags`: list[str] — e.g. `["job_search", "rejection", "cover_letter"]`

**Implement these functions:**

- `log_observation(obs: Observation) → None` — append to `data/memory/observation_stream.json`
- `get_recent_observations(n: int = 20, agent: str = None) → list[Observation]`
- `get_observations_by_tag(tags: list[str], limit: int = 10) → list[Observation]`
- `score_importance(content: str) → float` — LLM call: *"Rate the importance of this event for a person in re-entry on a scale of 0–1. Event: {content}"*

### 3.4 Reflection Engine (`memory/reflection.py`)

Every 24 hours (or on demand), synthesize recent observations into high-level reflections. This is the "reflection" step from Smallville. Reflections help agents understand patterns over time.

**Implement:**

- `synthesize_reflections(profile: UserProfile, recent_obs: list[Observation]) → list[str]` — call Claude with: *"Given this person's situation and these recent events, what are the 3–5 most important insights or patterns you notice? Focus on progress, challenges, and emerging needs."*
- `save_reflections(reflections: list[str]) → None` — append to `data/memory/reflections.json` with timestamp
- `load_recent_reflections(days: int = 7) → list[str]`
- `build_memory_context(profile: UserProfile) → str` — returns a formatted string combining profile summary + recent reflections + urgent observations, for injection into agent prompts

---

## 4. Intake Interview Agent

The intake interview is a one-time 1–2 hour conversation that builds the user's structured profile. It must be trauma-informed, non-clinical, and explain the "why" before every sensitive question. It runs before the main agent loop.

**Trauma-Informed Principles (Non-Negotiable):**

- Always explain WHY before asking
- Nothing is required — always offer to skip
- Use plain language, no jargon
- Acknowledge difficulty before asking hard questions
- Never imply judgment

### 4.1 Interview Agent Implementation (`agents/interview.py`)

Implement as a deepagents graph using `create_deep_agent()`. The interview agent has NO subagents. It uses a single LLM (claude-3-5-sonnet for quality) with a custom system prompt.

**Interview system prompt must include:**

- Role: *"You are a warm, non-judgmental intake counselor helping someone prepare for their AI assistant after leaving incarceration."*
- Trauma-informed principles: explain before asking, skip anything uncomfortable, no judgment
- Goal: build the UserProfile schema by the end of the conversation
- Style: conversational, not a questionnaire — follow threads naturally, circle back
- Constraint: never ask more than one hard question per turn

**Interview phases (implement as state machine):**

| Phase | Name | What the agent asks about | Profile fields populated |
|-------|------|---------------------------|--------------------------|
| 1 | Welcome & Consent | Explain what Threshold does, get consent to proceed | *(none — setup only)* |
| 2 | Basic Situation | Current housing, employment, supervision status | `situation.*` |
| 3 | Background | Release date, time served, offense category (with explanation of why we ask) | `personal.*` |
| 4 | Goals & Strengths | What they want to work on, what they're good at, what matters to them | `goals.*` |
| 5 | Support Network | Case worker, trusted people, support contacts | `support.*` |
| 6 | Preferences & Wrap-up | Communication style, check-in frequency, privacy level | `preferences.*` |

---

## 5. Orchestrator Agent

*(Section referenced in build plan — implement the top-level deepagents graph that routes user queries and spawns subagents via `task()` tool.)*

---

## 6. Domain Subagents

*(Section referenced in build plan — implement all 6 subagents: Employment, Housing, Benefits, Supervision, Docs/Legal, Community.)*

---

## 7. CLI Entrypoint (`main.py`)

**Special commands:**

- `"help"` — show available subagents and what they can do
- `"profile"` — display current UserProfile as a formatted table
- `"tasks"` — show active todo list from TodoListMiddleware
- `"reflect"` — manually trigger `synthesize_reflections()` and show output
- `"export"` — export documents in `data/documents/shared/` to a user-chosen path

---

## 8. LangGraph Configuration & Checkpointing

Configure LangGraph for checkpointing with SQLite so users can resume interrupted conversations and the orchestrator can maintain long-running state.

### 8.1 `langgraph.json`

```json
{
  "graphs": {
    "orchestrator": "./agents/orchestrator.py:graph",
    "interview": "./agents/interview.py:graph"
  },
  "dependencies": ["."],
  "env": ".env"
}
```

### 8.2 Checkpoint Setup (`memory/__init__.py`)

Initialize the SQLite checkpointer once and reuse it across the application:

```python
from langgraph.checkpoint.sqlite import SqliteSaver
import sqlite3, os

DB_PATH = os.path.join(os.getenv("THRESHOLD_DATA_DIR", "./data"), "checkpoints.db")

def get_checkpointer() -> SqliteSaver:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    return SqliteSaver(conn)
```

Pass the checkpointer when compiling graphs:

```python
graph = create_deep_agent(...).compile(checkpointer=get_checkpointer())
```

Use a stable `thread_id` per user session so state persists across restarts:

```python
config = {"configurable": {"thread_id": "threshold-main"}}
result = graph.invoke({"messages": [...]}, config=config)
```

### 8.3 Human-in-the-Loop (HITL) for Interview

The interview agent must pause for user input between turns. Use LangGraph's `interrupt_before` mechanism:

```python
# In interview.py — compile with interrupt_before on the human node
graph = builder.compile(
    checkpointer=get_checkpointer(),
    interrupt_before=["human_node"]
)

# Resume with user input:
graph.update_state(config, {"messages": [HumanMessage(content=user_input)]})
result = graph.invoke(None, config)  # None = resume from checkpoint
```

---

## 9. Testing

Write tests as you implement each component. Run the full test suite before moving to the next section.

### 9.1 Memory Layer Tests (`tests/test_memory.py`)

- `test_encrypt_decrypt_roundtrip()` — encrypt a dict, decrypt it, assert equality
- `test_profile_save_load()` — create a UserProfile, save it, load it, assert all fields match
- `test_observation_stream_append_and_query()` — log 5 observations, query by tag, assert filtering works
- `test_reflection_synthesis()` — mock the LLM call, assert `synthesize_reflections()` returns a non-empty list
- `test_build_memory_context()` — assert output is a non-empty string containing profile data

### 9.2 Interview Agent Tests (`tests/test_interview.py`)

- `test_profile_extraction_from_transcript()` — provide a mock transcript, assert `extract_profile_from_transcript()` returns a valid UserProfile with expected fields populated
- `test_phase_detection()` — assert `phase_detector_node` correctly advances phase counter
- `test_interview_resume_from_checkpoint()` — start interview, simulate interruption, resume, assert conversation continues from correct phase

### 9.3 Agent Integration Tests (`tests/test_agents.py`)

- `test_orchestrator_routes_to_employment()` — send *"I need help finding a job"*, assert `task()` is called with `subagent_type="employment"`
- `test_orchestrator_routes_to_supervision()` — send *"When is my next check-in?"*, assert supervision subagent is invoked
- `test_crisis_response_does_not_delegate()` — send a message expressing suicidal ideation, assert `crisis_response()` is called and `988` appears in output
- `test_cover_letter_generation()` — provide a mock job, assert `generate_cover_letter()` returns a non-empty string
- `test_proactive_checkin_surfaces_deadline()` — add a supervision check-in within 24 hours, assert `check_in_loop()` returns a reminder message

### 9.4 Running Tests

```bash
# Install dev dependencies
pip install pytest pytest-asyncio pytest-mock --break-system-packages

# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=. --cov-report=term-missing
```

---

## 10. 24-Hour Build Plan

This is the hackathon execution order. Complete phases sequentially — each phase is a dependency for the next.

| Phase | Hours | Deliverable | Exit Criteria |
|-------|-------|-------------|---------------|
| 1 | 0–4h | Repo setup (Section 2) + Memory layer (Section 3) + all memory tests passing | `pytest tests/test_memory.py` passes |
| 2 | 4–9h | Interview agent (Section 4): state machine, system prompt, profile extraction, interview tests | Can run a mock interview end-to-end and get a valid UserProfile |
| 3 | 9–16h | Orchestrator (Section 5) + all 6 subagents with stub tools (Section 6). Real tools for Employment + Benefits only. | Orchestrator correctly routes to all 6 subagents; employment and benefits tools return real data |
| 4 | 16–21h | CLI entrypoint (Section 7) + LangGraph checkpointing (Section 8). Full end-to-end run. | `python main.py` runs, completes first-time interview, drops into chat loop |
| 5 | 21–24h | Polish: Rich UI, remaining tool implementations, full test suite, demo script | `pytest tests/` all green; 5-minute demo script works |

### 10.1 Demo Script (for Judges)

Prepare a demo that shows the key capability loop. This should run in under 5 minutes:

1. Start Threshold with a pre-loaded profile (create a seed script that generates a test profile without running the interview)
2. Show the profile summary with `python main.py profile`
3. Ask: *"I need help finding a job that will hire me with my background"* — shows employment subagent routing + ban-the-box awareness
4. Ask: *"Can you write me a cover letter for this position?"* — shows cover letter generation, file saved to `data/documents/`
5. Ask: *"When is my next parole check-in?"* — shows supervision tracker
6. Ask: *"Am I eligible for SNAP?"* — shows benefits eligibility with offense-category awareness
7. Type `"reflect"` — shows the reflection synthesis loop

---

## 11. Cost Management & API Keys

### 11.1 Model Selection Strategy

Use the cheapest model that is sufficient for each task. Do not use Sonnet when Haiku works.

| Task | Model | Reason | Cache? |
|------|-------|--------|--------|
| Intake interview | claude-3-5-sonnet-20241022 | Emotional intelligence required | No (dynamic) |
| Profile extraction | claude-3-5-sonnet-20241022 | Structured output accuracy | Yes — transcript |
| Orchestrator routing | claude-3-5-haiku-20241022 | Fast routing, low cost | Yes — system prompt |
| Employment subagent | claude-3-5-sonnet-20241022 | Job matching quality matters | Yes — profile |
| Housing/Benefits/Supervision | claude-3-5-haiku-20241022 | Lookup + formatting tasks | Yes — profile |
| Cover letter generation | claude-3-5-sonnet-20241022 | Quality writing critical | Yes — profile |
| Reflection synthesis | claude-3-5-haiku-20241022 | Summarization task | Yes — profile |
| Crisis response | claude-3-5-sonnet-20241022 | Never cut corners on safety | No |

### 11.2 Prompt Caching

Use Anthropic's prompt caching for the user profile and system prompt. The profile is a large static block that gets re-sent with every request — caching it reduces cost by ~80%.

**Implementation pattern:**

```python
from anthropic import Anthropic

# Mark the profile block as cacheable using cache_control
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "text",
                "text": profile_context,  # The large static profile block
                "cache_control": {"type": "ephemeral"}  # Cache this
            },
            {
                "type": "text",
                "text": user_query  # The dynamic query (not cached)
            }
        ]
    }
]
```

> **Note:** LangChain's `ChatAnthropic` supports this via the `extra_headers` parameter or the `anthropic-beta` header. Check the `langchain-anthropic` docs for the current API.

### 11.3 External API Keys Needed

| Key | Purpose |
|-----|---------|
| `ANTHROPIC_API_KEY` | Required. All LLM calls. |
| `SERPAPI_KEY` or `ADZUNA_API_KEY` | For job search tool. Free tier available. Adzuna preferred (more forgiving). |
| `211_API_KEY` (optional) | 211.org API for housing + community resources. Can use web scraping as fallback. |
| `LANGCHAIN_API_KEY` (optional) | LangSmith for debugging. Free tier. Strongly recommended during development. |

---

## 12. Reference & Further Reading

### 12.1 Key deepagents APIs

| API | Description |
|-----|-------------|
| `create_deep_agent()` | github.com/langchain-ai/deepagents — primary entry point |
| `SubAgent`, `SubAgentMiddleware` | For defining and registering subagents |
| `FilesystemMiddleware` | Pre-built: ls, read_file, write_file, edit_file, glob, grep, execute |
| `MemoryMiddleware` | Loads AGENTS.md into every prompt; agents update it via edit_file |
| `TodoListMiddleware` | Injects write_todos tool; agent can plan and track tasks |
| `SummarizationMiddleware` | Auto-evicts large tool results to filesystem to prevent context overflow |

### 12.2 LangGraph APIs Used

| API | Description |
|-----|-------------|
| `StateGraph` | Core graph builder — define nodes, edges, conditionals |
| `interrupt_before` | Human-in-the-loop: pause graph execution before a named node |
| `SqliteSaver` | SQLite checkpoint backend — persistent state across restarts |
| `add_messages` | Annotation for message accumulation in state |
| `stream_mode="messages"` | Stream individual tokens to terminal in real time |

### 12.3 Critical Design Constraints

**Privacy: Data NEVER leaves the device**

Do not add any telemetry, analytics, or remote logging. The only outbound network calls are: (a) Anthropic API for LLM calls, (b) job/housing/benefits search APIs, (c) optional LangSmith for debug. All user data stays in `data/` directory, encrypted at rest.

**Safety: Crisis Response Is Non-Delegable**

If any message from the user contains language indicating suicidal ideation, self-harm, or acute crisis: the orchestrator must respond IMMEDIATELY without delegating to a subagent. Return **988**, **Crisis Text Line (text HOME to 741741)**, and local crisis center info. Never route a crisis message through the todo list or task queue.

**Scope: This Is Not Legal Advice**

All information about eligibility, expungement, legal rights, and supervision conditions must be accompanied by a disclaimer: *"This is general information, not legal advice. Consult a reentry attorney or legal aid organization for your specific situation."*

---

*— End of Spec —*
