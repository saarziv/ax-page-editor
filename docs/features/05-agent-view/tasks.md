# Agent View – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [ ] T01 – Agent View endpoint · Covers: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8
- [ ] T02 – View as agent button · Covers: AC9, AC10, AC11 (detailed when T01 is done)

---



## T01 – Agent View endpoint

**Goal:** anyone can call `GET /agentView?url=<page>` and get back the live page, with its saved configuration applied, as Markdown an agent can read.

The flow (`plan.md` → How Agent View works):

1. The endpoint fetches and cleans the live page, the same way the editor does.
2. It loads the configuration saved for that page, if any.
3. It applies it with `markModificationsInTree`, the editor's own function.
4. It drops the hidden parts (`prune`) and writes the rest as Markdown (`renderMarkdown`).

Example: with the demo's cookie banner hidden and a note on the chart, the answer has no banner text and has `> **Context:** Customer growth…` right after the chart image.

S1 builds the endpoint and the Markdown writer, with no configuration applied yet. S2 applies the saved configuration. S3 documents it in the README.

Not in this task: the View as agent button (T02), and forwarded content (06).

**Implements:** `plan.md` → How Agent View works, `prune`, `renderMarkdown`, `GET /agentView?url=`, README.

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

- [ ] **S3 – Explain Agent View in the README (AC8)**
  A short README section on what the endpoint returns, why it exists (it's the downstream consumer that proves a saved configuration works without the editor), and a `curl` example against the demo page.
  **Verify:**
  1. Read the README's Agent View section: it says what it returns, why we built it, and has a `curl` command.
  2. Copy the `curl` command with `pnpm dev` running: it returns the demo's Markdown.

**Done when:** `/agentView?url=` returns the live page as Markdown with its saved configuration applied, shows as text in a browser tab, explains failures, and is documented in the README. `pnpm test` and `typecheck` pass.

---



## Follow-ups

- Verify that `curl -i 'localhost:3001/agentView?url=http://127.0.0.1'` answers 403 with `code: "BLOCKED"` (AC6). Blocked by 01 T01 S2 (the private-address guard in `SafeFetchService`), which isn't built yet: today it answers 502 `UNREACHABLE`. (From T01 S1)
