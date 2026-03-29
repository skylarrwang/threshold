# Threshold — Hackathon Demo Notes

## Elevator Pitch (30 seconds)

Threshold is a trauma-informed AI assistant for people navigating re-entry after incarceration. Its voice interview agent uses motivational interviewing — the clinical gold standard — to conduct adaptive intake conversations that fill structured profiles while building genuine understanding of the person. It watches engagement signals in real-time, adjusts its pace and warmth when someone gets uncomfortable, and never pushes. The result: a 60-field profile captured in a 12-minute conversation that feels like talking to a good case worker, not filling out a form.

---

## What Makes This Outstanding

### 1. Clinically Grounded: Motivational Interviewing (MI)

This is not "be empathetic" as a prompt instruction. The entire conversational framework implements **OARS** — the evidence-based standard for working with re-entry populations:

- **Open questions**: "Tell me about your living situation" instead of "Are you housed?"
- **Affirmations**: "It sounds like you've been really proactive about getting your meds sorted"
- **Reflections**: "So finding stable housing is really the top priority for you right now"
- **Summaries**: "What I Heard" reflective checkpoints between each phase

**Why this matters for judges**: MI is what trained social workers use. Building it into an AI agent shows deep domain expertise, not just technical skill. It's the difference between "we built a chatbot" and "we built something a case worker would trust."

### 2. Real-Time Emotional Adaptation

The EngagementTracker is a custom Pipecat processor that measures:

- **Response latency** — longer pauses indicate discomfort or cognitive load
- **Response length** — shortening answers signal disengagement
- **Avoidance markers** — "I don't know", "whatever", "next question"
- **Topic deflection** — changing subject away from what was asked

These signals feed a 0.0–1.0 engagement score that triggers:

- **Adaptive VAD**: When engagement drops, the silence threshold extends 50% so the agent doesn't cut off someone who needs time to think
- **Adaptive TTS**: ElevenLabs voice parameters shift — slower speech, warmer tone — when someone sounds stressed
- **Agent behavior**: The LLM receives the engagement score and can offer breaks, affirm the person, or skip sensitive topics

**Demo moment**: Point out when the engagement indicator shifts during a sensitive question. "See how the agent slowed down and offered to skip? It detected that the response took longer and was shorter than average."

### 3. Conversational Clustering

Instead of asking 60 fields one at a time, the agent uses **natural question clusters**:

- "Tell me about your living situation right now — where you're staying and who's around" covers `housing_status`, `returning_to_housing_with`, `current_address`
- "What's the deal with supervision? Do you have a PO you check in with?" covers `supervision_type`, `po_name`, `reporting_frequency`, `next_reporting_date`

A 60-field intake that would take 45 minutes field-by-field takes **12–15 minutes** with clustering.

### 4. OCR-Aware Dynamic Steering

Before the voice interview starts, documents can be uploaded (conditions of supervision, discharge papers). Gemini Flash extracts structured fields via vision OCR. The interview agent then:

- **Skips** anything OCR already captured
- **Targets** only the gaps
- **Confirms** OCR-extracted data ("We got your PO's name from your paperwork — Officer Johnson, right?")

**Demo moment**: Upload a conditions-of-supervision document first, then start the voice interview. Show how the agent skips 15+ fields that were already extracted and focuses only on what's missing.

### 5. The "I Don't Know" Protocol

Most intake systems treat blank fields as missing data. But for this population, many blanks mean "I genuinely don't know and I need help finding out." Threshold distinguishes the two:

- If someone says "I don't know my PO's phone number", the agent responds: "That's totally fine — a lot of people don't have that memorized. We can look it up together later."
- The field is marked `needs_help` (not null), and the orchestrator proactively assists later

**Why this matters**: It transforms a data-collection failure into a care opportunity.

### 6. Live Schema Visualization

During the interview, the frontend shows schema fields filling in **real-time** via WebSocket events:

- Fields animate from gray → green as `save_field()` is called
- `needs_help` fields appear in amber with a tooltip
- Observation category badges pulse when qualitative notes are logged
- A progress ring shows completion percentage climbing

**Demo moment**: This is the visual showstopper. Judges watch data materialize from natural conversation. Point to the screen as fields fill in: "Every green field you see appeared from that single exchange about housing."

### 7. Post-Interview Synthesis

After the interview, three artifacts are generated:

