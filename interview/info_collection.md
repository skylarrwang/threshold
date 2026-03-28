# Threshold — Data Model & Intake Design

## Core Principle

Two-layer architecture: **fixed schema** for anything an agent queries or acts on programmatically, **long-term memory** for anything an agent reads to understand the person better.

> If you'd write a conditional against it → SQL.
> If you'd need a paragraph to explain why it matters → memory.

---

## Intake Pipeline

```
1. Document upload (drag & drop web UI)
   → OCR extracts structured fields → pre-populates schema
   → agent flags what it couldn't read

2. Conversational interview (6 phases)
   → fills remaining schema fields conversationally
   → agent asks targeted follow-up only for fields OCR missed
   → unstructured observations written to long-term memory throughout

3. Profile review
   → structured display of everything captured
   → person confirms, corrects, or skips fields
   → agent surfaces anything still missing that matters

4. Ongoing enrichment
   → gaps fill naturally as the app is used
   → reflection engine synthesizes memory into insights over time
```

### Document Upload — What to Target

The **Conditions of Supervision / Release Agreement** is the highest-value scan. It's the multi-page form signed at release listing every condition. One photograph of this populates most of the supervision schema fields.

The **Discharge Certificate** is consistently present and confirms identity + release date.

Everything else (parole grant letter, court sentencing order, restitution paperwork) is opportunistic — extract what's there, don't require it.

**Pipeline behavior:** scan → extract structured fields → store extracted data → discard image. Don't persist document photos (unnecessary liability for a privacy-first app).

### What OCR Won't Catch

Several critical details live in verbal communication from the PO, not in documents:

- Exact reporting schedule (date, time, office) — conditions form says "report as directed"
- Drug testing logistics (lab, call-in protocol, frequency) — told verbally
- Travel permission process — PO explains at first meeting
- Employment deadline — often a verbal window ("30 days")

The interview agent covers these gaps after OCR runs.

---

## Fixed Schema (SQL)

### Identity
| Field | Type | Notes |
|---|---|---|
| `legal_name` | string | |
| `date_of_birth` | date | |
| `ssn` | string (encrypted) | |
| `current_address` | string | nullable — many won't have one |
| `mailing_address` | string | may differ (shelter, PO box) |
| `phone_number` | string | |
| `gender_identity` | enum | for matching gender-specific programs |
| `state_of_release` | string | drives resource lookups |
| `preferred_language` | string | |

### Documents
| Field | Type | Notes |
|---|---|---|
| `documents_in_hand` | string[] | enum: state_id, birth_cert, ss_card, passport, discharge_papers, conditions_form, court_order |
| `documents_needed` | string[] | same enum |
| `documents_pending` | json[] | `{document, action_taken, expected_date}` |

### Supervision
| Field | Type | Notes |
|---|---|---|
| `supervision_type` | enum | none / probation / parole / supervised_release |
| `supervision_end_date` | date | |
| `po_name` | string | |
| `po_phone` | string | |
| `next_reporting_date` | date | |
| `reporting_frequency` | enum | weekly / biweekly / monthly / as_directed |
| `curfew_start` | time | nullable |
| `curfew_end` | time | nullable — employment agent filters jobs by this |
| `drug_testing_required` | bool | |
| `drug_testing_frequency` | string | nullable |
| `electronic_monitoring` | bool | |
| `geographic_restrictions` | bool | |
| `geographic_restrictions_detail` | string | nullable |
| `no_contact_orders` | bool | |
| `no_contact_orders_detail` | string | nullable |
| `mandatory_treatment` | bool | |
| `mandatory_treatment_detail` | string | nullable — "anger mgmt", "substance abuse program", etc. |
| `restitution_owed` | bool | |
| `restitution_amount` | decimal | nullable |
| `outstanding_fines` | bool | |
| `outstanding_fines_amount` | decimal | nullable |

### Housing
| Field | Type | Notes |
|---|---|---|
| `housing_status` | enum | stable / transitional / shelter / couch_surfing / unhoused |
| `returning_to_housing_with` | enum | family / partner / friend / alone / shelter / unknown |
| `sex_offender_registry` | bool | hard-filters housing search — many programs and landlords exclude |
| `sex_offender_registry_tier` | string | nullable |
| `eviction_history` | bool | affects rental eligibility |
| `accessibility_needs` | bool | |

