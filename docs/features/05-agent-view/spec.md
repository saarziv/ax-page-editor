# Agent View – Spec

Serve the page to agents with its saved configuration applied, and let the publisher open that exact output from the editor. Part of AX Editor: see the global `spec.md` for the problem, core concepts, agent output format (section 7) and configuration format.

---

## 1. Agent View endpoint

**What:** `GET /agentView?url=<page>` fetches the **live** page, applies its saved configuration and returns the result as Markdown.

**Why:** A configuration only matters if something outside the editor can use it. In production, the publisher's server or CDN would detect agents and serve them this output (D14). Agent View is that consumer without the detection: it proves the saved configuration works on its own, and anyone can try it with `curl`.

**Behavior**

- Same fetch, cleaning and modification logic as the editor, so the output matches what the preview shows for the saved configuration: hidden elements are gone, and context notes appear in place as `> **Context:** <note>` (global spec section 7).
- No saved configuration: returns the clean page as Markdown.
- A modification whose element can't be found with confidence is skipped. The rest still apply.
- The URL is normalized first, so `?utm_source=x` finds the configuration saved for the clean URL.
- The page fails to load: returns an error status with the plain-language reason, never an empty page.
- Opened in a browser, the Markdown shows as readable text, not as a file download.
- The README explains the endpoint: what it returns, why we built it, and a `curl` example.

**Acceptance criteria**

- **AC1** Given a saved configuration, when `/agentView?url=` is requested, then the response is Markdown with the hidden elements' text absent and context notes in the same place the preview shows them.
- **AC2** Given a context note like `# hi [x](y)`, then it appears in the Markdown as those literal characters.
- **AC3** Given no saved configuration, then the clean page is returned as Markdown.
- **AC4** Given a modification that no longer matches its element, then it is skipped and the others still apply.
- **AC5** Given a URL with `utm_*` parameters, then the configuration saved under its normalized URL is used.
- **AC6** Given a page that fails to load, then the endpoint returns an error status with the plain-language reason.
- **AC7** Given the endpoint is opened in a browser tab, then the Markdown is shown as text in the tab.
- **AC8** The README has an Agent View section: what it returns, why it exists, and a `curl` example.

## 2. View as agent button

**What:** A **View as agent ↗** button in the editor's top bar, next to Save. Clicking it opens Agent View for the current page in a new tab.

**Why:** The publisher sees exactly what an agent gets, the same way an agent gets it, from the real endpoint. There's no second view inside the editor to build or keep in sync.

**Behavior**

- Agent View only knows the **saved** configuration, so the button is disabled while there are unsaved changes. Otherwise a publisher would open the tab and not see their latest edits.
- Tooltip when enabled: "Opens what an AI agent gets for this page, in a new tab."
- Tooltip when disabled: "Save to see your latest changes as an agent."
- A page with no changes and nothing saved can still be viewed: it shows the clean page.

**Acceptance criteria**

- **AC9** Given the editor is open with no unsaved changes, when the user clicks View as agent, then a new tab opens on `/agentView?url=<page>` and shows the page's Markdown.
- **AC10** Given unsaved changes, then the button is disabled and its tooltip says "Save to see your latest changes as an agent."; after saving, it's enabled again.
- **AC11** Given the button is enabled, when the user hovers it, then the tooltip says "Opens what an AI agent gets for this page, in a new tab."

## Out of scope

- Forwarded content in Agent View: 06.
- Semantic HTML output, and reporting skipped modifications in the response.
- Seeing unsaved changes as Markdown inside the editor.
- Agent detection and serving in production (D14).
