# AX Editor – Plan

How we build what the specs define. This document holds what several features share: architecture, stack and layout, the shared core contracts, cross-cutting conventions, security, testing strategy, technical decisions, and the key flows several features share. Each feature's own technical design lives in its feature `plan.md`, which builds on this one and never restates it.

Where a shared piece is first built by a feature, that's noted as "first built in NN".

---

## 1. Architecture overview

```
┌──────────── apps/web (React) ────────────┐        ┌────────────── apps/api (NestJS) ──────────────┐
│ Start screen · Editor · Markdown view    │  HTTP  │ /api/page-tree  /api/forward   /api/configs   │
│                                          │ ─────► │ /agentView                                     │
│ TanStack Query (server data)             │        │                                                │
│ Zustand (draft modifications, UI)        │        │ SafeFetch ─► clean ─► (config) ─► mark ─► prune│
│ derived: marked page → preview, markdown │        │                         SQLite                 │
└──────────────────┬───────────────────────┘        └───────────────────────┬────────────────────────┘
                   └──────────── packages/core (shared, pure) ──────────────┘
                     types · zod schemas · clean · selectors · resolve · mark · prune
                     renderMarkdown · renderHtml · normalizeUrl · tokens
```

**One principle:** everything is a function of `(page tree, configuration)`.
- The API turns raw HTML into a **page tree** (`clean`).
- The editor runs `mark` live: the preview draws the marked page, and the Markdown view runs `prune` + `renderMarkdown` on it.
- Agent View runs the **same** `clean` + `mark` + `prune` + `renderMarkdown` on the live page.
- Same code on both sides, so the editor's Markdown view equals Agent View by construction.

## 2. Stack & repo layout

- pnpm workspaces, Node >=20.12 (built-in `.env` loading), TypeScript strict everywhere.
- **web:** Vite + React + TS, Tailwind + shadcn/ui, TanStack Query, Zustand.
- **api:** NestJS, better-sqlite3.
- **core:** pure TS, depends only on `htmlparser2` (parsing), `domhandler` (its DOM types and guards) and `zod`.
- **Tests:** Vitest (core, api), Playwright (2 flows).

```
apps/
  web/src/
    app/            routes: StartScreen, Editor
    editor/         TopBar, Preview/, Inspector/, ChangesList, MarkdownView
    state/          store.ts (Zustand), queries.ts (TanStack Query), derived.ts
  api/src/
    fetch/          SafeFetchService
    page/           page-tree + forward controllers/services, demo loader
    config/         controller, ConfigRepository (SQLite)
    agent-view/     controller + service
packages/
  core/src/
    types.ts  schemas.ts  clean/  selector.ts  resolve.ts
    mark.ts  prune.ts  render-markdown.ts  render-html.ts  url.ts  tokens.ts
samples/            demo.html
docs/
  spec.md  plan.md  spec-decisions.md          global
  features/NN-<feature>/spec.md plan.md tasks.md   per feature
```

**Run:** `pnpm install && pnpm dev` (web + api together). `pnpm test`, `pnpm e2e` (fresh clone: `pnpm exec playwright install chromium` first).
**Env (`apps/api/.env.example`):** `API_PORT=3001`, `WEB_ORIGIN=http://localhost:5173`, `DB_PATH=./data/ax.db`.

## 3. Shared core (`packages/core`)

All pure, all unit-tested. This is where most correctness lives.

### 3.1 Page tree

```ts
type NodeKind =
  | 'heading' | 'paragraph' | 'link' | 'image' | 'list' | 'listItem'
  | 'table' | 'row' | 'cell' | 'form' | 'field' | 'button' | 'quote' | 'code'
  | 'section' | 'article' | 'nav' | 'header' | 'footer' | 'aside' | 'main' | 'figure'
  | 'text'
  | 'page'                        // the root only
  | 'annotation' | 'forwarded';   // inserted by mark, never produced by clean

type PageNode = {
  id: string;            // = selector; unique within the tree
  kind: NodeKind;
  tag: string;           // original tag, shown in the inspector
  text?: string;         // own text (for text nodes / leaves)
  attrs?: { href?: string; src?: string; alt?: string; level?: number; label?: string;
            forId?: string; about?: string };   // annotation only (03)
  children?: PageNode[];
  hidden?: true;         // set by mark on a hidden element; prune removes it
};

type PageTree = { url: string; title: string; root: PageNode };
```

`kind` drives everything:
- the plain-language label (See, select & inspect)
- context placement: container vs leaf (Hide & add context)
- rendering in the preview, Markdown and HTML

