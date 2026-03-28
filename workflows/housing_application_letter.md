# Housing Application Letter Workflow

Use this when the user needs a letter for a housing application or program.

## Steps

1. Ask which program or landlord the letter is for, if not already known.
2. Call read_user_memory() to load their situation, supervision status, and goals.
3. Determine the letter type:
   - Transitional housing program: focus on stability goals, support network, timeline
   - Private landlord: focus on reliability, employment (current or seeking), references
   - Section 8 / public housing: note any documentation requirements
4. Draft the letter:
   - One paragraph: who they are and what they're looking for
   - One paragraph: why they're a good tenant (stability, employment plans, support)
   - One paragraph: forward-looking, specific timeline
5. Do not mention conviction unless the application specifically asks — in that case,
   be factual and brief, then pivot to progress.
6. Save to data/documents/housing_applications/{program}_{YYYY-MM-DD}.txt
7. Call log_event("milestone", "Drafted housing application letter for {program}", ["housing"])
