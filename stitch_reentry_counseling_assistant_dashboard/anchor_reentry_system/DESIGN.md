# Design System Document

## 1. Overview & Creative North Star: "The Guided Path"
This design system is built to move beyond the cold, utilitarian nature of typical administrative dashboards. For a reentry counseling assistant, the interface must act as a "Digital Sanctuary"—an environment that feels authoritative yet deeply empathetic. 

The Creative North Star is **"The Guided Path."** We achieve this through an editorial layout that prioritizes high-contrast typography and expansive "breathing room" (white space). Instead of a rigid, boxed-in grid, we use intentional asymmetry and overlapping "paper" layers to create a sense of movement and progress. By ditching traditional borders for tonal shifts, the UI feels like a continuous journey rather than a series of disconnected forms.

---

## 2. Colors & Surface Philosophy
The palette utilizes deep Navy (`secondary`) for stability, Crisp White (`surface-container-lowest`) for clarity, and Teal (`primary`) for momentum.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. All spatial boundaries must be created through background color shifts. For example, a `surface-container-low` (#f3f3f3) sidebar should sit flush against a `surface` (#f9f9f9) main content area. Contrast is born from tone, not lines.

### Surface Hierarchy & Nesting
Treat the dashboard as a series of physical layers. Use the hierarchy below to "stack" importance:
- **Base Layer:** `surface` (#f9f9f9) — The desk upon which everything sits.
- **Section Layer:** `surface-container-low` (#f3f3f3) — Large organizational zones.
- **Interactive Layer:** `surface-container-lowest` (#ffffff) — The "Paper." Use this for cards and primary content blocks.
- **Elevated Layer:** `surface-container-high` (#e8e8e8) — For subtle callouts or inactive states.

### The "Glass & Gradient" Rule
To inject "soul" into the professional aesthetic:
- **Glassmorphism:** Use for floating navigation bars or modal overlays. Apply `surface-container-lowest` at 80% opacity with a `backdrop-blur` of 12px.
- **Signature Gradients:** For primary CTAs or high-level progress indicators, use a subtle linear gradient transitioning from `primary` (#006565) to `primary_container` (#008080). This provides a premium, "lithographic" depth.

---

### 3. Typography: Editorial Authority
We utilize a dual-typeface system to balance modern efficiency with human-centric warmth.

- **Display & Headlines (Manrope):** Chosen for its geometric precision and friendliness. Use `headline-lg` for dashboard greetings to establish a confident, calm tone.
- **Body & Titles (Inter):** Chosen for its exceptional legibility in dense data scenarios. 
- **The Hierarchy Strategy:** Use aggressive scale differences. A `display-sm` metric (e.g., "94% Completion") next to a `label-md` description creates an editorial "magazine" feel that guides the eye instantly to what matters most.

---

## 4. Elevation & Depth
In this system, depth is a functional tool for focus, not just a stylistic choice.

- **The Layering Principle:** Avoid shadows for static cards. Instead, place a `surface-container-lowest` (pure white) card on a `surface-container-low` background. This "soft lift" is more sophisticated than a drop shadow.
- **Ambient Shadows:** For floating elements (Modals, Popovers), use a custom shadow: `0 8px 32px rgba(26, 28, 28, 0.06)`. Note the use of the `on-surface` color (#1a1c1c) at a very low opacity to mimic natural light.
- **The "Ghost Border" Fallback:** If a boundary is strictly required for accessibility (e.g., input fields), use the `outline-variant` token at **15% opacity**. Never use 100% opaque borders.

---

## 5. Components

### Buttons & Chips
- **Primary Button:** Uses the Teal `primary` token with a `md` (0.75rem) corner radius. On hover, transition to `on-primary-container`.
- **Secondary Button:** No fill. Uses `primary` text with a "Ghost Border."
- **Status Chips:** Use `secondary_fixed` for a calm navy background with `on_secondary_fixed` text. Forbid "Traffic Light" (Red/Yellow/Green) systems; use tonal variants of Teal and Navy to maintain the "Calm" brand pillar.

### Inputs & Forms
- **Fields:** Use `surface-container-lowest` with a subtle `2px` bottom-bar in `outline-variant` rather than a full box. This maintains the "Editorial" look.
- **Success States:** Indicated via a small Teal (`primary`) checkmark, never a green box.

### Cards & Lists
- **Forbid Dividers:** Do not use `<hr>` tags or border-bottoms. Use the Spacing Scale (specifically `8` or `12` / 2rem or 3rem) to separate list items. 
- **Asymmetric Layouts:** Inside cards, avoid centering text. Use left-aligned typography with wide right margins to create an "Open Path" feel.

### Relevant App-Specific Components
- **Progress Steppers:** Use a thick (4px) `primary_fixed` line that fills with `primary` as the user completes counseling milestones.
- **Counselor Notes:** A "Sticky Note" component using `tertiary_fixed` (#ffdbcb) to provide a warm, human contrast to the navy/teal interface.

---

## 6. Do's and Don'ts

### Do
- **Do** use `24` (6rem) padding for page margins. Extreme white space signals premium quality.
- **Do** use `xl` (1.5rem) rounded corners on large parent containers to soften the professional tone.
- **Do** use `title-lg` for data labels to ensure the counselor can read key info at a glance.

### Don't
- **Don't** use pure black (#000000). Use `on_surface` (#1a1c1c) for all "black" text to maintain a softer visual "ink" feel.
- **Don't** use standard "Material Design" shadows. They are too heavy for this "Light & Calm" system.
- **Don't** crowd the dashboard. If a user has more than 5 primary tasks, move the remainder to a "Secondary" `surface-container-low` drawer.

---

## 7. Spacing & Rhythm
This system operates on a base-4 scale but favors large gaps to reduce cognitive load for counselors.
- **Grid Gutter:** `6` (1.5rem).
- **Section Gap:** `12` (3rem).
- **Component Internal Padding:** `4` (1rem) for mobile, `5` (1.25rem) for desktop.