### 3.2 `clean(html, baseUrl) → PageTree`

First built in 01. Used by every page load, forward and Agent View.

Every consumer must clean identically, or saved selectors break (D11). So these rules are the contract, not an implementation detail.

- Parse with htmlparser2.
- **Drop:** `head` (after reading the title), `script`, `style`, `noscript`, `iframe`, `object`, `embed`, `svg` internals, `template`, `hr`, comments, hidden inputs, all `on*` attributes. `br` becomes a space.
- **Map** tags to `kind` with this whitelist. Unwrap any other element (`div`, `span`, `strong`, `label`, `thead`, etc.), keeping its children. This yields "only meaningful elements" (See, select & inspect).

| Tags | kind | attrs |
|---|---|---|
| `h1`–`h6` | heading | `level` |
| `p`, `figcaption` | paragraph | |
| `a` with `href` (without: unwrapped) | link | `href` |
| `img` with `src` (without, or decorative: dropped) | image | `src`, `alt`, `width`, `height` |
| `ul`, `ol` · `li` | list · listItem | |
| `table` · `tr` · `td`, `th` | table · row · cell | |
| `form` | form | |
| `input` (not hidden/submit/button), `select`, `textarea` | field | `label`, `inputType` (`input` only) |
| `button`, `input[type=submit\|button]` | button | |
| `blockquote` | quote | |
| `pre` | code | |
| `section`, `article`, `nav`, `header`, `footer`, `aside`, `main`, `figure` | same name | |

- **Fields** are leaves, and their contents (`option`, `textarea` text) are ignored. `label` is the first of: `aria-label`, the `label[for]` text, the wrapping `label`'s text, `placeholder`, `name`. `inputType` is the input's `type`, lowercased, `text` when missing, so a checkbox isn't mistaken for a text box. A `label` element whose text is already its field's `label` (it points at the field with `for`, or wraps it) is dropped, so the name isn't said twice. A label whose text differs, e.g. `aria-label` won, stays as text.
- **Decorative images** are dropped: `alt=""`, `aria-hidden="true"`, or `role="presentation"`/`"none"`. These are HTML's own "skip this" signals, which screen readers and accessibility-tree agents already honor. A *missing* `alt` is not a signal, so that image is kept.
- **Image size** is the size the page itself gives the tag, in pixels: from inline `style` (`width:`/`height:` in `px`, or `em`/`rem` counted as 16px), else the `width`/`height` attributes, as in the browser where CSS wins. Anything else (`%`, `auto`, stylesheet rules) is left out. Agents ignore it; it only keeps the preview's proportions honest, e.g. `style="width: 8.75em"` → `width: 140`.
- **Root:** `{ id: '', kind: 'page', tag: 'body' }`. It isn't a selector step, so its children start the path (`main:1`).
- **Text:** collapse whitespace runs to one space, and trim at the edges of each element. Adjacent text left by unwrapping is merged. An element whose only content is text keeps it in `text`, with no children. Mixed content becomes `text` children: `<p>Read <a>terms</a> now</p>` → paragraph[text, link, text].
- **Block boundaries are kept.** Unwrapping a block-level wrapper (`div`, `dl`, `dt`, `dd`, `details`, `summary`, `fieldset`, `legend`, `address`, `center`) leaves a boundary, so its text never merges with the text around it. In a node whose content has a boundary or a block child, each run of inline nodes (`text`, `link`) becomes a `paragraph`. A node whose whole content is one inline run is unchanged, so `<li><div>One</div></li>` is still listItem "One". Example: `<div>Main menu</div><div><button>hide</button></div><div>Navigation</div>` → paragraph "Main menu", button, paragraph "Navigation", where before it was one line, "Main menu hide Navigation".
- **Prune** nodes with no text and no meaningful children, including whitespace-only text. Images (with `src`) and fields are kept even though they have no text.
- **Resolve** `href`/`src` against `baseUrl`. A `javascript:` href, or one that can't be resolved (a relative link on a `sample:` page), counts as no href, so the link is unwrapped.
- **Ids** are assigned last, over the pruned tree (§3.3), so unwrapping and pruning never shift an `nth`. Text nodes get ids too.
- **Title:** `<title>`, else the first heading's text, else `baseUrl`.
- **Deterministic:** the same HTML always produces the same tree. Required for targeting.

### 3.3 Selectors & targets

`resolve` and the target snippet are first built in 02.

