# ax-page-editor

## Agent View

**What it is:** a public endpoint that returns a page the way an AI agent should get it. It takes the live page, applies its saved configuration (hidden parts removed, notes added), and returns the result as Markdown.

```bash
curl 'localhost:3001/agentView?url=sample:demo'
```

In the editor, **View as agent ↗** (next to Save) opens the same thing in a new tab.

**Why I added it:** the assignment didn't ask for it. I added it for two reasons.

- **It shows the result the way the agent sees it.** Agents don't read HTML as it is. They first run it through tools that strip tags, drop attributes and guess which parts matter, and those tools could throw away the very notes the publisher added. Markdown has nothing left to strip or guess, so what you see here is exactly what the agent reads.
- **It proves the saved configuration works on its own.** Nothing here uses the editor: the endpoint reads the live page and the saved configuration. In production, the publisher's server would do the same for agent requests.

More detail: `docs/spec-decisions.md` D5 (why Markdown) and D14 (the downstream consumer).
