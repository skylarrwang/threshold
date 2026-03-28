# Legal Letter Workflow

Use this for formal letters to parole boards, appeals, employers (for reference requests),
or complaints (housing discrimination, benefits denial).

## Steps

1. Identify the letter type and recipient.
2. Call read_user_memory() for relevant context.
3. Select the appropriate tone:
   - Parole board: formal, respectful, specific about rehabilitation and plans
   - Employer reference request: professional, brief, clear ask
   - Discrimination complaint: factual, documented, non-emotional
   - Benefits appeal: factual, reference the specific denial reason, request reconsideration
4. Draft the letter with: date, recipient address block, subject line, body (3 paragraphs max),
   formal close, signature line.
5. Add the disclaimer: "This letter was drafted with the assistance of an AI tool.
   Consider having a legal aid organization review it before sending."
6. Save to data/documents/legal/{type}_{recipient}_{YYYY-MM-DD}.txt
7. Call log_event("milestone", "Drafted {type} letter", ["legal"])