- `selector` = path in the **clean tree**: `kind:nth` steps, e.g. `main:1>section:2>paragraph:3` (format defined in the global spec, Configuration). It's computed over the clean tree, not the raw DOM, so wrapper churn (`div` soup) on the live site doesn't break it.
- `target.text` = first 60 chars of the node's normalized text (or `alt` for images).
- `resolve(tree, target) → node | null`: find by selector, then require that the snippet still matches. Otherwise return `null` (unmatched, see Save & review changes). Never fall back to a guess.

### 3.4 `mark(root, modifications, forwards) → Marked` and `prune(root)`

Applying a configuration is two steps, run by both the editor and Agent View.

- **`mark`** applies every modification once and returns the **marked page**: the original tree, with hidden elements flagged (`hidden: true`, still in place) and `annotation` / `forwarded` nodes inserted where the agent will read them. It also returns a status per modification.
- **`prune`** removes every flagged subtree. What's left is the **agent tree**, the only tree the renderers see.

How the two fit into the editor and Agent View, with an example, is in §6.1. The contract lives here; the rules of each step live in the feature plan that owns it.

```ts
type Forwarded = { href: string; tree?: PageTree; error?: ForwardError };
type Status = 'active' | 'inactive' | 'unmatched' | 'overBudget' | 'failed';
type Marked = {
  tree: PageNode;                  // the marked page
  status: Record<ModId, Status>;
};
```

`mark` runs these steps, in this order:

| Step | What | Rules in |
|---|---|---|
| 1. Resolve | Resolve each modification with `resolve`. If unresolved, mark it `unmatched`. | §3.3 |
| 2. Hide | Flag the node `hidden`; modifications inside a hidden subtree become `inactive`. | 03 Hide & add context |
| 3. Context | Insert `annotation` nodes, placed by kind. | 03 Hide & add context |
| 4. Forward | Insert `forwarded` nodes within size limits; `overBudget` / `failed` leave the plain link. | 04 Forward a link |

- `mark` never changes its input: it copies only the nodes it changes and their ancestors, and shares every other node.
- Note text is stored and rendered as a plain string, never parsed.
- The editor uses `status` to group the changes list (Save & review changes). Agent View uses it to report what was skipped.

### 3.5 Renderers

Both first built in 02. They render the agent tree (`prune` output), so they never see a hidden node. The formats for `annotation` and `forwarded` nodes are defined in 06 and 04.

- **`renderMarkdown(tree)`:** our own tree-to-Markdown walker (headings, lists, tables, links, images). We own the tree, so we don't render HTML and then run it through Turndown. Deterministic, and no extraction guessing.
- **`renderHtml(tree)`:** semantic HTML, everything text-escaped.

### 3.6 Utilities
- `normalizeUrl`: assume `https://` when no scheme is given, lowercase scheme and host, drop the fragment, drop `utm_*` / `fbclid` / `gclid`, strip the trailing slash except on root, sort the query. `sample:` URLs pass through (see 01). First built in 01.
- `estimateTokens(text) = ceil(chars / 4)`.
- **zod schemas** for `Config` and `Modification`. They're the single source of the TS types and are used by both api validation and web.

### 3.7 Config type

`Target` and `Modification` are first built in 02 (for the demo mock), `Config` in 05.

```ts
type Target = { selector: string; text: string };
type Modification =
  | { id: string; type: 'hide';    target: Target }
  | { id: string; type: 'context'; target: Target; note: string }   // 1..300 chars
  | { id: string; type: 'forward'; target: Target; href: string };  // absolute http(s)
type Config = { version: 1; url: string; updatedAt: string; modifications: Modification[] };
```

## 4. Backend (`apps/api`, NestJS)

### 4.1 `SafeFetchService.fetchHtml(url)`

Every server-side fetch goes through it: page loads, forwards, Agent View. First built in 01.

- Accepts http(s) only.
- **Before each request:** resolve DNS and reject private, loopback, link-local and reserved IPs (IPv4 + IPv6).
- **Redirects:** followed manually, max 5, each hop re-checked.
- **Limits:** 10s timeout, 3 MB body cap (stream and abort), `content-type` must be `text/html`.
- **Status:** a non-2xx response is `UNREACHABLE`, so an error page never becomes a page a publisher configures.
- Returns `{ finalUrl, html }`, or throws a typed `FetchError` with `code`: `INVALID_URL | BLOCKED | NOT_HTML | TOO_LARGE | TIMEOUT | UNREACHABLE`.

### 4.2 Endpoints (index)

Details live in the owning feature's plan.

