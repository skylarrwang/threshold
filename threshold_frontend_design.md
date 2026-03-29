# Threshold — Frontend Design Document

> **For:** yhack 2026 Hackathon Build
>
> **Stack:** React 19 + Vite + TypeScript, TailwindCSS 4, Framer Motion, WebSocket, PWA
>
> **Target:** Mobile-first Progressive Web App, served locally alongside the Python backend

---

## Table of Contents

1. [Product Philosophy](#1-product-philosophy)
2. [Target Users and Device Reality](#2-target-users-and-device-reality)
3. [Information Architecture](#3-information-architecture)
4. [Visual Design System](#4-visual-design-system)
5. [Screen-by-Screen Design](#5-screen-by-screen-design)
6. [Interaction Patterns](#6-interaction-patterns)
7. [Crisis Mode](#7-crisis-mode)
8. [Accessibility](#8-accessibility)
9. [Technical Architecture](#9-technical-architecture)
10. [API Contract](#10-api-contract-with-backend)
11. [Hackathon Build Order](#11-hackathon-build-order)

---

## 1. Product Philosophy

### 1.1 The Core Tension

Threshold's users are navigating one of the hardest transitions a person can face. They are overwhelmed, often distrustful of systems, and may be using technology under stress for the first time in years. The frontend must be a companion, not an interface. It should feel like opening a notebook that already knows your situation — not like logging into a government portal.

### 1.2 Design Principles

**Warmth over polish.** Every pixel should communicate "you are welcome here." Rounded corners, warm colors, generous whitespace, soft transitions. No sharp edges, no cold blues, no serif headers that evoke courtrooms and paperwork. If it looks like a government form, it's wrong.

**Clarity over cleverness.** No hamburger menus hiding critical actions. No tooltips gating essential information. No gestures that require discovery. Every action should be visible, labeled, and reachable in one tap. If a feature requires explanation, the explanation should be on-screen permanently — not in an onboarding carousel the user saw once.

**Progressive disclosure, always.** The user should never see 15 options at once. Present 2-3 paths at a time. Let them drill in. Surface complexity only when they ask for it. The dashboard shows the next 3 things; the chat handles everything else.

**Privacy is visible.** The user should never have to wonder where their data goes. Show a persistent privacy indicator. Explain encryption in plain language. Never use dark patterns to collect more than necessary. The lock icon is not decoration — it is a promise.

**Emotional safety is a feature.** Colors, motion, and language should self-regulate based on context. When the user is in crisis, the UI should slow down — fewer elements, calmer colors, larger text, prominent helpline numbers. The chat should never feel like it's rushing them.

### 1.3 What This Frontend Must Never Do

- Display conviction details or offense categories anywhere in the UI unless the user explicitly navigates to their profile settings and chooses to view them
- Use red for error states in any context adjacent to supervision/compliance (red = violation = panic — use amber instead)
- Show loading spinners that feel like the system is "thinking about" the user (use progress language like "Finding resources near you..." instead)
- Include any telemetry, analytics pixels, or third-party scripts
- Cache sensitive data in browser storage without encryption
- Display a generic chatbot widget — this is a full application, not a support chat

---

## 2. Target Users and Device Reality

### 2.1 User Profiles

| Profile                               | Device                                                              | Context                                                          | Tech Comfort                                                    |
| ------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Recently released, has a smartphone   | Android phone (budget, likely 2-3 years old) with prepaid data plan | Using the app on a bus, in a shelter, waiting at a parole office | Low-to-medium. Knows texting, basic apps.                       |
| Released 6+ months ago, rebuilding    | Shared laptop or library computer                                   | Using the app in focused sessions, applying for jobs             | Medium. Can navigate web apps.                                  |
| Re-entering with support              | Case worker's tablet or borrowed device                             | Someone else may have set this up for them                       | Very low. May need the interview to teach them how to interact. |
| Tech-comfortable, longer post-release | Personal laptop or recent phone                                     | Independent use, potentially daily                               | High. Expects modern UX.                                        |

### 2.2 Device Constraints

- **Screen size:** Design for 375px width minimum (iPhone SE / budget Android). Desktop is a bonus, not the target.
- **Connection:** Assume intermittent connectivity. The app must degrade gracefully when offline — cached profile, cached documents, queued messages.
- **Data budget:** Minimize asset downloads. No hero images, no video backgrounds, no web fonts over 100KB total. Use system fonts as fallback.
- **Session length:** Users may have 5-minute sessions (quick check) or 60-minute sessions (writing a cover letter). Both must be first-class.
- **Interruption tolerance:** Users will be interrupted. The app must preserve state across tab closures, phone calls, and battery-saving OS kills.

### 2.3 Implications for Design

- Minimum touch target: 48x48px (not the WCAG minimum of 44px — these users may have calloused hands, may be on bumpy transport)
- Base font size: 18px (not 16px)
- Line height: 1.6 (generous)
- No hover-dependent interactions (mobile has no hover)
- No swipe-to-delete or swipe-to-reveal (too easy to trigger accidentally, too hard to discover)
- Maximum content width on desktop: 640px (reading width — this is a conversation app, not a dashboard)

---

## 3. Information Architecture

### 3.1 Navigation Model

Bottom tab navigation on mobile (4 tabs). No hamburger menu. No side drawer. The 4 tabs represent the 4 things the user actually does:

```
[Home]    [Chat]    [Docs]    [Plan]
```

- **Home** — Daily briefing, upcoming items, quick actions
- **Chat** — The primary AI conversation interface
- **Docs** — Generated documents (cover letters, resumes, legal letters)
- **Plan** — Goals, supervision tracker, milestones, reflections

Settings is accessed via a profile avatar in the top-right corner of any screen. It is not a tab — it's used rarely.

On desktop (>768px), the layout shifts to a two-column view: left sidebar with the 4 sections as a vertical nav, right pane with the content. Chat gets the full width when active.

### 3.2 Full Sitemap

```
Threshold App
├── First Launch
│   ├── Welcome Screen (what is Threshold, privacy promise)
│   ├── Privacy Consent
│   └── Intake Interview (6-phase conversational flow)
│       ├── Phase 1: Welcome & Consent
│       ├── Phase 2: Basic Situation
│       ├── Phase 3: Background
│       ├── Phase 4: Goals & Strengths
│       ├── Phase 5: Support Network
│       └── Phase 6: Preferences & Wrap-up
│
├── Home (default after onboarding)
│   ├── Greeting Banner (personalized, time-aware)
│   ├── Upcoming Items Card (next 3 deadlines/actions)
│   ├── Quick Actions Grid
│   │   ├── "Find a job"
│   │   ├── "Find housing"
│   │   ├── "Check my benefits"
│   │   └── "Talk to Threshold"
│   ├── Recent Wins (milestones from observation stream)
│   └── Proactive Check-in (if supervision reminder is due)
│
├── Chat
│   ├── Conversation Thread
│   │   ├── User Messages
│   │   ├── Agent Messages (with markdown rendering)
│   │   ├── Tool Execution Cards (inline, real-time)
│   │   ├── Document Preview Cards (inline)
│   │   ├── Eligibility Result Cards (inline)
│   │   └── Crisis Response Block (full-width, non-dismissable)
│   ├── Message Input Bar
│   │   ├── Text Input (auto-expanding)
│   │   └── Suggested Prompts (contextual, above input)
│   └── Active Task Indicator (when subagent is working)
│
├── Docs
│   ├── Document List (sorted by recency)
│   │   ├── Cover Letters
│   │   ├── Resumes
│   │   ├── Housing Application Letters
│   │   └── Legal Letters
│   ├── Document Detail View
│   │   ├── Full text rendering
│   │   ├── Copy to Clipboard
│   │   ├── Export as .txt / .pdf
│   │   └── "Ask Threshold to revise"
│   └── Empty State ("No documents yet. Chat with Threshold to create one.")
│
├── Plan
│   ├── Goals Overview
│   │   ├── Short-term Goals (editable)
│   │   └── Long-term Goals (editable)
│   ├── Supervision Tracker
│   │   ├── Upcoming Requirements (next 7 days)
│   │   ├── Conditions List
│   │   ├── Check-in Log (history)
│   │   └── "Add a check-in" quick action
│   ├── Milestones Timeline (from observation stream)
│   └── Weekly Reflection (synthesized by reflection engine)
│
└── Settings (accessed via avatar)
    ├── Profile Summary
    │   ├── View profile fields
    │   ├── Edit name, location, preferences
    │   └── (offense category is viewable but de-emphasized)
    ├── Communication Preferences
    │   ├── Style: direct / gentle / informational
    │   ├── Check-in frequency: daily / weekly / as needed
    │   └── Reminders: on / off
    ├── Privacy & Security
    │   ├── "Your data is encrypted and stored only on this device"
    │   ├── Export all data
    │   ├── Delete all data (with confirmation)
    │   └── Encryption key info
    └── About Threshold
```

### 3.3 Navigation Flows

**First-time user:**
Welcome Screen → Privacy Consent → Intake Interview (6 phases) → Profile Summary Review → Home

**Returning user:**
Home (with personalized greeting and proactive check-in if applicable)

**Crisis at any point:**
Current screen → Crisis Mode overlay (see Section 7)

**Common task flows:**

```
"I need a job" →
  Home > Quick Action "Find a job" → Chat (auto-sends prompt) →
  Agent searches → Results as inline cards → User picks one →
  Agent drafts cover letter → Document preview inline →
  User approves → Saved to Docs

"When is my check-in?" →
  Home > Upcoming Items shows it → Tap for detail → Plan > Supervision →
  Or: Chat > ask → Agent calls get_upcoming_requirements() → Inline card

"Am I eligible for SNAP?" →
  Home > Quick Action "Check my benefits" → Chat (auto-sends prompt) →
  Agent calls check_snap_eligibility() → Eligibility card inline →
  Card includes application link as tappable button
```

---

## 4. Visual Design System

### 4.1 Design Philosophy: The Doorway

The name "Threshold" means a doorway — the liminal space between where you've been and where you're going. The visual language draws from this metaphor: warmth, openness, forward motion. The palette is drawn from natural materials — clay, sandstone, dried sage, warm linen — materials that feel grounded and human, not digital and cold.

The overall aesthetic is "calm productivity." Think: a well-organized notebook on a warm wooden desk, not a Silicon Valley SaaS dashboard.

### 4.2 Color Palette

**Core Palette**

| Token       | Hex       | Role                                           |
| ----------- | --------- | ---------------------------------------------- |
| `sand-50`   | `#FAF7F2` | Primary background (light mode)                |
| `sand-100`  | `#F0EBE3` | Card backgrounds, input fields                 |
| `sand-200`  | `#E0D8CC` | Borders, dividers                              |
| `sand-300`  | `#C4B8A8` | Placeholder text                               |
| `clay-500`  | `#C4775B` | Primary accent — buttons, links, active states |
| `clay-600`  | `#A85D43` | Primary accent hover/pressed                   |
| `clay-700`  | `#8B4A34` | Primary accent text on light backgrounds       |
| `bark-800`  | `#3D3129` | Primary text                                   |
| `bark-900`  | `#2A211A` | Headings, high emphasis text                   |
| `sage-400`  | `#8FAE8B` | Success, positive states, milestones           |
| `sage-500`  | `#6B9467` | Success text, completed indicators             |
| `amber-400` | `#E5A84B` | Warnings, upcoming deadlines (NOT red)         |
| `amber-500` | `#CC8F2D` | Warning text                                   |
| `sky-400`   | `#7AABCF` | Informational, links to external resources     |
| `sky-500`   | `#5B8FAF` | Informational text                             |

**Dark Mode Palette** (auto-detected from OS, user-overridable)

| Token       | Hex       | Role                                           |
| ----------- | --------- | ---------------------------------------------- |
| `night-900` | `#1A1612` | Primary background                             |
| `night-800` | `#262119` | Card backgrounds                               |
| `night-700` | `#342D23` | Borders, dividers                              |
| `night-600` | `#4A4035` | Subtle text, placeholders                      |
| `clay-400`  | `#D4896F` | Primary accent (slightly lighter for contrast) |
| `sand-200`  | `#E0D8CC` | Primary text                                   |
| `sand-100`  | `#F0EBE3` | Headings                                       |

**Crisis Mode Palette** (see Section 7)

| Token         | Hex       | Role                                                    |
| ------------- | --------- | ------------------------------------------------------- |
| `calm-bg`     | `#F5F0EB` | Softened background                                     |
| `calm-text`   | `#4A3F35` | Reduced contrast text                                   |
| `calm-accent` | `#7AABCF` | Crisis links and phone numbers (sky blue — trustworthy) |
| `calm-card`   | `#FFFFFF` | Crisis resource cards                                   |

**Intentional omissions:** There is no pure red (`#FF0000` or `#EF4444`) anywhere in the palette. Red evokes violations, stops, danger, and failure — all loaded concepts for this user base. Warnings use amber. Errors use amber with clear language. The closest to red is the clay accent, which reads as terracotta, not alarm.

### 4.3 Typography

**Font Stack:**

```css
--font-body:
  "Inter", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI",
  system-ui, sans-serif;
--font-mono: "JetBrains Mono", "SF Mono", "Cascadia Code", monospace;
```

Inter is loaded as a variable font (single file, ~100KB) for weight flexibility. System fonts are the fallback. No other web fonts.

**Type Scale:**

| Token       | Size | Weight | Line Height | Use                                  |
| ----------- | ---- | ------ | ----------- | ------------------------------------ |
| `text-xs`   | 13px | 400    | 1.4         | Timestamps, metadata                 |
| `text-sm`   | 15px | 400    | 1.5         | Secondary text, captions             |
| `text-base` | 18px | 400    | 1.6         | Body text, chat messages             |
| `text-lg`   | 21px | 500    | 1.5         | Card titles, section headers         |
| `text-xl`   | 26px | 600    | 1.3         | Page titles                          |
| `text-2xl`  | 32px | 700    | 1.2         | Greeting banner, onboarding headings |
| `text-3xl`  | 40px | 700    | 1.1         | Interview phase titles (mobile)      |

Base size is 18px, not 16px. This is deliberate — readability is more important than information density for this audience.

### 4.4 Spacing Scale

Use a 4px base grid. Common values:

| Token      | Value | Use                                             |
| ---------- | ----- | ----------------------------------------------- |
| `space-1`  | 4px   | Inline icon gaps                                |
| `space-2`  | 8px   | Tight padding (pills, badges)                   |
| `space-3`  | 12px  | Input padding, small card padding               |
| `space-4`  | 16px  | Standard card padding, element gaps             |
| `space-5`  | 20px  | Section gaps                                    |
| `space-6`  | 24px  | Large card padding                              |
| `space-8`  | 32px  | Section dividers                                |
| `space-10` | 40px  | Page-level vertical rhythm                      |
| `space-16` | 64px  | Major section breaks, onboarding breathing room |

### 4.5 Component Library

#### Buttons

Three variants, one size philosophy: big enough to tap without precision.

| Variant       | Appearance                                                                                  | Use                                           |
| ------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Primary**   | `clay-500` background, white text, 48px height, 16px horizontal padding, 12px border-radius | Main actions: "Send", "Save", "Get started"   |
| **Secondary** | `sand-100` background, `bark-800` text, 1px `sand-200` border, same dimensions              | Alternative actions: "Skip", "Edit", "Cancel" |
| **Ghost**     | Transparent background, `clay-500` text, same height                                        | Tertiary actions: "Learn more", "View all"    |

All buttons have a 200ms ease-out press animation (scale to 0.97). No outline-on-focus that looks like a bug — use a visible 3px `clay-500` ring offset by 2px.

#### Cards

The primary content container. Used for: upcoming items, document previews, eligibility results, milestone highlights, quick actions.

```
┌──────────────────────────────────────────┐
│  [Icon]  Title                    [Meta] │
│                                          │
│  Body text or content goes here.         │
│  Can be multi-line.                      │
│                                          │
│  [Action Button]          [Ghost Action] │
└──────────────────────────────────────────┘
```

- Background: `sand-100` (light) / `night-800` (dark)
- Border: 1px `sand-200` / `night-700`
- Border-radius: 16px
- Padding: 20px
- Shadow: `0 1px 3px rgba(0,0,0,0.04)` — barely there. Cards are distinguished by background, not elevation.
- Cards do NOT stack with visible depth (no stacked-paper effect). Each card stands alone.

#### Chat Bubbles

Not actually bubbles. Threshold messages and user messages have distinct visual treatments, but neither looks like a chat widget.

**User messages:**

- Right-aligned
- `clay-500` background, white text
- Border-radius: 20px top-left, 20px top-right, 4px bottom-right, 20px bottom-left
- Max-width: 80%
- No avatar

**Threshold messages:**

- Left-aligned, full width (no artificial max-width — these can be long)
- No background color — text renders directly on the page background
- A thin `sage-400` left border (3px) marks the start of each response
- `bark-800` text
- Avatar: a small, warm, abstract glyph (not a robot, not a face) — 28px circle with `sand-200` background

**Tool execution cards** appear inline within Threshold's response stream (see Section 6.2).

#### Input Field

The chat input is the most-used element in the app. It must be large, comfortable, and obvious.

- Height: 52px minimum, auto-expands to 120px max
- Background: `sand-100`
- Border: 2px `sand-200`, transitions to 2px `clay-500` on focus
- Border-radius: 26px (pill shape when single-line)
- Padding: 16px horizontal, 14px vertical
- Font size: 18px (matches body text)
- Placeholder: "Message Threshold..." in `sand-300`
- Send button: circular, 40px, `clay-500`, positioned inside the input on the right. Appears only when input is non-empty. Arrow icon, white.
- On mobile, the input bar is fixed to the bottom of the viewport with a `sand-50` background and a subtle top border

#### Suggested Prompts

Horizontal scroll of pill-shaped buttons that appear above the input field. Context-sensitive.

- Height: 36px
- Background: `sand-100`, border: 1px `sand-200`
- Border-radius: 18px (full pill)
- Font size: 15px, `bark-800`
- Horizontal gap: 8px
- The row is scrollable on mobile, with subtle fade on edges to indicate overflow
- Examples: "Check SNAP eligibility", "Find jobs near me", "When is my next check-in?"
- Tapping a prompt fills it into the input and auto-sends

#### Empty States

Every view has a designed empty state. No blank pages, ever.

Pattern:

- A simple, warm illustration (abstract — e.g. an open doorway, a sunrise gradient, a path) at ~120px height
- A short heading: "No documents yet"
- A body line: "When you ask Threshold to write a cover letter or resume, it'll show up here."
- A primary button if there's an obvious next action: "Start a conversation"

### 4.6 Iconography

Use Lucide icons (open source, consistent, rounded style). 24px default size, 2px stroke. Icons are always paired with a text label — never icon-only except in the tab bar (where labels are still present below the icon).

Tab bar icons:

- Home: `House` (filled when active)
- Chat: `MessageCircle` (filled when active)
- Docs: `FileText` (filled when active)
- Plan: `Target` (filled when active)

### 4.7 Motion

All motion uses `ease-out` curves. Duration: 150-300ms for micro-interactions, 400ms for page transitions.

Key motion principles:

- **Enter from below:** New content slides up gently (chat messages, cards appearing)
- **Exit to left:** Navigating deeper slides content left; going back slides right
- **Scale on press:** Buttons and cards scale to 0.97 on press, return on release
- **No bounce:** Bouncy spring animations feel playful/childish. This app is warm, not cute.
- **Reduced motion:** If the user's OS has `prefers-reduced-motion`, all animations collapse to instant opacity transitions

---

## 5. Screen-by-Screen Design

### 5.1 Welcome Screen (First Launch Only)

The very first thing the user sees. It sets the emotional tone for the entire experience. It must not feel like a terms-of-service screen.

**Layout (mobile, 375px):**

```
┌─────────────────────────────────┐
│                                 │
│         [Threshold logo]        │
│      a warm abstract glyph     │
│        of a doorway/arch        │
│                                 │
│       Welcome to Threshold      │ ← text-2xl, bark-900
│                                 │
│   Your personal guide for       │ ← text-base, bark-800
│   what comes next.              │
│                                 │
│   Threshold helps you find      │
│   jobs, housing, benefits,      │
│   and keeps track of what       │
│   matters — all in one place.   │
│                                 │
│   ┌─────────────────────────┐   │
│   │ Everything stays on     │   │ ← sand-100 card, with
│   │ your device. Your data  │   │   a small lock icon
│   │ is encrypted and never  │   │
│   │ sent anywhere.          │   │
│   └─────────────────────────┘   │
│                                 │
│                                 │
│   ┌─────────────────────────┐   │
│   │      Get Started        │   │ ← primary button, full-width
│   └─────────────────────────┘   │
│                                 │
│   Already have data? Import     │ ← ghost text link
│                                 │
└─────────────────────────────────┘
```

**Details:**

- No progress bar yet. No countdown. No "step 1 of 7." Just a warm welcome.
- The privacy card is not a checkbox — it's informational. There's no GDPR-style consent gate. The data never leaves the device, so there's nothing to consent to beyond understanding that.
- "Get Started" begins the intake interview.
- "Already have data? Import" handles the case where a user previously exported their profile and is setting up on a new device.

### 5.2 Intake Interview

The intake interview is a 6-phase conversation that builds the user's profile. It runs exactly once. It must feel like a conversation with a thoughtful person, not a web form.

**Design approach: one question at a time.** This is not a scrolling form. Each question occupies the full screen. The user answers, and the next question slides in. This reduces cognitive load, prevents the "how long is this form" anxiety, and lets each question breathe.

**Layout (mobile):**

```
┌─────────────────────────────────┐
│  ← Back           Phase 2 of 6 │ ← top bar, subtle
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░ │ ← progress bar, clay-500
│                                 │
│                                 │
│                                 │
│   Where are you staying         │ ← text-2xl, bark-900
│   right now?                    │
│                                 │
│   This helps me find the right  │ ← text-sm, sand-300
│   resources for your area and   │   "why we're asking" is
│   situation.                    │   always visible, not hidden
│                                 │
│                                 │
│   ┌─────────────────────────┐   │
│   │  🏠  I have a place     │   │ ← selection card (tappable)
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │  🛏️  Shelter or program │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │  🛋️  Staying with       │   │
│   │      someone            │   │
│   └─────────────────────────┘   │
│   ┌─────────────────────────┐   │
│   │  ❓  It's complicated   │   │
│   └─────────────────────────┘   │
│                                 │
│   Skip this question            │ ← ghost text, always visible
│                                 │
└─────────────────────────────────┘
```

**Question types:**

- **Single-select cards** (like above): for categorical questions (housing status, supervision type, communication style). Each option is a full-width tappable card with an icon, a label, and optionally a sublabel. Tapping selects and auto-advances after a 400ms pause (so the user sees their selection register).
- **Free text:** for open-ended questions (name, goals, strengths). A large text input, 18px, with a generous placeholder. A "Next" button appears when the user has typed something. The placeholder models the expected answer: "e.g., Find steady work, reconnect with my kids"
- **Multi-select cards:** for lists (immediate needs, benefits enrolled). Same as single-select but with checkboxes. A "Next" button appears below when at least one is selected.
- **Conversational:** Phase 1 (Welcome) and Phase 6 (Wrap-up) are rendered as chat-style back-and-forth, because they're more about dialogue than data collection. The interview agent's messages appear as chat bubbles, and the user types responses.

**Progress indicator:** A thin progress bar at the top, colored `clay-500` on `sand-200` background. It shows overall progress (phases 1-6), not individual questions within a phase. This is intentionally vague — showing "question 7 of 23" creates form anxiety.

**Skip is always visible.** The "Skip this question" link appears on every screen except Phase 1 (Welcome/Consent, which is not skippable). It never moves position. It is never grayed out. It is never hidden behind "are you sure?" confirmations.

**Transition between phases:** When moving to a new phase, a brief interstitial appears (1.5 seconds, auto-advancing):

- A warm full-screen gradient shift (subtle, from sand-50 to a slightly different warm tone)
- A short message: "Nice. Let's talk about what you're working toward." or "Thanks. Just a few more things."
- These interstitials humanize the process and give the user a mental break

**Profile Review (end of interview):**

After Phase 6, the user sees a summary of their profile in an editable card layout. Each section (Situation, Goals, Support, Preferences) is a collapsible card showing the values they provided. They can tap any field to edit it. A "Looks good — take me home" button finalizes and saves the profile.

### 5.3 Home Dashboard

The landing page after onboarding, and the default tab on return visits. It is a daily briefing, not an analytics dashboard. It should be glanceable in 5 seconds and actionable in 10.

**Layout (mobile):**

```
┌─────────────────────────────────┐
│  Threshold         [avatar ○]   │ ← top bar
│                                 │
│  Good morning, Tyler.          │ ← text-2xl, bark-900
│  Here's what's coming up.       │ ← text-base, sand-300
│                                 │
│  ┌─ UPCOMING ────────────────┐  │
│  │  ⏰  Parole check-in      │  │ ← amber-400 left border
│  │     Friday, 2pm — Office  │  │
│  │                           │  │
│  │  📋  SNAP application     │  │ ← sky-400 left border
│  │     Deadline: April 12    │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌─ RECENT WIN ──────────────┐  │
│  │  ✓  Cover letter drafted  │  │ ← sage-400 left border
│  │     for Home Depot        │  │
│  │     2 days ago            │  │
│  └───────────────────────────┘  │
│                                 │
│   QUICK ACTIONS                 │ ← text-sm, uppercase, sand-300
│                                 │
│  ┌──────────┐  ┌──────────┐    │
│  │  💼      │  │  🏠      │    │ ← 2x2 grid of action cards
│  │ Find a   │  │ Find     │    │   each ~160px wide, 100px tall
│  │ job      │  │ housing  │    │
│  └──────────┘  └──────────┘    │
│  ┌──────────┐  ┌──────────┐    │
│  │  📋      │  │  💬      │    │
│  │ Check    │  │ Talk to  │    │
│  │ benefits │  │ Threshold│    │
│  └──────────┘  └──────────┘    │
│                                 │
│                                 │
├─────────────────────────────────┤
│  [Home]  [Chat]  [Docs]  [Plan]│ ← bottom tab bar
└─────────────────────────────────┘
```

**Greeting logic:**

- Time-aware: "Good morning", "Good afternoon", "Good evening"
- Uses the user's first name from the profile
- If there's a supervision deadline within 48 hours, the subheading changes to: "You have a check-in coming up on Friday."
- If a milestone was logged recently (within 3 days), the subheading includes it: "You drafted a cover letter this week — nice work."

**Upcoming Items card:**

- Shows the next 2-3 time-sensitive items from the supervision tracker and observation stream
- Each item has a colored left border indicating urgency: amber for within 48 hours, sky for upcoming, sage for completed-but-recent
- Tapping an item navigates to the relevant detail view (supervision tracker, document, etc.)
- If there are no upcoming items, this section is replaced with a reassuring message: "Nothing urgent right now. You're on track."

**Recent Win card:**

- Pulls from the observation stream, filtered to `event_type: milestone`
- Shows the most recent win with a sage left border and a check icon
- If there are no milestones yet, this section shows: "Your first milestone is waiting. Let's get started."

**Quick Actions grid:**

- 2x2 grid of large tappable cards
- Each card navigates to Chat with a pre-filled prompt:
  - "Find a job" → Chat, auto-sends "I need help finding a job"
  - "Find housing" → Chat, auto-sends "I need help finding housing"
  - "Check benefits" → Chat, auto-sends "Am I eligible for benefits?"
  - "Talk to Threshold" → Chat, empty input (freeform)
- Cards have a subtle icon, a label, and a `sand-100` background
- These are the 4 most common entry points based on the backend capability model

### 5.4 Chat Interface

The primary surface of the application. Where the user spends 80% of their time. This must not feel like a chatbot widget pasted onto a webpage — it is the app.

**Layout (mobile):**

```
┌─────────────────────────────────┐
│  ← Home    Threshold     [···] │ ← top bar with overflow menu
│─────────────────────────────────│
│                                 │
│  ┃ Hey Tyler. How are you     │ ← threshold message
│  ┃ doing today? I noticed      │   (sage left border, no bg)
│  ┃ your check-in went well     │
│  ┃ last week — that's great.   │
│                                 │
│              I need help finding │ ← user message (clay bg)
│                     a job today │
│                                 │
│  ┃ I'll help with that. Let me │ ← threshold response
│  ┃ search for opportunities    │
│  ┃ near you.                   │
│  ┃                             │
│  ┃ ┌─ Searching ────────────┐  │ ← inline tool execution card
│  ┃ │ 🔍 Searching jobs in   │  │   (animated border)
│  ┃ │    Hartford, CT         │  │
│  ┃ │    ban-the-box ✓       │  │
│  ┃ │    ▓▓▓▓▓▓░░░░░░        │  │
│  ┃ └────────────────────────┘  │
│  ┃                             │
│  ┃ I found 3 openings that    │
│  ┃ might work:                 │
│  ┃                             │
│  ┃ ┌─ Job ──────────────────┐  │ ← inline result card
│  ┃ │ Warehouse Associate    │  │
│  ┃ │ Amazon — Hartford, CT  │  │
│  ┃ │ $18/hr · Full-time     │  │
│  ┃ │ Ban-the-box: Yes ✓     │  │
│  ┃ │ [Apply] [Cover Letter] │  │
│  ┃ └────────────────────────┘  │
│  ┃                             │
│  ┃ ┌─ Job ──────────────────┐  │
│  ┃ │ Kitchen Prep           │  │
│  ┃ │ ...                    │  │
│  ┃ └────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐   │
│  │ Check SNAP │ Write resume│   │ ← suggested prompts
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ Message Threshold...  [→]│   │ ← input bar, fixed bottom
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│  [Home]  [Chat]  [Docs]  [Plan]│
└─────────────────────────────────┘
```

**Message rendering:**

Threshold's messages support full markdown rendering:

- Bold, italic, lists, links
- Links render as tappable buttons (not underlined text) when they are phone numbers or application URLs
- Phone numbers render with a "Call" action: tapping opens the phone dialer
- Code blocks (if any) render in a monospace card with copy-to-clipboard

**Inline tool execution cards (critical UX element):**

When the backend is executing a tool (searching for jobs, checking eligibility, reading a workflow file), the frontend renders an inline card in the conversation that shows real-time progress. This replaces the generic "typing..." indicator.

Card anatomy:

- A compact card (sand-100 bg, sand-200 border, 12px padding)
- An icon representing the tool type (search glass for searches, clipboard for eligibility checks, pencil for document generation)
- A plain-language description: "Searching for jobs in Hartford, CT" or "Checking SNAP eligibility for your state"
- A subtle progress bar or animated dots
- Once complete, the card collapses to a single line: "✓ Found 3 job listings" — and the results render below as their own cards

Tool card types:

| Backend Tool                      | Frontend Card Label                       | Icon             |
| --------------------------------- | ----------------------------------------- | ---------------- |
| `search_jobs()`                   | "Searching for jobs near you..."          | `Search`         |
| `search_housing()`                | "Finding housing options..."              | `Home`           |
| `check_snap_eligibility()`        | "Checking SNAP eligibility..."            | `ClipboardCheck` |
| `check_medicaid_eligibility()`    | "Checking Medicaid eligibility..."        | `ClipboardCheck` |
| `check_ssi_eligibility()`         | "Checking SSI eligibility..."             | `ClipboardCheck` |
| `get_upcoming_requirements()`     | "Looking up your schedule..."             | `Calendar`       |
| `get_id_restoration_guide()`      | "Finding ID restoration steps..."         | `FileSearch`     |
| `check_expungement_eligibility()` | "Checking expungement options..."         | `Scale`          |
| `read_user_memory()`              | (no card — this is invisible to the user) | —                |
| `crisis_response()`               | (triggers Crisis Mode — see Section 7)    | —                |
| Workflow file read                | "Preparing to draft your [document]..."   | `PenTool`        |
| Subagent delegation               | "Working on this — give me a moment..."   | `Loader`         |

**Document preview cards:**

When the agent generates a document (cover letter, resume, legal letter), it appears inline as a preview card:

```
┌─ Cover Letter ──────────────────────┐
│                                      │
│  For: Warehouse Associate, Amazon    │
│  Created: March 28, 2026             │
│                                      │
│  "Dear Hiring Manager,               │
│                                      │
│   I'm writing to express my          │
│   interest in the Warehouse          │
│   Associate position..."             │
│                                      │
│  [Read Full]  [Copy]  [Edit in Chat] │
│                                      │
└──────────────────────────────────────┘
```

- Shows the first ~3 lines of the document as a preview
- "Read Full" navigates to the Docs tab with this document open
- "Copy" copies the full text to clipboard with a toast confirmation: "Copied to clipboard"
- "Edit in Chat" pre-fills the input with "Can you revise this cover letter? I'd like to..."

**Suggested prompts:**

A horizontally scrollable row of contextual prompt pills that appear above the input bar. They update based on conversation context:

- After profile creation: "Find a job", "Find housing", "Check benefits"
- After a job search: "Write a cover letter", "Search for more", "Check if they ban-the-box"
- After eligibility check: "How do I apply?", "Check another benefit"
- After document creation: "Make changes", "Start a new letter"
- On empty chat: "What can you help me with?", "Check my upcoming schedule"

**Streaming behavior:**

Messages from the agent stream in token-by-token (via WebSocket). The text cursor is a blinking `clay-500` block at the insertion point. Once the response is complete, the cursor disappears. If the response includes tool calls, the tool execution card appears first, then the response text streams in after the tool completes.

**Overflow menu (top-right `···`):**

- "Clear conversation" (with confirmation: "This clears the chat display. Your data and documents are kept.")
- "Export chat as text"
- "Trigger reflection" (runs `synthesize_reflections()` on demand)

### 5.5 Documents View

A clean, organized listing of all generated documents.

**Layout (mobile):**

```
┌─────────────────────────────────┐
│  Documents                      │
│                                 │
│  COVER LETTERS                  │ ← section header, text-sm
│                                 │
│  ┌───────────────────────────┐  │
│  │ 📄 Amazon — Warehouse     │  │ ← document card
│  │    March 28, 2026         │  │
│  │    348 words              │  │
│  └───────────────────────────┘  │
│  ┌───────────────────────────┐  │
│  │ 📄 Target — Cashier       │  │
│  │    March 25, 2026         │  │
│  │    312 words              │  │
│  └───────────────────────────┘  │
│                                 │
│  RESUMES                        │
│                                 │
│  ┌───────────────────────────┐  │
│  │ 📄 General Resume         │  │
│  │    March 26, 2026         │  │
│  │    Updated 2x             │  │
│  └───────────────────────────┘  │
│                                 │
│  LEGAL LETTERS                  │
│                                 │
│  (none yet)                     │
│                                 │
│  HOUSING LETTERS                │
│                                 │
│  (none yet)                     │
│                                 │
├─────────────────────────────────┤
│  [Home]  [Chat]  [Docs]  [Plan]│
└─────────────────────────────────┘
```

**Document detail view (tap on a document):**

```
┌─────────────────────────────────┐
│  ← Back              [···]     │
│                                 │
│  Cover Letter                   │ ← text-xl
│  Amazon — Warehouse Associate   │ ← text-sm, sand-300
│  March 28, 2026                 │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  Dear Hiring Manager,           │ ← text-base, full document
│                                 │
│  I'm writing to express my      │
│  interest in the Warehouse      │
│  Associate position at your     │
│  Hartford location...           │
│                                 │
│  [... full letter text ...]     │
│                                 │
│                                 │
│  ─────────────────────────────  │
│                                 │
│  ┌────────┐ ┌────────┐         │
│  │  Copy  │ │ Export  │         │ ← action buttons
│  └────────┘ └────────┘         │
│  ┌────────────────────────────┐ │
│  │ Ask Threshold to revise    │ │ ← secondary, full-width
│  └────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  [Home]  [Chat]  [Docs]  [Plan]│
└─────────────────────────────────┘
```

**Overflow menu (`···`):**

- "Export as .txt"
- "Export as .pdf"
- "Share" (generates a local file, opens OS share sheet)
- "Delete" (with confirmation)

### 5.6 Plan View

The user's goals, supervision tracker, milestones, and reflections. This is the "my progress" section — a place to see how far they've come and what's next.

**Layout (mobile, scrollable):**

```
┌─────────────────────────────────┐
│  My Plan                        │
│                                 │
│  GOALS                          │ ← section header
│                                 │
│  Short-term                     │
│  ┌───────────────────────────┐  │
│  │ ○ Find steady employment  │  │ ← goal items
│  │ ◉ Get state ID restored   │  │   ○ = in progress
│  │ ✓ Apply for SNAP          │  │   ◉ = active focus
│  └───────────────────────────┘  │   ✓ = completed
│                                 │
│  Long-term                      │
│  ┌───────────────────────────┐  │
│  │ ○ Get own apartment       │  │
│  │ ○ Reconnect with family   │  │
│  └───────────────────────────┘  │
│                                 │
│  [Edit Goals]                   │ ← ghost button
│                                 │
│  SUPERVISION                    │
│                                 │
│  ┌───────────────────────────┐  │
│  │ Next check-in             │  │
│  │ 📅 Friday, March 31       │  │
│  │ 🕐 2:00 PM                │  │
│  │ 📍 Hartford PO — Room 4   │  │
│  │                           │  │
│  │ Conditions:               │  │
│  │ • Report every Friday     │  │
│  │ • No travel outside CT    │  │
│  │ • Random drug testing     │  │
│  │                           │  │
│  │ [Log a Check-in]          │  │
│  └───────────────────────────┘  │
│                                 │
│  RECENT CHECK-INS              │
│  ┌───────────────────────────┐  │
│  │ ✓ Mar 24 — Completed      │  │
│  │ ✓ Mar 17 — Completed      │  │
│  │ ✓ Mar 10 — Completed      │  │
│  └───────────────────────────┘  │
│                                 │
│  MILESTONES                     │
│                                 │
│  ── March 2026 ──               │ ← timeline, month headers
│  ┌───────────────────────────┐  │
│  │ ✓ Drafted cover letter    │  │ ← milestone entries
│  │   for Amazon              │  │   from observation stream
│  │   Mar 28                  │  │
│  ├───────────────────────────┤  │
│  │ ✓ Completed SNAP          │  │
│  │   eligibility check       │  │
│  │   Mar 26                  │  │
│  ├───────────────────────────┤  │
│  │ ✓ Created resume           │  │
│  │   Mar 25                  │  │
│  └───────────────────────────┘  │
│                                 │
│  WEEKLY REFLECTION              │
│                                 │
│  ┌───────────────────────────┐  │
│  │ "Tyler has been making   │  │ ← from reflection engine
│  │  steady progress on job   │  │   italicized, sage left border
│  │  search. He's completed   │  │
│  │  3 applications this week │  │
│  │  and is building          │  │
│  │  confidence in interviews.│  │
│  │  Housing remains the most │  │
│  │  pressing concern."       │  │
│  │                           │  │
│  │  Generated: Mar 27        │  │
│  └───────────────────────────┘  │
│                                 │
├─────────────────────────────────┤
│  [Home]  [Chat]  [Docs]  [Plan]│
└─────────────────────────────────┘
```

**"Log a Check-in" flow:**
Tapping "Log a Check-in" opens a bottom sheet (not a new page) with:

1. Date picker (defaults to today)
2. Type selector: In-person / Phone / Office
3. Outcome selector: Completed / Missed / Rescheduled
4. Optional notes field
5. "Save" button

This calls the `log_check_in()` backend tool and updates the check-in log immediately.

**Goal editing:**
"Edit Goals" opens the goals in editable mode. Each goal becomes an editable text field with a delete icon. An "Add goal" row appears at the bottom. Saving updates the profile via `update_profile_field()`.

### 5.7 Settings

Accessed via the avatar icon in the top-right corner. Opens as a full page (not a modal — modals are easy to accidentally dismiss).

**Sections:**

**Profile Summary** — Shows all profile fields grouped by category (Personal, Situation, Goals, Support, Preferences). Each field is tappable to edit. Offense category is shown in a collapsed section labeled "Background Information" that requires a deliberate tap to expand — it is never shown by default.

**Communication Preferences** — Three toggle-style selectors:

- Style: Direct / Gentle / Informational (visual radio buttons with descriptions)
- Check-in frequency: Daily / Weekly / As needed
- Reminders: On / Off

**Privacy & Security:**

- A clear statement: "All your data is encrypted and stored on this device only. Threshold never sends your personal information to any server except to process your requests."
- "Export my data" — downloads a `.zip` of all profile, documents, and observation data
- "Delete all my data" — double-confirmation: "Are you sure? This cannot be undone." → "Type DELETE to confirm" → deletion + redirect to welcome screen
- Encryption key display (masked by default, tap to reveal)

**About Threshold:**

- Version number
- "This is general information, not legal advice" disclaimer
- Link to crisis resources (always accessible)
- Open source licenses

---

## 6. Interaction Patterns

### 6.1 Message Streaming

The backend streams responses via WebSocket using LangGraph's `stream_mode="messages"`. The frontend renders tokens as they arrive:

1. When a new agent message begins, create a new message container with the Threshold avatar and sage left border
2. Append each token to the message container as it arrives
3. Apply markdown rendering incrementally (a lightweight approach: render markdown on each sentence completion, detected by `.` `!` `?` followed by a space or newline)
4. When the stream ends, finalize the full markdown rendering
5. Auto-scroll to the bottom of the chat as new content appears, unless the user has manually scrolled up (respect their scroll position)

### 6.2 Tool Execution Feedback

When the backend calls a tool, the WebSocket emits a structured event before the tool runs and after it completes. The frontend uses these events to render inline tool cards:

**Lifecycle:**

```
Backend emits: { type: "tool_start", tool: "search_jobs", args: { location: "Hartford, CT" } }
  → Frontend renders: Inline card with "Searching for jobs in Hartford, CT..." and animated progress

Backend emits: { type: "tool_end", tool: "search_jobs", result_summary: "Found 3 listings" }
  → Frontend collapses card to: "✓ Found 3 job listings"

Backend continues streaming the agent's response that references the tool results.
```

For tools that take >3 seconds, the card shows an animated progress bar. For tools that complete in <1 second, the card appears briefly (minimum 600ms display time) so the user sees that work happened — instant tool completion feels like the agent didn't do anything.

### 6.3 Subagent Delegation Feedback

When the orchestrator delegates to a subagent (employment or housing), the user sees a slightly different treatment:

```
┌─ Working on it ─────────────────────┐
│                                      │
│  💼 Employment specialist            │
│  Searching for jobs, checking        │
│  ban-the-box status, matching        │
│  your profile...                     │
│                                      │
│  This might take a moment.           │
│                                      │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │ ← indeterminate progress
│                                      │
└──────────────────────────────────────┘
```

This card persists until the subagent returns its result. The phrasing "This might take a moment" sets realistic expectations — subagent tasks can take 15-30 seconds.

### 6.4 Optimistic UI Updates

When the user performs a direct action (logging a check-in, editing a goal, saving a preference), the UI updates immediately before the backend confirms. If the backend call fails, the UI rolls back and shows a toast: "Couldn't save that. Please try again."

### 6.5 Offline Behavior

The PWA has a service worker that caches:

- The application shell (HTML, CSS, JS, fonts)
- The user's profile summary (decrypted in-memory, not in IndexedDB)
- The most recent 10 documents
- The most recent 20 chat messages

When offline:

- The Home tab renders with cached data (greeting, upcoming items from last sync, recent wins)
- The Chat tab shows a banner: "You're offline. Messages will be sent when you reconnect." The input is disabled.
- The Docs tab shows cached documents (read-only)
- The Plan tab shows cached goals and check-in log (read-only)
- Any actions queued offline (check-in logs, goal edits) are sent when connectivity returns

### 6.6 Notifications and Reminders

If the user has enabled reminders and the app has notification permission:

- Supervision check-in reminders: 24 hours before, and 2 hours before
- Weekly reflection available: Sunday evening
- Proactive check-in from the agent (if configured for daily/weekly)

Notifications are local-only (no push server). They use the Web Notification API with a service worker. The notification body is never sensitive: "You have a check-in tomorrow" not "Parole check-in at Hartford PO."

---

## 7. Crisis Mode

Crisis mode is not a feature — it is a safety system. It activates when the backend's `crisis_response()` tool is triggered. The frontend must treat this as a top-priority event that overrides all other UI behavior.

### 7.1 Activation

The backend emits a special event via WebSocket:

```json
{ "type": "crisis_response", "content": "..." }
```

The frontend immediately enters crisis mode.

### 7.2 Visual Transformation

When crisis mode activates, the entire UI transforms:

1. **Background shifts** from `sand-50` to `calm-bg` (#F5F0EB) — a softer, warmer tone
2. **All non-essential UI elements fade to 40% opacity** — tab bar, suggested prompts, quick actions
3. **The crisis response renders as a full-width, non-dismissable card** at the top of the chat:

```
┌──────────────────────────────────────┐
│                                      │
│  I hear you, and I'm glad you're     │ ← text-lg, calm-text
│  reaching out.                       │
│                                      │
│  Please contact one of these         │
│  right now:                          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📞  988 Suicide & Crisis     │  │ ← tappable card, opens
│  │      Lifeline                  │  │   phone dialer with 988
│  │      Call or text 988          │  │
│  │      Free · 24/7              │  │
│  │                  [Call Now]    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  💬  Crisis Text Line         │  │ ← tappable, opens SMS
│  │      Text HOME to 741741      │  │   with pre-filled number
│  │                  [Text Now]   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │  📞  SAMHSA Helpline          │  │
│  │      1-800-662-4357           │  │
│  │      Mental health +          │  │
│  │      substance use            │  │
│  │                  [Call Now]    │  │
│  └────────────────────────────────┘  │
│                                      │
│  You don't have to be in immediate   │
│  danger to call. They're there for   │
│  any moment that feels too heavy     │
│  to carry alone.                     │
│                                      │
└──────────────────────────────────────┘
```

4. **The chat input remains active** — the user can continue talking. But the crisis card stays pinned at the top of the viewport until the user explicitly dismisses it (via a small "I'm okay for now" text link at the bottom of the card, which requires a deliberate tap).

5. **Phone numbers are rendered as large, tappable buttons** — not as inline text. Each one opens the native dialer/SMS app with the number pre-filled.

### 7.3 Exiting Crisis Mode

Crisis mode ends when:

- The user taps "I'm okay for now" on the crisis card
- The user sends a new message (the crisis card collapses but remains in the chat history)
- 10 minutes pass without interaction (the visual transformation fades back, but the crisis card remains in history)

When exiting, the UI transitions back to normal over 800ms (slow, gentle) — no snapping.

### 7.4 Crisis Mode is Never Lost

Even after exiting crisis mode, the crisis response card remains in the chat history as a permanent record. It is visually distinct (sky-blue border) so the user can always scroll back and find the helpline numbers.

---

## 8. Accessibility

### 8.1 Standards

WCAG 2.1 Level AA minimum. This is non-negotiable. Many users may be accessing the app on low-quality screens, in poor lighting, or with visual impairments.

### 8.2 Specific Requirements

**Color contrast:**

- All text meets 4.5:1 contrast ratio against its background (AA standard)
- Large text (24px+) meets 3:1 ratio
- The warm palette has been selected with contrast ratios pre-validated:
  - `bark-800` on `sand-50`: 10.2:1 (passes AAA)
  - `clay-500` on `sand-50`: 3.8:1 (passes AA for large text; buttons use white text on clay)
  - White on `clay-500`: 4.1:1 (passes AA)

**Touch targets:**

- Minimum 48x48px for all interactive elements
- Minimum 8px gap between adjacent touch targets
- Bottom tab bar icons: 56x56px active area

**Screen reader support:**

- All images have alt text (the Threshold logo: "Threshold — re-entry assistant")
- Chat messages are announced as they stream in (using `aria-live="polite"` on the chat container)
- Crisis mode triggers `aria-live="assertive"` to immediately announce crisis resources
- Tool execution cards have `role="status"` and announce their completion
- Navigation uses `role="navigation"` with `aria-label`
- All form inputs have visible labels (not just placeholders)

**Keyboard navigation:**

- Full keyboard navigation for desktop users
- Visible focus indicators (3px `clay-500` ring, 2px offset)
- `Enter` sends messages, `Shift+Enter` for newlines
- `Escape` closes modals and bottom sheets
- Tab order follows visual order

**Reduced motion:**

- Respects `prefers-reduced-motion: reduce`
- When active: all transitions become instant opacity changes (no sliding, scaling, or position animation)
- Loading indicators use static "..." instead of animated dots

**Text scaling:**

- All text uses `rem` units
- Layout does not break up to 200% text scaling
- No fixed-height containers that would clip scaled text

### 8.3 Language

- Reading level: 6th grade (Flesch-Kincaid)
- No jargon: "benefits" not "entitlements," "check-in" not "supervisory compliance meeting"
- Error messages are specific and actionable: "Couldn't connect to the internet. Check your Wi-Fi or data." not "Network error."
- All timestamps are relative where possible: "2 days ago" not "2026-03-26T14:32:00Z"

---

## 9. Technical Architecture

### 9.1 Stack

| Layer     | Technology                  | Rationale                                               |
| --------- | --------------------------- | ------------------------------------------------------- |
| Framework | React 19 + TypeScript       | Component model, ecosystem, team familiarity            |
| Build     | Vite 6                      | Fast builds, good PWA plugin support                    |
| Styling   | TailwindCSS 4               | Utility-first, custom theme support, small bundle       |
| Animation | Framer Motion               | Declarative, respects reduced-motion, layout animations |
| State     | Zustand                     | Minimal, no boilerplate, good for small-medium apps     |
| Routing   | React Router 7              | File-based routing, nested layouts                      |
| Markdown  | react-markdown + remark-gfm | Chat message rendering                                  |
| PWA       | vite-plugin-pwa             | Service worker generation, caching strategies           |
| WebSocket | Native WebSocket API        | No library needed; reconnection logic is custom         |
| Icons     | Lucide React                | Consistent, tree-shakeable, rounded style               |

### 9.2 Project Structure

```
frontend/
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # App icons (192, 512)
│   └── offline.html               # Offline fallback
├── src/
│   ├── main.tsx                   # App entry
│   ├── App.tsx                    # Router + layout
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TabBar.tsx         # Bottom navigation
│   │   │   ├── TopBar.tsx         # Header with avatar
│   │   │   └── PageShell.tsx      # Shared page wrapper
│   │   ├── chat/
│   │   │   ├── ChatView.tsx       # Full chat page
│   │   │   ├── MessageList.tsx    # Scrollable message container
│   │   │   ├── UserMessage.tsx    # User bubble
│   │   │   ├── AgentMessage.tsx   # Threshold response
│   │   │   ├── ToolCard.tsx       # Inline tool execution card
│   │   │   ├── DocumentCard.tsx   # Inline document preview
│   │   │   ├── EligibilityCard.tsx# Benefits result card
│   │   │   ├── JobCard.tsx        # Job listing result
│   │   │   ├── HousingCard.tsx    # Housing listing result
│   │   │   ├── CrisisBlock.tsx    # Crisis response block
│   │   │   ├── MessageInput.tsx   # Input bar + send button
│   │   │   └── SuggestedPrompts.tsx
│   │   ├── home/
│   │   │   ├── HomeView.tsx
│   │   │   ├── GreetingBanner.tsx
│   │   │   ├── UpcomingItems.tsx
│   │   │   ├── QuickActions.tsx
│   │   │   └── RecentWins.tsx
│   │   ├── docs/
│   │   │   ├── DocsListView.tsx
│   │   │   └── DocDetailView.tsx
│   │   ├── plan/
│   │   │   ├── PlanView.tsx
│   │   │   ├── GoalsSection.tsx
│   │   │   ├── SupervisionTracker.tsx
│   │   │   ├── CheckInSheet.tsx   # Bottom sheet for logging
│   │   │   ├── MilestoneTimeline.tsx
│   │   │   └── WeeklyReflection.tsx
│   │   ├── interview/
│   │   │   ├── InterviewFlow.tsx  # Full interview container
│   │   │   ├── QuestionCard.tsx   # Single question display
│   │   │   ├── SelectOption.tsx   # Tappable option card
│   │   │   ├── FreeTextInput.tsx  # Open-ended question input
│   │   │   ├── PhaseInterstitial.tsx
│   │   │   └── ProfileReview.tsx
│   │   ├── settings/
│   │   │   ├── SettingsView.tsx
│   │   │   ├── ProfileEditor.tsx
│   │   │   ├── PreferencesEditor.tsx
│   │   │   └── PrivacySection.tsx
│   │   └── shared/
│   │       ├── Card.tsx
│   │       ├── Button.tsx
│   │       ├── Toast.tsx
│   │       ├── BottomSheet.tsx
│   │       ├── EmptyState.tsx
│   │       ├── PrivacyBadge.tsx
│   │       └── CrisisOverlay.tsx  # Global crisis mode wrapper
│   ├── hooks/
│   │   ├── useWebSocket.ts        # WebSocket connection + reconnection
│   │   ├── useChat.ts             # Chat state management
│   │   ├── useCrisisMode.ts       # Crisis mode state
│   │   ├── useProfile.ts          # Profile data access
│   │   ├── useDocuments.ts        # Document list
│   │   ├── useSupervision.ts      # Supervision tracker data
│   │   └── useOffline.ts          # Offline detection + queue
│   ├── stores/
│   │   ├── chatStore.ts           # Zustand: messages, streaming state
│   │   ├── profileStore.ts        # Zustand: user profile cache
│   │   ├── uiStore.ts             # Zustand: crisis mode, active tab
│   │   └── offlineStore.ts        # Zustand: offline queue
│   ├── services/
│   │   ├── api.ts                 # REST API client
│   │   ├── websocket.ts           # WebSocket client with reconnection
│   │   └── notifications.ts       # Local notification scheduling
│   ├── types/
│   │   ├── message.ts             # Chat message types
│   │   ├── profile.ts             # UserProfile mirror of backend
│   │   ├── tools.ts               # Tool execution event types
│   │   └── documents.ts           # Document types
│   ├── utils/
│   │   ├── formatters.ts          # Date formatting, relative time
│   │   ├── markdown.ts            # Markdown rendering config
│   │   └── crypto.ts              # Client-side decryption helpers
│   └── styles/
│       ├── theme.css              # Tailwind theme extensions
│       └── crisis.css             # Crisis mode overrides
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### 9.3 State Management

**Zustand stores** (lightweight, no Redux boilerplate):

**`chatStore`:**

```typescript
interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  activeToolCall: ToolExecution | null;
  suggestedPrompts: string[];
  sendMessage: (text: string) => void;
  appendToken: (token: string) => void;
  addToolExecution: (tool: ToolExecution) => void;
  completeToolExecution: (toolId: string, summary: string) => void;
  setCrisisResponse: (content: string) => void;
}
```

**`profileStore`:**

```typescript
interface ProfileState {
  profile: UserProfile | null;
  isLoaded: boolean;
  loadProfile: () => Promise<void>;
  updateField: (path: string, value: string) => Promise<void>;
}
```

**`uiStore`:**

```typescript
interface UIState {
  isCrisisMode: boolean;
  activeTab: "home" | "chat" | "docs" | "plan";
  enterCrisisMode: () => void;
  exitCrisisMode: () => void;
  setActiveTab: (tab: string) => void;
}
```

### 9.4 WebSocket Connection

The WebSocket connects to the Python backend at `ws://localhost:8000/ws`. It handles:

1. **Outgoing messages:** `{ type: "user_message", content: "..." }`
2. **Incoming streams:** Token-by-token agent responses
3. **Tool events:** `tool_start` and `tool_end` events for inline cards
4. **Crisis events:** `crisis_response` events that trigger crisis mode
5. **Reconnection:** Exponential backoff (1s, 2s, 4s, 8s, max 30s) with user-visible status: "Reconnecting..."

### 9.5 Backend API Surface

The Python backend needs to expose a thin HTTP + WebSocket layer. This is new work not covered in the backend spec and should be implemented as a FastAPI server wrapping the existing LangGraph orchestrator.

```
backend/
└── server.py                      # FastAPI + WebSocket server
```

**FastAPI server responsibilities:**

- Serve the frontend static files in production
- Expose WebSocket endpoint for chat streaming
- Expose REST endpoints for profile, documents, supervision data
- Bridge between the WebSocket and the LangGraph graph's `stream()` method

---

## 10. API Contract with Backend

### 10.1 REST Endpoints

The backend must expose these REST endpoints for the frontend. All endpoints are local-only (bound to `127.0.0.1`).

| Method   | Path                           | Description                  | Request                          | Response                    |
| -------- | ------------------------------ | ---------------------------- | -------------------------------- | --------------------------- |
| `GET`    | `/api/profile`                 | Load user profile            | —                                | `UserProfile` JSON          |
| `PATCH`  | `/api/profile`                 | Update profile field         | `{ field_path, value }`          | `{ ok: true }`              |
| `GET`    | `/api/profile/exists`          | Check if profile exists      | —                                | `{ exists: boolean }`       |
| `GET`    | `/api/documents`               | List all documents           | `?type=cover_letter`             | `Document[]`                |
| `GET`    | `/api/documents/:id`           | Get document content         | —                                | `Document` with full text   |
| `DELETE` | `/api/documents/:id`           | Delete a document            | —                                | `{ ok: true }`              |
| `GET`    | `/api/supervision`             | Get supervision data         | —                                | `{ conditions, check_ins }` |
| `POST`   | `/api/supervision/check-in`    | Log a check-in               | `{ date, type, outcome, notes }` | `{ ok: true }`              |
| `GET`    | `/api/supervision/upcoming`    | Get upcoming requirements    | `?days=7`                        | `Requirement[]`             |
| `GET`    | `/api/observations/milestones` | Get recent milestones        | `?limit=10`                      | `Observation[]`             |
| `GET`    | `/api/reflections/latest`      | Get latest reflection        | —                                | `Reflection`                |
| `POST`   | `/api/reflections/trigger`     | Trigger reflection synthesis | —                                | `Reflection`                |
| `POST`   | `/api/export`                  | Export all user data         | —                                | `.zip` file download        |
| `DELETE` | `/api/data`                    | Delete all user data         | `{ confirm: "DELETE" }`          | `{ ok: true }`              |

### 10.2 WebSocket Protocol

**Endpoint:** `ws://localhost:8000/ws`

**Client → Server:**

```typescript
// Send a chat message
{ type: "user_message", content: string }

// Send interview response
{ type: "interview_response", content: string, phase: number }

// Request interview start
{ type: "start_interview" }
```

**Server → Client:**

```typescript
// Token-by-token streaming
{ type: "token", content: string }

// Message complete
{ type: "message_complete" }

// Tool execution started
{
  type: "tool_start",
  tool_id: string,
  tool_name: string,
  display_label: string,
  args: Record<string, unknown>
}

// Tool execution completed
{
  type: "tool_end",
  tool_id: string,
  tool_name: string,
  result_summary: string
}

// Crisis response triggered
{
  type: "crisis_response",
  content: string
}

// Subagent delegation started
{
  type: "subagent_start",
  subagent: "employment" | "housing",
  task_description: string
}

// Subagent completed
{
  type: "subagent_end",
  subagent: string,
  result_summary: string
}

// Document generated
{
  type: "document_created",
  document: {
    id: string,
    type: string,
    title: string,
    preview: string,
    path: string
  }
}

// Interview phase events
{ type: "interview_phase", phase: number, phase_name: string }
{ type: "interview_complete", profile_summary: object }

// Error
{ type: "error", message: string }
```

### 10.3 Data Models (TypeScript Mirrors)

The frontend TypeScript types must mirror the backend Pydantic models:

```typescript
interface UserProfile {
  user_id: string;
  created_at: string;
  last_updated: string;
  personal: {
    name?: string;
    age_range: string;
    gender_identity?: string;
    home_state: string;
    release_date: string;
    time_served: string;
    offense_category:
      | "non-violent"
      | "violent"
      | "drug"
      | "financial"
      | "other";
    comfort_with_technology: string;
  };
  situation: {
    housing_status: "housed" | "shelter" | "couch_surfing" | "unhoused";
    employment_status: string;
    benefits_enrolled: string[];
    supervision_type: "none" | "probation" | "parole" | "supervised_release";
    supervision_end_date?: string;
    immediate_needs: string[];
  };
  goals: {
    short_term_goals: string[];
    long_term_goals: string[];
    values: string[];
    strengths: string[];
    concerns: string[];
  };
  support: {
    has_case_worker: boolean;
    case_worker_name?: string;
    support_contacts: string[];
    trusted_people: string[];
  };
  preferences: {
    communication_style: "direct" | "gentle" | "informational";
    check_in_frequency: "daily" | "weekly" | "as_needed";
    wants_reminders: boolean;
    privacy_level: "high" | "medium" | "low";
  };
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  tool_executions?: ToolExecution[];
  document_preview?: DocumentPreview;
  is_crisis_response?: boolean;
}

interface ToolExecution {
  id: string;
  tool_name: string;
  display_label: string;
  status: "running" | "completed" | "error";
  result_summary?: string;
}

interface Document {
  id: string;
  type: "cover_letter" | "resume" | "housing_letter" | "legal_letter";
  title: string;
  content: string;
  created_at: string;
  word_count: number;
  path: string;
}
```

---

## 11. Hackathon Build Order

Given the 24-hour hackathon constraint and the backend being built in parallel, here is the frontend build sequence. Aim for a working demo in 12 hours, polish in the remaining 12.

### Phase 1: Foundation (Hours 0-3)

1. Scaffold the Vite + React + TypeScript project
2. Configure TailwindCSS with the custom color palette and type scale
3. Build the component shell: `TabBar`, `TopBar`, `PageShell`, `Card`, `Button`
4. Set up React Router with the 4 main routes + settings
5. Create the Zustand stores (empty, with type definitions)

**Exit criteria:** App runs, shows tab bar, navigates between empty pages.

### Phase 2: Chat Core (Hours 3-7)

1. Implement `useWebSocket` hook with reconnection
2. Build `MessageInput` with auto-expand and send button
3. Build `MessageList` with auto-scroll
4. Build `UserMessage` and `AgentMessage` components
5. Build `ToolCard` component (static mock first)
6. Implement `chatStore` with message streaming
7. Wire up WebSocket to chat store
8. Implement markdown rendering in agent messages

**Exit criteria:** Can send messages and see streamed responses from backend. Tool execution cards appear inline.

### Phase 3: Interview Flow (Hours 7-9)

1. Build `InterviewFlow` container
2. Build `QuestionCard` with the three question types (single-select, free-text, multi-select)
3. Build `PhaseInterstitial` transition screens
4. Build `ProfileReview` summary at the end
5. Wire up interview WebSocket events

**Exit criteria:** Full intake interview works end-to-end, producing a profile.

### Phase 4: Home + Plan (Hours 9-11)

1. Build `HomeView` with greeting banner, upcoming items, quick actions
2. Build `PlanView` with goals, supervision tracker, milestones
3. Build `CheckInSheet` bottom sheet for logging check-ins
4. Wire up REST endpoints for profile, supervision, observations

**Exit criteria:** Home shows personalized greeting and upcoming items. Plan shows goals and supervision data.

### Phase 5: Documents + Crisis (Hours 11-13)

1. Build `DocsListView` and `DocDetailView`
2. Build `DocumentCard` (inline chat preview)
3. Implement copy-to-clipboard and export
4. Build `CrisisBlock` and `CrisisOverlay`
5. Implement crisis mode state and visual transformation
6. Test crisis flow end-to-end

**Exit criteria:** Documents render and can be exported. Crisis mode fully functional.

### Phase 6: Polish (Hours 13-16)

1. Add Framer Motion animations (message enter, page transitions, card press)
2. Implement dark mode
3. Build settings page
4. Add suggested prompts with context logic
5. Implement empty states for all views
6. PWA manifest + service worker + offline fallback
7. Accessibility audit (contrast, screen reader, keyboard nav)
8. Test on mobile viewport (375px)

**Exit criteria:** App is polished, accessible, works offline in basic mode, installable as PWA.

---

## Appendix A: Key Design Decisions and Rationale

| Decision                                   | Rationale                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bottom tab bar (not hamburger menu)        | Users should never have to search for navigation. Tabs are always visible.                                                                                       |
| 4 tabs (not 5+)                            | 4 is the maximum for comfortable thumb reach on mobile. Each tab represents a distinct user intent.                                                              |
| No sidebar chat widget                     | This is a full application, not a support feature bolted onto something else. The conversation deserves full screen real estate.                                 |
| Earth-tone palette (not blue/white)        | Blue/white reads as "corporate," "institutional," or "medical." These users have been in institutional environments. Warm tones communicate safety and humanity. |
| 18px base font (not 16px)                  | Readability over density. Users may be reading on cheap screens, in poor lighting, or have uncorrected vision.                                                   |
| No red anywhere                            | Red means "danger," "violation," "stop." Every interaction with this app should feel safe. Amber handles warnings without the emotional weight.                  |
| Full-screen interview (not scrolling form) | One question at a time reduces cognitive load and anxiety. Scrolling forms signal "this will take forever."                                                      |
| Tool cards (not "typing..." dots)          | Users deserve to know what the AI is actually doing, not just that it's "thinking." Transparency builds trust.                                                   |
| Crisis mode transforms the UI              | A banner can be scrolled past. A modal can be dismissed. A full UI transformation cannot be ignored — and it shouldn't be.                                       |
| "Skip" always visible                      | Nothing is mandatory. Forcing answers violates trauma-informed principles.                                                                                       |
| Local-only notifications                   | No push notification server. No data leaves the device. Privacy is absolute.                                                                                     |
| PWA (not native app)                       | No app store review, no download friction, works on any device with a browser. Critical for users who may not have app store accounts or storage space.          |

## Appendix B: Naming and Copy Guidelines

The frontend should use consistent, human language throughout. Here are the canonical terms:

| Internal/Backend Term      | User-Facing Copy                                             |
| -------------------------- | ------------------------------------------------------------ |
| `orchestrator`             | "Threshold"                                                  |
| `subagent`                 | (invisible to user — just appears as Threshold working)      |
| `crisis_response()`        | (renders as crisis resources, no tool name shown)            |
| `observation_stream`       | (invisible — powers milestones and reflections)              |
| `reflection_engine`        | "Weekly reflection"                                          |
| `supervision_tracker`      | "Your schedule" or "Check-ins"                               |
| `offense_category`         | "Background information" (in settings, collapsed by default) |
| `check_snap_eligibility()` | "Checking SNAP eligibility..."                               |
| `UserProfile`              | "Your profile"                                               |
| `AGENTS.md`                | (invisible — internal memory file)                           |

No internal system names should ever appear in the UI. If a tool name leaks into a chat message (from the LLM), the frontend should strip it: any text matching `@tool`, `read_user_memory()`, `check_*_eligibility()`, etc. should be removed from rendered output.

## Appendix C: Performance Budget

| Metric                         | Target  | Rationale                        |
| ------------------------------ | ------- | -------------------------------- |
| First Contentful Paint         | < 1.5s  | Users on slow phones/connections |
| Time to Interactive            | < 3.0s  | Must be usable quickly           |
| JavaScript bundle (gzipped)    | < 150KB | Budget phones have limited RAM   |
| Total page weight (initial)    | < 500KB | Prepaid data plans are expensive |
| Web font load                  | < 100KB | Inter variable font, single file |
| Lighthouse Performance score   | > 90    | Validates overall performance    |
| Lighthouse Accessibility score | > 95    | Non-negotiable for this audience |

---

_This document is the source of truth for all frontend implementation decisions. When in doubt, refer to Section 1.2 (Design Principles) and Section 1.3 (What This Frontend Must Never Do)._
