# Resume Workflow

Use this when the user wants to build or update a resume.

## Steps

1. Call read_user_memory() to load work history, strengths, goals, and education.
2. Ask if there are any specific jobs or industries they're targeting.
3. Build the resume sections in this order:
   - Contact: first name only is fine if they prefer privacy; include email if they have one
   - Summary: 2-3 sentences, strength-focused, forward-looking
   - Experience: list roles with approximate dates; use "gap year" or "personal time" for
     incarceration periods — never reference incarceration in a resume
   - Skills: include both hard skills (tools, trades) and soft skills (reliability, teamwork)
   - Education and Certifications: include any programs completed during incarceration
4. Keep formatting simple — plain text, easy to copy into any application form.
5. Save to data/documents/resume_{YYYY-MM-DD}.txt
6. Call log_event("milestone", "Created resume", ["job_search"])
