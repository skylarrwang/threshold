# Resume Workflow

Use this when the user wants to build or update a resume.

## Steps

1. Call read_user_memory() to load the full profile including:
   - Work history and employment status
   - Trade skills and certifications
   - Education (GED, diploma, college)
   - Strengths and goals

2. **Generate a draft immediately** with whatever data exists. Don't block on missing info.

3. Build the resume sections in this order:
   - **Contact**: First name only is fine if they prefer privacy; include phone/email if available
   - **Summary**: 2-3 sentences, strength-focused, forward-looking
   - **Skills & Certifications**: List all certifications, trade skills, and relevant abilities
   - **Experience**: List roles with approximate dates; use "career transition" or "personal development" for gaps — never reference incarceration directly
   - **Education**: GED, diplomas, college, any programs or training completed

4. Keep formatting simple — plain text, easy to copy into any application form.

5. **Show the draft to the user in the chat** so they can see it immediately.

6. **Check for gaps** and ask targeted follow-up questions:
   - If no work history: "I'd love to add some work experience. What jobs have you held? Even informal work counts — landscaping, kitchen work, construction, etc."
   - If no certifications: "Do you have any certifications? Things like forklift, food handler, OSHA, CDL, or anything you earned in a training program?"
   - If no skills listed: "What are you good at? Any trades, tools, or abilities you want to highlight?"

7. After user provides more info, update the resume and show the revised version.

8. Save the final version to data/documents/resume_{YYYY-MM-DD}.txt

9. Call log_event("milestone", "Created resume", ["job_search"])

10. Let the user know: "Your resume is saved and ready. You can find it in your Documents, or I can help you tailor it for a specific job."

## Tone

- Be encouraging, not interrogating
- Frame questions as "I'd love to add..." not "You're missing..."
- Celebrate what they DO have — everyone has transferable skills
