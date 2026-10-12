# Agent View – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Agent View endpoint · Covers: AC1, AC2, AC3, AC4, AC5, AC6, AC7
- [x] T02 – View as agent button · Covers: AC9, AC10, AC11
- [ ] T03 – Agent View in the README · Covers: AC8

---



## T01 – Agent View endpoint

**Goal:** anyone can call `GET /agentView?url=<page>` and get back the live page, with its saved configuration applied, as Markdown an agent can read.

The flow (`plan.md` → How Agent View works):

1. The endpoint fetches and cleans the live page, the same way the editor does.
2. It loads the configuration saved for that page, if any.
3. It applies it with `markModificationsInTree`, the editor's own function.
4. It drops the hidden parts (`prune`) and writes the rest as Markdown (`renderMarkdown`).

Example: with the demo's cookie banner hidden and a note on the chart, the answer has no banner text and has `> **Context:** Customer growth…` right after the chart image.

S1 builds the endpoint and the Markdown writer, with no configuration applied yet. S2 applies the saved configuration.

Not in this task: the View as agent button (T02), the README (T03), and forwarded content (06).

**Implements:** `plan.md` → How Agent View works, `prune`, `renderMarkdown`, `GET /agentView?url=`.

- [x] **S1 – The endpoint returns the clean page as Markdown (AC3, AC6, AC7)**
  Core gets `renderMarkdown`, which writes every kind of node as Markdown and escapes page text. The api gets `GET /agentView?url=` at the root (outside `/api`), which fetches and cleans the page through `PageTreeService` and returns it as Markdown. A browser gets it as plain text so the tab shows it instead of downloading it.
  **Verify:**
  1. With `pnpm dev` running, run `curl -i 'localhost:3001/agentView?url=sample:demo'`. The answer is 200 with `content-type: text/markdown; charset=utf-8`, and the body is the demo page as Markdown: headings with `#`, the chart as `![…](…)`, the pricing table as a Markdown table, the form's fields as `Field: …` (AC3).
  2. Open `http://localhost:3001/agentView?url=sample:demo` in the browser: the tab shows the same Markdown as text, no download (AC7).
  3. Run `curl -i 'localhost:3001/agentView'`: a 400 with `code: "INVALID_URL"` and a message saying why (AC6).
  4. `pnpm test` passes. New tests check `renderMarkdown`:
    - Each kind against its exact Markdown, e.g. a level-2 heading is `## Pricing`, an `ol` list is `1. One\n2. Two`, a link is `[terms](https://acme.com/terms)`.
    - Blocks are separated by one blank line, and inline text and links stay on one line.
    - Page text `# hi [x](y) <b>` comes out escaped, as literal characters.
    - The api answers `text/plain` when `Accept` asks for `text/html`, and `text/markdown` otherwise.

- [x] **S2 – Apply the saved configuration (AC1, AC2, AC4, AC5)**
  Core gets `prune`, and `renderMarkdown` learns to write notes as `> **Context:** …`, including the tricky spots (start of a list or table, inside a cell). The endpoint now loads the saved configuration and runs it through `markModificationsInTree` and `prune` before writing Markdown, so the agent gets exactly what the preview showed.
  **Verify:**
  1. In the editor, open the demo, hide the cookie banner, add the note `Customer growth from 1,200 to 8,500. # hi [x](y)` to the chart, and Save.
  2. Run `curl 'localhost:3001/agentView?url=sample:demo'`: no cookie banner text anywhere, and `> **Context:** Customer growth from 1,200 to 8,500. \# hi \[x\](y)` sits right after the chart image, where the preview shows the note (AC1, AC2).
  3. `sample:` pages have no query string, so use a real page: open `https://example.com`, hide its heading, Save, then run `curl 'localhost:3001/agentView?url=https://example.com/?utm_source=x'`. The heading is gone, because the `utm_` address found the saved configuration (AC5).
  4. `pnpm test` passes. New tests check:
    - `prune`: a hidden element and everything inside it is gone, the input tree is unchanged, and with nothing hidden the output equals the page.
    - Notes: after a leaf, first in a section, at the start of a list (written before the list), inside a cell (`(Context: …)`), and the `(on "terms")` label.
    - The api, on the demo page: with a saved configuration the banner text is absent and the note is present; with none saved the clean page comes back; a modification whose `target.text` no longer matches is skipped while the others still apply (AC4).
  - A note on a list item is written inside that item → `plan.md` §renderMarkdown (tricky parts)

