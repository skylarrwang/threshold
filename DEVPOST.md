## Inspiration

Every year, 600,000 people walk out of U.S. prisons and into a world that wasn't designed to welcome them back. One in 55 Americans has a felony conviction. They need housing, but landlords run background checks. They need jobs, but applications ask about criminal history. They need benefits, but eligibility rules vary by state, offense category, and a web of federal restrictions most caseworkers can't keep straight.

The support that exists is fragmented. Housing is one office. Benefits is another phone call. Legal aid has a six-month waitlist. And the person navigating all of this — often on a prepaid phone, riding a bus, fresh out of a shelter — is expected to figure it out alone.

We built Threshold because we believe AI should meet people where they are. Not as a generic chatbot that says "call 211 for more info," but as a specialized assistant that *knows* the rules, *tracks* your progress, and *walks you through* each step — with the warmth of a good case worker and the availability of a phone in your pocket.

## What it does

Threshold is a local-first, trauma-informed AI assistant that helps people navigate re-entry after incarceration. It combines deep domain knowledge with a multi-agent architecture to provide real, actionable guidance across five critical areas:

**Housing** — Search emergency shelters, re-entry housing programs, and Section 8 options. Track applications through 14 stages (from discovery to move-in). Look up fair-chance housing laws by state. Access HUD fair market rent data for voucher holders. Get personalized application checklists based on housing type and situation.

**Employment** — Search for jobs with awareness of ban-the-box laws across 16+ states. Generate tailored cover letters and resumes with forward-looking conviction disclosure strategies. Track applications from submission to offer. Know which employers are second-chance friendly.

**Benefits** — Calculate Connecticut-specific eligibility for SNAP, Medicaid (HUSKY A/B/C/D), and Medicare Savings Programs. Real eligibility rules encoded as data — not hallucinated by an LLM. Accounts for drug felony opt-out states, income thresholds, deduction calculations, and estimated monthly benefit amounts.

**Legal Navigation** — Track parole and probation conditions with proactive reminders ("Your Friday check-in is tomorrow"). Get state-specific ID restoration guides (birth certificate, Social Security card, state ID). Check expungement eligibility by state and offense category.

**Government Form Auto-Fill** — Using Claude's computer use capability with a remote browser, Threshold pre-fills .gov forms with your profile data. You review everything on a live preview and click submit yourself — the AI never submits for you. Only government domains are allowed.

**Always-On Protections:**
- *Crisis protocol* — If a user expresses suicidal ideation or acute emotional crisis, the system immediately surfaces 988, Crisis Text Line, and SAMHSA resources. No delegation, no delay, no exceptions.
- *Encrypted storage* — All personal data is encrypted with AES-256 (Fernet) and stored locally. No telemetry, no analytics, no third-party scripts. Your data never leaves your device.
- *Privacy by design* — The system never references your conviction or offense unless you bring it up first. When disclosure is necessary (like for a ban-the-box application), it's framed as forward-looking, never apologetic.

The frontend is a responsive web app with a real-time streaming chat interface, document vault with OCR upload, and dedicated dashboards for housing, employment, and benefits. Designed for budget smartphones: 48px touch targets, 18px base font size, works on a $50 Android phone with intermittent connectivity.

## How we built it

**Architecture: The right tool for the right task.**

We designed a 4-tier capability model to avoid the trap of throwing an LLM at every problem:

1. **System prompt** (free) — Trauma-informed principles, routing rules, crisis protocol
2. **@tool functions** (deterministic) — Eligibility calculations, database lookups, supervision tracking. Fast, reliable, no hallucination risk.
3. **Markdown workflows** (guided generation) — Cover letters, resumes, housing application letters. The agent reads step-by-step instructions and applies its own reasoning.
4. **Full subagents** (autonomous) — Only for genuinely multi-step tasks like housing search (search, filter, match, draft, track) that require their own planning.

**Multi-model orchestration.** Different tasks need different models. Our orchestrator runs on Google Gemini 2.5 Flash for fast, cheap routing. Benefits and legal lookups use Claude Haiku for quick structured responses. Employment and form-filling use Claude Sonnet for quality writing and computer use. Housing uses xAI's Grok 4.1 Fast for rapid search and matching. LangGraph handles state management and checkpointing across the entire system.

**Backend:** Python 3.13, FastAPI, LangGraph + deepagents for multi-agent orchestration, SQLite with Fernet encryption at rest.