**Person-Centered Summary** — Written in the person's own voice:
> "Tyler is focused on getting stable housing and reconnecting with his daughter. He's pragmatic about supervision — sees it as something to get through, not fight. He lit up when talking about his carpentry skills. He got quiet when medications came up — he's worried about the insurance gap but didn't want to dwell on it."

**Highlight Reel** — Structured extraction:
- Goals expressed (in their own words)
- Strengths identified (skills, attitude, support network)
- Concerns raised (fears, sensitive topics)
- Fields needing follow-up (everything marked `needs_help`)

**Care Plan Seed** — Auto-generated first actions:
- "You mentioned needing your medications — let's get your Medicaid sorted first"
- "Your carpentry experience is a real asset — want me to look for construction jobs that work with your curfew?"

**Why this matters**: The interview isn't just data collection. It produces an immediate, personalized action plan. The user's first experience after the interview is seeing that the conversation led somewhere.

### 8. Trauma-Informed Voice Design

Every voice interaction decision is deliberate:

- **Permission-based transitions**: "I'd like to ask about your health next — is that okay?"
- **Explicit skip offers**: "You can skip this if you'd rather not go into it. We can always come back."
- **Adaptive silence**: The agent waits longer for responses when engagement is low — never cuts someone off
- **Reading-level matching**: Mirrors the user's vocabulary complexity. Simple language from the user = simple language from the agent. Never talks down.
- **Break offers**: "We've covered a lot. Want to take a minute, or keep going?"

---

## Demo Script (Suggested Flow)

### Setup (1 min)
- Show the empty profile — all fields gray
- "This person just got out. They have their conditions-of-supervision form and a discharge certificate."

### Document Upload (2 min)
- Upload the demo documents
- Show OCR results populating ~20 fields instantly
- "Gemini Flash extracted everything it could from the paperwork. But there's a lot it can't get — reporting schedule, medications, housing situation, goals. That's what the interview covers."

### Voice Interview (8-10 min)
- Start the voice interview
- Point out as it happens:
  - "Notice how it skipped asking for the name — OCR already got that"
  - "See the conversational clustering — one question covered three fields"
  - "The engagement score just dipped — watch how the agent adjusts"
  - "It's logging an observation about their attitude toward supervision"
  - "They said 'I don't know' about the drug testing schedule — see the amber field? It marked it for follow-up"
  - "Here's the reflective summary — it's checking what it heard before moving on"

### Post-Interview (2 min)
- Show the completed profile — most fields green, a few amber
- Show the person-centered summary
- Show the care plan seed
- "From a 10-minute conversation, the system now knows enough to start helping immediately."

### Ongoing Chat (2 min)
- Switch to the text chat interface
- Show how the orchestrator uses the interview data: "I see you mentioned needing your meds sorted — want me to check your Medicaid eligibility?"
- Show a subagent delegation in action

### Close (30 sec)
- "700,000 people are released from incarceration every year. Two-thirds are re-arrested within three years. The first 72 hours are the most critical. Threshold meets people where they are — literally, with their voice — and turns a clinical intake into a conversation that actually helps."

---

## Technical Stack (for judges who ask)

| Layer | Technology |
|-------|-----------|
| Voice transport | Daily WebRTC |
| Speech-to-text | Deepgram (streaming) |
| Interview LLM | Anthropic Claude Sonnet (MI-prompted) |
| Text-to-speech | ElevenLabs Turbo v2.5 (adaptive params) |
| Voice framework | Pipecat + Pipecat Flows |
| Orchestrator LLM | xAI Grok (general chat) |
| Document OCR | Google Gemini Flash (vision) |
| Database | SQLite + encrypted JSON profile |
| Backend | FastAPI + LangGraph + deepagents |
| Frontend | React 19 + Vite + Tailwind + Pipecat Voice UI Kit |
| Browser automation | Anthropic computer use + Browserbase |

## Key Differentiators vs. Other Projects

| Feature | Typical Hackathon Project | Threshold |
|---------|--------------------------|-----------|
| Intake | Static form | MI-grounded voice interview |
| Adaptation | Fixed prompts | Real-time engagement tracking + adaptive TTS/VAD |
| Data capture | One field at a time | Conversational clustering (3x faster) |
| Missing info | Blank = missing | Blank vs. needs_help distinction |
| Post-intake | "Profile saved" | Person-centered summary + care plan seed |
| Clinical basis | "Be empathetic" | Motivational interviewing (OARS) |
| Voice quality | Generic TTS | Adaptive warmth, pace, and silence tolerance |