| Method | Path | Owner |
|---|---|---|
| POST | `/api/page-tree` | 01 Open a page |
| POST | `/api/forward` | 04 Forward a link |
| GET | `/api/configs?url=` | 05 Save & review changes |
| PUT | `/api/configs` | 05 Save & review changes |
| GET | `/agentView?url=&format=md\|html` | 06 Agent View |

### 4.3 Conventions
- **Errors:** `{ code, message }`. The web maps `code` to the plain-language messages in the Open a page spec.
- **Validation:** request bodies are validated per route with `@ZodBody(schema)` (core schemas). Invalid → 400 `{ code: 'INVALID_REQUEST' }`.
- **No caching in the API** (D9: forwards are fetched live). The only cache is the editor's session cache (P11).

## 5. Frontend (`apps/web`)

### 5.1 State

**Server data (TanStack Query):**
- `usePageTree(url)`
- `useConfig(url)`
- `useForward(href)` (see 04)

**Editor state (Zustand):**

```ts
{
  url: string | null;
  draft: Modification[];          // the only editable source of truth
  savedJson: string;              // last saved draft, for the dirty flag
  selectedId: string | null;
  view: 'page' | 'markdown';
  actions: { load, select, toggleHide, setContext, toggleForward, remove, markSaved }
}
```
Actions enforce the spec rules: one modification per type per element, an empty note removes the context modification, forward only on links, and the page forward budget. Each action is specified in the plan of the feature that uses it.

**Derived (memoized, never stored):**
- `marked = mark(tree, draft, forwards)`, from the `useMarkedPage()` hook (03). It drives the preview and the status groups.
- `markdown = renderMarkdown(prune(marked.tree))`, plus the token count, computed in the Markdown view only (06).
- `dirty = JSON(draft) !== savedJson`

## 6. Key shared architectures

### 6.1 Modification options architecture

How the publisher's page modifications for agents (hide an element, add context, forward a link) are created, edited, shown in the preview, turned into Markdown and saved.

**Why we need it.** A publisher's change shows up in four places: the preview, the Markdown view, the saved configuration and Agent View. If each of them worked out on its own what's hidden and where a note goes, they would drift apart. The preview could show a note above the chart while the agent gets it below, and the publisher would be approving something the agent never reads.

**What it solves.** One flow, used by every feature that adds a modification (03 hide and context, 04 forward, 05 save, 06 Agent View):
- the publisher's changes live in exactly one place,
- every decision about them is made exactly once,
- the preview, the Markdown and Agent View only draw the result, so they always agree,
- saving is just sending that one list.

**The intent and the idea.** Store only what the publisher chose, a short list of changes, and compute everything else from it. One core function, `mark`, applies the list to the page and produces a **marked page**: the same page, with hidden elements flagged and notes inserted where the agent will read them. The preview draws the marked page as it is. The Markdown first removes the flagged parts. The server only stores the list.

```
 Inspector (click Hide, type a note)
        │ toggleHide(target) · setContext(target, note) · toggleForward(…)
        ▼
 ┌─ Zustand store ────────────┐   save: PUT /api/configs    ┌─ API ───────────┐
 │ draft: Modification[]      │ ──────────────────────────► │ SQLite, one     │
 │ savedJson (last saved)     │ ◄────────────────────────── │ config per URL  │
 └─────────────┬──────────────┘   load: GET /api/configs    └───────┬─────────┘
               │                                                    │ same chain
 page tree ──► mark(page, draft)          (useMarkedPage, 03)       ▼
 (TanStack Query)   │                                         Agent View (06)
                    ▼
               marked page
              ┌─────┴──────────────────────┐
              ▼                            ▼
          Preview                   prune → renderMarkdown
   draws all of it:                  Markdown view (06):
   hidden = faded, notes = boxes     hidden parts gone, notes as text
```

**The flow, step by step.** Example: on the demo page, the publisher hides the cookie banner, then adds a note to the chart.

1. **Add or edit.** Each control calls one store action, which adds, replaces or removes one entry in `draft`. An element has at most one modification of each type, so editing a note replaces its text, and clearing it removes the entry. After the two clicks:
   ```ts
   draft = [
     { id: 'a1', type: 'hide',    target: { selector: 'aside:1', text: 'We use cookies…' } },
     { id: 'b2', type: 'context', target: { selector: 'main:1>figure:1>image:1', text: 'Customer growth' },
       note: 'Customer growth from 1,200 to 8,500, Jan to Sep 2026.' },
   ]
   ```
   A target is a path in the clean page plus a text snippet (§3.3), never a DOM element, so it still works when the page is loaded again later.
