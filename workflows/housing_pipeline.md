# Housing Pipeline Workflow

Use this when someone says "I need housing" or "help me find a place to live."
Follow these stages in order. Skip stages that don't apply.

## Stage 0: Check Existing Pipeline

Before starting any housing work, check for existing applications:

1. Call `get_housing_pipeline_status()` to see existing applications
2. Check for **overdue follow-ups** — address these FIRST
3. Check for **upcoming interviews** — help prepare if within 7 days
4. Check for **approaching deadlines** — voucher expiry, application deadlines
5. Only then proceed to new housing searches

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
3. `get_pha_guide(state, city)` — Section 8 / public housing options + waitlist status
4. `get_fair_chance_housing_laws(state)` — their rights with a record

Present results organized by:
- **Immediate options** (shelters, transitional with short waits)
- **Medium-term** (transitional housing, recovery programs)
- **Long-term** (Section 8, public housing, private rental)

Log every promising program with housing type and application URL:
```
log_housing_application(program, "discovered", housing_type="transitional", application_url="...")
```

## Stage 4: Contact & Prepare

For each program the user wants to pursue:

1. Help them call intake — update status:
   `log_housing_application(program, "contacted", contact_name=..., contact_phone=..., follow_up_date=...)`
2. Call `prepare_housing_application(housing_type, state, has_id, has_income, has_ssn_card, on_supervision)`
3. Review the document checklist with the user
4. Identify missing documents and help get them:
   - No ID → `get_id_restoration_guide(state)`
   - No income → `ct_snap_eligibility_check()`, `ct_medicaid_eligibility_check()`
   - No SSN card → provide SSA instructions
5. Update tracker: `log_housing_application(program, "documents_gathering")`
6. When docs are ready, move to Stage 5

## Stage 5: Apply & Track

For each program:

1. Help the user understand how to apply (call, walk in, online)
2. If they need a letter: `read_file("workflows/housing_application_letter.md")`
3. After they apply:
   ```
   log_housing_application(program, "applied",
     contact_name=..., follow_up_date=...,
     documents_submitted="photo_id, ssn_card, income_proof")
   ```
4. Set a follow-up date (usually 1-2 weeks out)
5. Track screening: `log_housing_application(program, "screening")`

**Section 8 specific steps:**
- When waitlisted: log position if known — `notes="Position #23 on waitlist"`
- When voucher issued: IMMEDIATELY set deadline (60-120 day expiry)
  ```
  log_housing_application(program, "voucher_issued",
    deadline="2026-06-15", notes="120-day voucher, must find unit by deadline")
  ```
- Move to unit_search: `log_housing_application(program, "unit_search")`
- Remind: In CT, landlords CANNOT legally refuse Section 8

**Critical: Apply to multiple programs in parallel.** Never rely on one application.
Target at least 3-5 applications.

## Stage 6: Follow Up & Advocate

- `get_housing_pipeline_status()` — show the user their full pipeline
- Update statuses as things change:
  - `log_housing_application(program, "waitlisted", notes="Position #23")`
  - `log_housing_application(program, "interview_scheduled", interview_date="2026-04-15", interview_time="10:00 AM", interview_location="586 Ella T Grasso Blvd")`
- If denied:
  - Capture reason: `log_housing_application(program, "denied", denial_reason="Drug conviction look-back period")`
  - Help draft appeal, suggest legal aid (CT Legal Aid: 1-800-453-3320)
  - File appeal: `log_housing_application(program, "appeal_filed")`
- If approved: celebrate, move to Stage 7

## Stage 7: Lease Review & Move In

When approved:
1. Move to lease review: `log_housing_application(program, "lease_review")`
2. Review lease terms — flag anything unusual
3. Watch for: fees, maintenance responsibilities, guest policies, inspection clauses
4. Document move-in condition (photos)
5. Set up mail forwarding
6. Update address with: PO, benefits, employer, DMV
7. `log_housing_application(program, "moved_in")`
8. `log_event("milestone", "Successfully housed at [program]", ["housing"])`

## Key Principles

- **Speed matters.** Programs fill up. Apply the same day you find them if possible.
- **Parallel applications.** Always have 3+ active applications.
- **Follow up.** Set dates and actually call back. Persistence gets housing.
- **Document everything.** Names, dates, what was said. You'll need it for appeals.
- **Know rights.** Fair chance laws exist. Denials can be appealed within 14 days.
- **Track deadlines.** Voucher expiry is real. Missing a deadline means starting over.
