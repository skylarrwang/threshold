# Housing Pipeline Workflow

Use this when someone says "I need housing" or "help me find a place to live."
Follow these stages in order. Skip stages that don't apply.

## Stage 1: Assess Urgency

**Do they need a bed tonight?**

- If YES → call `find_emergency_shelter(location)` immediately
- Tell them to call **211** (real-time bed availability) and **CAN: 1-888-774-2900** (if CT)
- Then continue to Stage 2 in parallel — emergency shelter is temporary

**If they're in a shelter or couch surfing:**
- Not an emergency, but time-sensitive. Move to Stage 2.

**If they're housed but need better housing:**
- Move directly to Stage 2.

## Stage 2: Understand Their Situation

Call `read_user_memory()` to get:
- Location (city, state, ZIP)
- Offense category (needed for filtering)
- Housing status (shelter, couch surfing, etc.)
- Income status (employed, benefits, none)
- Whether they have ID, SSN card
- Whether they're on supervision

Ask for anything missing. You need location and offense category at minimum.

## Stage 3: Search for Housing Options

Run these searches (use offense_category from profile to auto-filter):

1. `find_reentry_housing(state, city, offense_category=...)` — curated reentry programs
2. `search_housing(location, offense_category=...)` — HUD counseling + 211
3. `get_pha_guide(state, city)` — Section 8 / public housing options
4. `get_fair_chance_housing_laws(state)` — their rights with a record

Present results organized by:
- **Immediate options** (shelters, transitional with short waits)
- **Medium-term** (transitional housing, recovery programs)
- **Long-term** (Section 8, public housing, private rental)

Log every promising program:
```
log_housing_application(program, "discovered", notes="Found via reentry DB")
```

## Stage 4: Prepare Applications

For each program the user wants to pursue:

1. Call `prepare_housing_application(housing_type, state, has_id, has_income, has_ssn_card, on_supervision)`
2. Review the document checklist with the user
3. Identify missing documents and help get them:
   - No ID → `get_id_restoration_guide(state)`
   - No income → `check_snap_eligibility()`, `check_medicaid_eligibility()`
   - No SSN card → provide SSA instructions
4. Update tracker: `log_housing_application(program, "documents_ready")`

## Stage 5: Apply

For each program:

1. Help the user understand how to apply (call, walk in, online)
2. If they need a letter: `read_file("workflows/housing_application_letter.md")`
3. After they apply: `log_housing_application(program, "applied", contact_name=..., follow_up_date=...)`
4. Set a follow-up date (usually 1-2 weeks out)

**Critical: Apply to multiple programs in parallel.** Never rely on one application.
Target at least 3-5 applications.

## Stage 6: Track & Follow Up

- `get_housing_pipeline_status()` — show the user their full pipeline
- Update statuses as things change:
  - `log_housing_application(program, "waitlisted", notes="Position #23")`
  - `log_housing_application(program, "interview_scheduled", follow_up_date="2026-04-15")`
- If denied: help draft appeal, suggest legal aid, move to next option
- If approved: celebrate, help review lease, prepare for move-in

## Stage 7: Move In

When approved:
1. Review lease terms — flag anything unusual
2. Document move-in condition (photos)
3. Set up mail forwarding
4. Update address with: PO, benefits, employer, DMV
5. `log_housing_application(program, "moved_in")`
6. `log_event("milestone", "Successfully housed at [program]", ["housing"])`

## Key Principles

- **Speed matters.** Programs fill up. Apply the same day you find them if possible.
- **Parallel applications.** Always have 3+ active applications.
- **Follow up.** Set dates and actually call back. Persistence gets housing.
- **Document everything.** Names, dates, what was said. You'll need it for appeals.
- **Know rights.** Fair chance laws exist. Denials can be appealed.