2. **Compute the marked page.** `useMarkedPage()` runs `mark(page, draft)` each time `draft` or the page changes, and never on selection or hover. `mark` makes every decision once (§3.4): the banner gets `hidden: true` but stays in place, and the note becomes an `annotation` node right after the image.
   ```
   page
    ├─ aside (hidden: true)
    └─ main
        └─ figure
            ├─ image
            └─ annotation "Customer growth from…"
   ```
3. **Draw the preview.** The preview draws the marked page as it is. The banner is drawn faded with a "Hidden from AI" label and stays clickable, so the publisher can turn Hide off. The annotation is drawn as a "Context for AI" box under the chart.
4. **Compute the Markdown.** The Markdown view runs `prune` on the same marked page, which drops the banner, then `renderMarkdown` on what's left:
   ```markdown
   ![Customer growth](growth.png)

   > **Context:** Customer growth from 1,200 to 8,500, Jan to Sep 2026.
   ```
   The preview and the Markdown come from the same marked page, so they can't disagree about what's hidden or where a note sits.
5. **Save and load (05).** Save sends `draft` wrapped as a `Config` (§3.7): `{ version: 1, url, updatedAt, modifications: draft }`. The API validates it and stores one configuration per URL. Opening the page again loads it back into `draft`, and steps 2–4 follow by themselves. "Unsaved changes" is `draft` compared with the last saved copy, never a stored flag.
6. **Serve agents (06).** Agent View loads the saved configuration and runs the same chain on the live page: `renderMarkdown(prune(mark(page, config)))`.

## 7. Security (global spec, Trust & safety)

| Concern | Measure |
|---|---|
| Page code running | Never rendered as HTML. The tree is rendered via React (auto-escaped). Scripts and handlers are dropped in `clean`. |
| SSRF | SafeFetch: DNS-resolved IP checks on every hop, limits, HTML only. |
| Note injection | Notes are plain strings, escaped in every renderer, and capped at 300. |
| Bad configs | zod validation on PUT and on read. |
| Navigation out of the editor | Preview links don't navigate. "Open original" uses `rel="noopener noreferrer"`. |
| CORS | The API only allows `WEB_ORIGIN`. |

## 8. Testing strategy

- **Core (Vitest):** the bulk of the tests, mapped to spec ACs. Every shared core function is tested where it's first built; each feature plan lists its own tests.
- **API (Vitest):** safety checks (SafeFetch), validation, and Agent View on the demo page.
- **E2E (Playwright, 2 flows):**
  1. Open the demo page, hide the cookie banner, add context to the chart: the preview shows both (lands with 03), and the Markdown view reflects both (lands with 06).
  2. Save, reload: the modifications are restored, and Agent View returns the same Markdown. (Lands with 06.)

## 9. Technical decisions

| # | Decision | Why | Rejected |
|---|---|---|---|
| P1 | Own page tree (JSON) shared by preview, Markdown, HTML | One model, three views; safe rendering; easy tests | Sanitized HTML strings in iframe |
| P2 | Own tree→Markdown renderer | We own the tree; deterministic; exact placement control | HTML→Turndown |
| P3 | Selectors over the clean tree (`kind:nth`) | Survive wrapper changes on live sites | Raw-DOM CSS selectors |
| P4 | Strict snippet check, no fuzzy fallback | Never misapply (Save & review changes) | Fuzzy text search (future) |
| P5 | Main content by heuristic (`main`/`article`, minus chrome) | Simple, deterministic, no extra deps | Mozilla Readability (better on messy pages, future) |
| P6 | `mark` + `prune` in shared core, run on web + api | Parity by construction | Server-rendered preview per edit (latency) |
| P7 | TanStack Query + Zustand | Server data vs editor state separated; fine-grained re-renders | Context+useReducer, Redux, Jotai |
| P8 | `sample:` scheme for the bundled demo page | Offline demo without weakening SSRF rules | Serving it from localhost |
| P9 | Tokens ≈ chars/4 | Good enough for budget UX | Real tokenizer (heavy, model-specific) |
| P10 | SQLite behind a repository | Real DB, no setup, swappable for Postgres JSONB | JSON files |
| P11 | Session-cached forwards in editor only | Snappy editing; Agent View stays live per spec | Refetch on every edit |
| P12 | One marked page: preview draws it, agent output prunes it | Every decision made once; the preview just draws a tree | Preview draws the original tree and looks up per element which modifications apply and where notes go |