**Frontend:** React 19 + TypeScript + Vite, TailwindCSS v4, Zustand for state management, WebSocket streaming with exponential backoff reconnection. Material Symbols icons. Framer Motion for subtle animations.

**Trauma-informed design** isn't a feature — it's in every decision. We use amber instead of red for alerts (red means "violation" to someone on parole). We explain *why* before asking sensitive questions. We celebrate progress explicitly. The UI feels like opening a notebook, not logging into a government portal.

## Challenges we ran into

**Encoding legal complexity as data, not prompts.** SNAP eligibility alone involves federal drug felony bars with 23 state opt-outs, gross and net income tests with multiple deduction categories, and household size calculations. We had to encode all of this as deterministic Python logic — one hallucinated eligibility answer could cost someone months of food assistance.

**Making crisis response un-delegable.** In a multi-agent system, the natural pattern is to route everything through subagents. But crisis response can't wait for routing. We had to ensure the orchestrator catches crisis signals *before* any delegation happens and short-circuits the entire agent pipeline.

**Multi-provider model orchestration.** We use four different LLM providers (Anthropic, Google, xAI, and Browserbase for computer use). Each has different APIs, rate limits, and failure modes. Getting them to work together seamlessly through LangGraph required careful error handling and fallback logic.

**Designing for the actual user.** Our target user might be on a bus with a cracked-screen budget Android phone and a prepaid data plan. Every design decision — from the 48px touch targets (larger than WCAG minimum, because calloused hands on bumpy transport) to the 18px base font to the offline-capable architecture — reflects that reality.

**Government form safety.** Auto-filling forms is powerful but dangerous. We built a strict .gov-only domain allowlist, ensured the AI never clicks submit, and created a live preview system so the user always reviews before any form is submitted.

## Accomplishments that we're proud of

- **17+ domain-specific tools** with real eligibility rules, real program databases, and real legal frameworks — not a chatbot wrapper that says "consult a professional"
- **Crisis protocol** that interrupts everything. No edge case, no delegation path, no prompt injection can prevent a person in crisis from seeing 988 and SAMHSA resources immediately
- **Zero data collection.** AES-256 encryption at rest, no analytics, no telemetry, no third-party scripts. For a population that has been surveilled their entire lives, privacy isn't a feature — it's a promise
- **Concrete, actionable guidance.** "Call Hartford Housing Authority at (860) 723-8400 and ask about the Project-Based Voucher waitlist" — not "look into housing programs in your area"
- **A 3-person team** built a full-stack, multi-agent, multi-model AI application with encrypted storage, real-time streaming, 5 specialized subagents, and a responsive frontend — in under 24 hours

## What we learned

- **Re-entry support is shockingly fragmented.** There is no single source of truth for what a returning citizen is eligible for. Rules vary by state, county, offense category, time since release, and dozens of other factors. The fact that this information isn't centralized is itself a systemic failure.
- **Trauma-informed design changes everything.** Small choices — amber instead of red, explaining before asking, celebrating a completed application — fundamentally change how a system feels. Technology for vulnerable populations can't just be functional; it has to be *safe*.
- **Not every task needs an LLM.** Our 4-tier model taught us that the cheapest, fastest, most reliable answer is often a Python function, not a language model. Eligibility rules should be code. Writing tasks should be guided. Only genuinely complex, multi-step reasoning needs a full agent.
- **Multi-agent systems need firm boundaries.** Each subagent has an explicit list of what it CAN and CANNOT do. The housing agent can search programs but cannot contact landlords. The form filler can fill fields but cannot click submit. Clear boundaries prevent both errors and scope creep.

## What's next

- **Real job search API integration** (Adzuna, Indeed) to replace our curated employer database with live listings
- **Expand beyond Connecticut** — The architecture is state-aware by design. Adding new states means adding eligibility rules and program databases, not rewriting the system
- **Progressive Web App** for true offline access — critical for users with intermittent connectivity
- **Push notifications** for supervision reminders, application deadlines, and follow-up alerts
- **End-to-end encrypted cloud sync** for multi-device access without compromising the local-first privacy model
- **Partnerships with re-entry organizations** for real-world testing and feedback from the people who need this most

## Built With

- anthropic-claude
- browserbase
- deepagents
- fastapi
- framer-motion
- google-gemini
- langgraph
- python
- react
- sqlite
- tailwindcss
- typescript
- vite
- websocket
- xai-grok
- zustand
