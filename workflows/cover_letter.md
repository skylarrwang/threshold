# Cover Letter Workflow

Use this when the user wants a cover letter for a specific job.

## Steps

1. Get the job details. If not already provided, ask:
   - "What's the job title and company?"
   - "Do you have the job posting or can you describe what they're looking for?"

2. Call read_user_memory() to load their profile:
   - Skills and certifications
   - Work history
   - Strengths
   - Any relevant background

3. **Generate a draft immediately** with whatever data exists.

4. Match their background to the job:
   - Identify 2-3 strengths/skills that fit the job requirements
   - Look for certifications that are relevant
   - Find any experience (formal or informal) that applies

5. Draft the letter:
   - **Opening**: Specific hook about this role or company (not generic "I am writing to apply...")
   - **Middle**: 2-3 concrete examples from their background matching the job
   - **Close**: Forward-looking, confident, brief

6. Keep it under 350 words. Plain language. No buzzwords.

7. **Show the draft to the user in the chat** immediately.

8. **Check for gaps** and ask if needed:
   - "Is there anything specific about this company that drew you to them? I can make the opening more personal."
   - "Any particular experiences you want me to highlight more?"

9. If they have a conviction history and the employer isn't ban-the-box:
   - Add ONE brief, confident, forward-facing sentence if appropriate
   - Do NOT over-explain or apologize
   - Example: "I bring the focus and discipline that comes from overcoming personal challenges."

10. After any revisions, save to data/documents/cover_letters/{company}_{YYYY-MM-DD}.txt

11. Call log_event("milestone", "Drafted cover letter for {company}", ["job_search"])

12. Let them know: "Your cover letter is saved. Want me to help you apply, or would you like any changes?"

## Tone

- Confident but not arrogant
- Specific to THIS job, not generic
- Plain language — no corporate jargon
- Brief — hiring managers skim
