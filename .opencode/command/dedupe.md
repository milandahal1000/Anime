---
description: Find duplicate GitHub issues
agent: build
---

$ARGUMENTS

Find up to 3 likely duplicate issues for the given GitHub issue.

To do this, follow these steps precisely:

1. Use an agent to check if the GitHub issue (a) is closed, (b) does not need to be deduped (eg. because it is broad product feedback without a specific solution, or positive feedback), or (c) already has a duplicates comment that you made earlier. If so, do not proceed.
2. Use an agent to view the GitHub issue, and ask the agent to return a summary of the issue.
3. Then, launch 5 parallel agents to search GitHub for duplicates of this issue, using diverse keywords and search approaches, using the summary from step 1.
4. Next, feed the results from steps 1 and 2 into another agent, so that it can filter out false positives that are likely not actually duplicates of the original issue. If there are no duplicates remaining, do not proceed.
5. Finally, report the potential duplicates to the user.

Notes (be sure to tell this to your agents, too):

- Use the `gh` CLI to interact with GitHub, rather than web fetch. Examples:
  - `gh issue view <number>` — view an issue
  - `gh issue view <number> --comments` — view with comments
  - `gh issue list --state open --limit 20` — list issues
  - `gh search issues "<query>" --limit 10` — search for issues
- Do not use other tools beyond `gh` (eg. don't use other MCP servers, file edit, etc.)
- Make a todo list first