**Done when:** `/agentView?url=` returns the live page as Markdown with its saved configuration applied, shows as text in a browser tab, and explains failures. `pnpm test` and `typecheck` pass.

---



## T02 – View as agent button

**Goal:** the publisher clicks **View as agent ↗** next to Save and a new tab shows exactly what an agent gets for this page, straight from the real `/agentView` endpoint.

The catch is that Agent View only knows the **saved** configuration. So the button is greyed out whenever there are unsaved changes, with a tooltip saying to save first, and lights up again after Save. Example: on the demo, hide the cookie banner and the button goes grey; click Save and it's enabled; click it and the new tab shows the demo's Markdown without the banner.

S1 builds the button and the tab it opens. S2 adds the disabled state and both tooltips.

**Implements:** `plan.md` → Web, View as agent button.

- [x] **S1 – The button opens Agent View in a new tab (AC9)**
  A View as agent ↗ button right after Save in the top bar. Clicking it opens Agent View for the page's normalized URL in a new tab, with that URL encoded so a page address with its own `?` or `&` stays intact (plan explains why). It's disabled only until the page has loaded.
  **Verify:**
  1. With `pnpm dev` running, open the demo in the editor: View as agent ↗ sits right after Save.
  2. Click it: a new tab opens on `http://localhost:3001/agentView?url=sample%3Ademo` and shows the demo's Markdown as text (AC9).
  3. `pnpm test` passes. A new test checks the Agent View address the button builds:
    - `sample:demo` becomes `http://localhost:3001/agentView?url=sample%3Ademo`.
    - `https://acme.com/p?id=2&lang=en` is fully encoded, so its `?` and `&` don't leak into Agent View's own query string.

- [x] **S2 – Disabled while unsaved, with tooltips (AC10, AC11)**
  The button is disabled whenever the editor has unsaved changes, using the same derived flag as Save, so the two always flip together. It gets a tooltip for each state; the tooltip sits on a wrapper because a disabled button doesn't receive hover.
  **Verify:**
  1. Open the demo with nothing unsaved and hover the button: "Opens what an AI agent gets for this page, in a new tab." (AC11).
  2. Hide the cookie banner: the button is disabled, and hovering it shows "Save to see your latest changes as an agent." (AC10).
  3. Click Save: the button is enabled again. Click it: the new tab's Markdown has no cookie banner text.
  4. Undo the hide without saving: the button is disabled again until you Save.
  - Tooltips use shadcn's `Tooltip` instead of a native `title`, which didn't show reliably → `plan.md` §View as agent button

**Done when:** View as agent ↗ opens the page's Agent View in a new tab, is disabled with the right tooltip while there are unsaved changes, and shows the other tooltip when enabled. `pnpm test` and `typecheck` pass.

---



## T03 – Agent View in the README

**Goal:** someone reading the repo learns what Agent View is, why it exists, and how to try it with one `curl` command, without opening the editor.

**Implements:** `plan.md` → README.

- [ ] **S1 – Explain Agent View in the README (AC8)**
  A short README section on what the endpoint returns, why it exists (it's the downstream consumer that proves a saved configuration works without the editor), and a `curl` example against the demo page.
  **Verify:**
  1. Read the README's Agent View section: it says what it returns, why we built it, and has a `curl` command.
  2. Copy the `curl` command with `pnpm dev` running: it returns the demo's Markdown.

**Done when:** the README has an Agent View section whose `curl` example works as written.

---



## Follow-ups

- Verify that `curl -i 'localhost:3001/agentView?url=http://127.0.0.1'` answers 403 with `code: "BLOCKED"` (AC6). Blocked by 01 T01 S2 (the private-address guard in `SafeFetchService`), which isn't built yet: today it answers 502 `UNREACHABLE`. (From T01 S1)
