# Community Resource Search Workflow

Use this when the user asks about support groups, mental health services, NA/AA meetings,
peer support, faith-based programs, or community organizations.

## Steps

1. Call read_user_memory() to get their location and any relevant context (substance use
   history, mental health, family situation) — only use what they've shared.
2. Identify the category they need:
   - Peer support / re-entry organizations
   - Mental health / counseling
   - Substance use recovery (NA, AA, SMART Recovery)
   - Family reunification / parenting support
   - Faith-based community
3. Search for resources in their area. Use web search with: "{category} re-entry {city/state}".
4. Filter results for:
   - Organizations that explicitly serve people with criminal records
   - Free or sliding-scale cost
   - Current operating status (check for recent activity)
5. Present 3-5 options with: name, what they offer, contact info, whether walk-ins are accepted.
6. Call log_event("observation", "Found community resources for {category}", ["community"])
