# Threshold

Local-first, trauma-informed AI assistant for people navigating re-entry after incarceration.

Built with [deepagents](https://github.com/langchain-ai/deepagents), [LangGraph](https://langchain-ai.github.io/langgraph/), and [Claude](https://www.anthropic.com/claude).

## Quick Start

### Prerequisites

- Python 3.12+
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
# Clone the repo
git clone https://github.com/skylarrwang/threshold.git
cd threshold

# Install dependencies (uv handles virtualenv automatically)
uv sync

# Copy env template and add your API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

### Run

```bash
# 1. Create a test profile (generates encryption key + demo user "Tyler")
uv run python main.py seed

# 2. Start chatting
uv run python main.py chat

# 3. View current profile
uv run python main.py profile
```

Inside the chat, type `help` for available commands and capabilities.

### LangGraph Studio (optional)

If you have [LangGraph Studio](https://github.com/langchain-ai/langgraph-studio), you can run the agent with a visual debugger:

```bash
langgraph dev
```

The graph config is in `langgraph.json`.

---

## Project Structure

```
threshold/
├── agents/
│   ├── orchestrator.py          # Main agent — routes to tools and subagents
│   └── subagents/
│       ├── employment.py        # Employment specialist subagent
│       └── housing.py           # Housing specialist subagent
├── memory/
│   ├── encryption.py            # AES-256 profile encryption (Fernet)
│   ├── profile.py               # UserProfile Pydantic model + persistence
│   ├── observation_stream.py    # Rolling event/observation log
│   └── reflection.py            # Memory synthesis and reflections
├── tools/
│   ├── crisis_response.py       # Crisis hotline / safety tool
│   ├── memory_tools.py          # read_user_memory, update_profile_field, log_event
│   ├── benefits_lookup.py       # SNAP, Medicaid, SSI eligibility checks
│   ├── supervision_tracker.py   # Parole/probation condition tracking
│   ├── document_lookup.py       # ID restoration, expungement eligibility
│   ├── job_search.py            # ⚠️  STUB — job search + ban-the-box
│   └── housing_search.py        # ⚠️  STUB — housing search
└── tests/
workflows/
├── cover_letter.md              # Step-by-step cover letter workflow
├── resume.md                    # Resume building workflow
├── housing_application_letter.md
├── legal_letter.md
└── community_resource_search.md
main.py                          # CLI entrypoint (Typer + Rich)
AGENTS.md                        # Agent long-term memory (auto-updated)
langgraph.json                   # LangGraph deployment config
pyproject.toml                   # Dependencies (managed by uv)
```

---

## For Teammates: Working on Tools & Workflows

The core agent scaffolding is in place. Your main job is to **replace the stub tools with real API integrations** and **improve/add workflow files**.

### Stub Tools to Replace

There are two files with stub implementations that return mock data. Each one has `TODO` comments at the top explaining exactly what API to integrate.

#### 1. `threshold/tools/job_search.py`

**What it does now:** Returns hardcoded `MOCK_JOBS` list (5 sample jobs).

**What needs to happen:**

- Replace `search_jobs()` with a real job API call. The `TODO` at line 19 suggests [Adzuna API](https://developer.adzuna.com/). Other options: Indeed API, Google Jobs API, or JSearch on RapidAPI.
- Filter/prioritize results for ban-the-box and second-chance employers.
- `log_job_application()` and `get_ban_the_box_status()` are already fully implemented — no changes needed there.

**Key constraint:** The function signatures and return types must stay the same (they're `@tool`-decorated functions that return `str`). The orchestrator and employment subagent call these by name.

#### 2. `threshold/tools/housing_search.py`

**What it does now:** Returns hardcoded `MOCK_HOUSING` list (5 sample programs).

**What needs to happen:**

- Replace `search_housing()` with a real data source. The `TODO` at line 14 suggests [211.org API](https://www.211.org/) or web scraping. Other options: HUD API, Reentry Housing Directory scraping.
- `log_housing_application()` is fully implemented — no changes needed.

**Key constraint:** Same as above — keep the `@tool` decorator, function signature, and `str` return type.

### How Tools Work

Every tool is a function decorated with `@tool` from `langchain_core.tools`. The agent calls them by name based on the user's request.

- **Adding a new tool:** Define the function in the appropriate file under `threshold/tools/`, add `@tool`, and then:
  1. Export it from `threshold/tools/__init__.py`
  2. Add it to the relevant tool list in `threshold/agents/orchestrator.py` (for core tools) or the subagent definition in `threshold/agents/subagents/employment.py` / `housing.py`
  3. Mention it in the system prompt so the agent knows when to use it

- **Tool return format:** Always return a `str`. Use markdown formatting for readability — the agent passes the return value directly to the user.

### Subagents

Subagents are defined as plain Python dicts in `threshold/agents/subagents/`. Each has:

- `name` — how the orchestrator references it via `task()`
- `description` — tells the orchestrator when to delegate
- `system_prompt` — instructions for the subagent
- `tools` — list of tool functions it can call
- `model` — which Claude model to use

The orchestrator delegates to subagents using the built-in `task()` tool from `deepagents`. You don't need to wire up routing — the orchestrator decides based on the description.

### Workflow Files

Files in `workflows/` are step-by-step markdown instructions that agents read at runtime using `read_file()`. The agent is told to read the relevant workflow before performing writing tasks (cover letters, resumes, etc.).

To add a new workflow:

1. Create a `.md` file in `workflows/`
2. Reference it in the orchestrator system prompt (`threshold/agents/orchestrator.py`, around line 66)
3. If it's subagent-specific, also reference it in that subagent's system prompt

### Reference Files

These documents contain the full design spec and architecture. Read them if you need context on why something is built a certain way:

- `first_steps.md` — Implementation plan with architecture decisions
- `threshold_impl.md` — Full design document with all schemas, flows, and rationale

---

## Environment Variables

| Variable                    | Required | Description                                                       |
| --------------------------- | -------- | ----------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`         | Yes      | Anthropic API key for Claude                                      |
| `THRESHOLD_DATA_DIR`        | No       | Data directory (default: `./data`)                                |
| `THRESHOLD_ENCRYPTION_KEY`  | Auto     | Fernet key for profile encryption (auto-generated by `seed`)      |
| `THRESHOLD_MODEL`           | No       | Model for orchestrator (default: `claude-3-5-haiku-20241022`)     |
| `THRESHOLD_INTERVIEW_MODEL` | No       | Model for interview agent (default: `claude-3-5-sonnet-20241022`) |
| `LANGCHAIN_TRACING_V2`      | No       | Enable LangSmith tracing (`true`/`false`)                         |
| `LANGCHAIN_API_KEY`         | No       | LangSmith API key (only if tracing enabled)                       |

---

## Not Yet Implemented

- **Interview agent** — guided onboarding conversation to build the user profile (currently bypassed with `seed`)
- **Real job/housing APIs** — currently returns mock data (see above)
- **Frontend** — design spec exists in `threshold_frontend_design.md`
