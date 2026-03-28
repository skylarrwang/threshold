# Cover Letter Workflow

Use this when the user wants a cover letter for a specific job.

## Steps

1. Ask the user for the job posting (title, company, description) if not already provided.
2. Call read_user_memory() to load their profile, strengths, and recent work history.
3. Identify 2-3 of their strengths that match the job requirements.
4. Check if this is a ban-the-box employer (ask if unsure, or note it as a question).
5. Draft the letter:
   - Opening: specific hook about this role or company (not generic)
   - Middle: 2-3 concrete examples from their background matching the job
   - Close: forward-looking, confident, brief
6. Keep it under 350 words. Plain language. No buzzwords.
7. If they have a conviction history and the job type makes disclosure relevant,
   add a brief, confident forward-facing sentence — do not over-explain or apologize.
8. Save to data/documents/cover_letters/{company}_{YYYY-MM-DD}.txt
9. Call log_event("milestone", "Drafted cover letter for {company}", ["job_search"])
10. Show the letter to the user and ask if they want any changes.
