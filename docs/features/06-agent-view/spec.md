# Agent View – Spec

Serve the live page with its saved configuration applied, exactly as an agent should receive it. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, agent output format, configuration format and trust & safety rules.

---

## What & why

**What:** A public address, `agentView?url=<page>`, that returns the page as an agent should receive it: the **live** page with its saved configuration applied.

**Why:** The assignment asks for a configuration "meaningful to a downstream consumer" but doesn't say who that is. We define it: in production, the publisher's server or CDN detects AI agents and serves them the modified page. Agent View is that consumer, minus agent detection. It proves the configuration works **without the editor**, and anyone can test it directly.

## Behavior

1. Fetch the live page, the same way the editor does, and clean it **identically** (otherwise saved targets won't match).
2. Load the configuration for the URL. If none exists, return the clean page unmodified.
3. Match each modification to its element (position + text snippet). Unmatched ones are skipped.
4. Apply: remove hidden elements, insert context notes, fetch and insert forwarded content (fetched live on every request, no caching, one level deep, size limits from the Forward a link spec; failures and over-budget forwards leave the link as is).
5. Return **Markdown** by default, or **semantic HTML** on request.
6. Report which modifications could not be applied, and why (unmatched, over budget, failed), so a stale configuration is detectable.

## Acceptance criteria

- Given a saved configuration, when Agent View is requested for that URL, then hidden content is absent, context notes appear in place, and forwarded content appears after its link.
- Given no configuration, then the clean page is returned.
- Given the same page and configuration, then Agent View's Markdown equals the editor's Markdown view.
- Given a modification whose target no longer matches, then it is skipped and reported, and the rest still apply.
- Given a request for semantic HTML, then the same content is returned as HTML, with the same placement rules as Markdown.
- Given modifications that could not be applied, then the report lists each one with its reason: unmatched, over budget, or failed.
- Given a URL that isn't normalized (e.g. with `utm_*` parameters), then the configuration saved under its normalized form is used.
- Given a page that fails to load, then Agent View returns a plain error stating why, not an empty page.
- Given a forwarded page changed since the configuration was saved, then Agent View returns its current content.

## Production path (not built)

In production, a small layer in front of the publisher's site (server middleware or a CDN edge function):

1. Detects AI agents: by an explicit request for Markdown (`Accept: text/markdown`), falling back to known agent user-agents (e.g. GPTBot, ClaudeBot).
2. Loads the configuration for the requested URL and applies it, exactly like Agent View.
3. Serves Markdown or semantic HTML to agents; humans get the normal page.
4. Can also advertise the Markdown version from the normal page so agents can find it.

Realistically, a publisher only configures their **own** site. Opening any URL in the editor is supported for exploration and demo.

## Out of scope

- **Agent detection and serving** in production (described above, not built).