### Employment & Education
| Field | Type | Notes |
|---|---|---|
| `employment_status` | enum | employed / actively_looking / not_looking / unable_to_work |
| `has_valid_drivers_license` | bool | filters out many suburban/rural jobs if false |
| `has_ged_or_diploma` | bool | gates some training programs and jobs |
| `college_completed` | bool | |
| `certifications` | string[] | e.g. HVAC, CDL, ServSafe, OSHA-10 |
| `trade_skills` | string[] | e.g. welding, carpentry, electrical, cooking |
| `physical_limitations` | bool | |
| `physical_limitations_detail` | string | nullable |
| `felony_category` | enum | non_violent / violent / drug / financial / sex_offense / other — affects ban-the-box, licensing, benefits |

### Health
| Field | Type | Notes |
|---|---|---|
| `chronic_conditions` | string[] | enum: diabetes, hypertension, HIV, hep_c, COPD, other |
| `current_medications` | json[] | `{name, dosage}` — needed from day one, lapse is a crisis trigger |
| `disability_status` | bool | |
| `disability_type` | string | nullable — affects SSI/SSDI eligibility and housing options |
| `mental_health_diagnoses` | string[] | |
| `substance_use_disorder_diagnosis` | bool | affects treatment program eligibility |
| `has_active_medicaid` | bool | |
| `insurance_gap` | bool | coverage lapsed during incarceration — common |

### Benefits
| Field | Type | Notes |
|---|---|---|
| `benefits_enrolled` | string[] | SNAP, SSI, SSDI, TANF, Medicaid, VA, WIC, etc. |
| `benefits_applied_pending` | string[] | |
| `child_support_obligations` | bool | |
| `child_support_amount_monthly` | decimal | nullable |
| `veteran_status` | bool | unlocks VA benefits |

### Preferences & Meta
| Field | Type | Notes |
|---|---|---|
| `communication_style` | enum | direct / gentle / informational |
| `check_in_frequency` | enum | daily / weekly / as_needed |
| `wants_reminders` | bool | |
| `privacy_level` | enum | high / medium / low |
| `comfort_with_technology` | enum | low / medium / high |
| `literacy_concerns` | bool | affects how agent communicates |

---

## Long-Term Memory (Agent Notes)

These live in the observation stream and get synthesized by the reflection engine. Agents read them to understand the person — not to query or filter.

### Personality & Temperament
- How they came across during intake — guarded, open, anxious, flat, optimistic
- Decision-making style — impulsive, deliberate, avoidant
- How they handle frustration or setbacks (mentioned or observed)
- What tone actually lands with them
- Whether they push back or defer, and whether that seems healthy
- Energy level and engagement throughout the conversation

### Attitude & Mindset
- How they talk about their offense — acceptance, denial, shame, growth
- How they talk about supervision — resentful, pragmatic, motivated to comply
- Their theory of what went wrong before and what's different now
- Whether they trust institutions, distrust them, or are ambivalent
- Openness to help-seeking — will they call the PO if confused, or avoid it?

### Family & Relationships
- Who they talked about warmly vs. avoided mentioning
- Family dynamics — who is supportive, who is complicated, who is enabling
- Children — ages, current situation, whether reunification is a goal and how they feel about where things stand
- Romantic relationship status and whether it seems stable or volatile
- Whether they have people who will show up for them, or if they're essentially alone
- Caregiver responsibilities (children, elders) that shape scheduling

### Trauma & History
- What they shared about their background — not a clinical inventory, just what came up
- Prison experiences that are shaping how they're approaching reentry
- Any specific sensitivities or topics they deflected from
- How they responded emotionally to harder questions

### Substance Use Context
- The story around their use — not just what and how much, but the role it played
- What they've tried before and what actually helped
- Whether they have a clear-eyed view of it or seem to be minimizing
- Current relationship to it — confident, nervous, avoiding the topic

### Goals & Motivation
- What they actually lit up about when talking about the future
- What they said they were most afraid of
- What they said they were most proud of
- What "making it" means to them specifically — not just "get a job" but the texture of it
- Short and long-term goals in their own words

### Observations Over Time
- How their mood or engagement changes across sessions
- When they follow through vs. when they go quiet
- What kinds of wins actually matter to them
- Patterns the reflection engine surfaces — the memory layer grows more useful the longer someone uses the app

---

## How the Two Layers Work Together

The fixed schema is what makes the subagents useful from day one — the employment agent knows about the curfew, the benefits agent knows about the disability status, the supervision tracker knows the reporting date. Agents can act without having to ask.

The memory layer is what makes the orchestrator feel like it actually knows the person. Over time, reflections synthesize patterns: "tends to go quiet when things aren't going well — a check-in after missed milestones is more effective than a reminder." That kind of insight can't live in a schema field. It emerges from accumulated observations.

Neither layer replaces the other. The schema drives action. The memory drives understanding.