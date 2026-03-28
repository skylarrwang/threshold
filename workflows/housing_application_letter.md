# Housing Application Letter Workflow

Use this when the user needs a letter for a housing application or program.

## Steps

1. Ask which program or landlord the letter is for.
2. Call read_user_memory() to load their situation and goals.
3. Draft a persuasive letter tailored to the program type. Emphasize stability, support network, and forward-looking intent. Follow the orchestrator's privacy principle on conviction history.
4. Save to the housing_applications folder with a timestamped filename.
5. Call log_event("milestone", "Drafted housing application letter for {program}", ["housing"])
