# AX Editor – Plan

How we build what the specs define. This document holds what several features share: architecture, stack and layout, the shared core contracts, cross-cutting conventions, security, testing strategy and technical decisions. Each feature's own technical design lives in its feature `plan.md`, which builds on this one and never restates it.

Where a shared piece is first built by a feature, that's noted as "first built in NN".

---

## 1. Architecture overview

```
┌──────────── apps/web (React) ────────────┐        ┌────────────── apps/api (NestJS) ──────────────┐
│ Start screen · Editor · Markdown view    │  HTTP  │ /api/snapshot   /api/forward   /api/configs   │
│                                          │ ─────► │ /agentView                                     │
│ TanStack Query (server data)             │        │                                                │
│ Zustand (draft modifications, UI)        │        │ SafeFetch ─► clean ─► (config) ─► transform    │
│ derived: preview, markdown (transform)   │        │                         SQLite                 │
└──────────────────┬───────────────────────┘        └───────────────────────┬────────────────────────┘
                   └──────────── packages/core (shared, pure) ──────────────┘
                     types · zod schemas · clean · selectors · resolve · transform
                     renderMarkdown · renderHtml · normalizeUrl · tokens
```

**One principle:** everything is a function of `(page tree, configuration)`.
- The API turns raw HTML into a **page tree** (`clean`).
- The editor renders the tree as the preview, and runs `transform` + `renderMarkdown` live.
- Agent View runs the **same** `clean` + `transform` + `renderMarkdown` on the live page.
- Same code on both sides, so the editor's Markdown view equals Agent View by construction.

## 2. Stack & repo layout

- pnpm workspaces, Node >=20.12 (built-in `.env` loading), TypeScript strict everywhere.
- **web:** Vite + React + TS, Tailwind + shadcn/ui, TanStack Query, Zustand.
- **api:** NestJS, better-sqlite3.
- **core:** pure TS, depends only on `htmlparser2` (parsing) and `zod`.
- **Tests:** Vitest (core, api), Playwright (2 flows).

```
apps/
  web/src/
    app/            routes: StartScreen, Editor
    editor/         TopBar, Preview/, Inspector/, ChangesList, MarkdownView
    state/          store.ts (Zustand), queries.ts (TanStack Query), derived.ts
  api/src/
    fetch/          SafeFetchService
    page/           snapshot + forward controllers/services, demo loader
    config/         controller, ConfigRepository (SQLite)
    agent-view/     controller + service
packages/
  core/src/
    types.ts  schemas.ts  clean.ts  selector.ts  resolve.ts
    transform.ts  render-markdown.ts  render-html.ts  url.ts  tokens.ts
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
  | 'annotation' | 'forwarded';   // inserted by transform, never produced by clean

type PageNode = {
  id: string;            // = selector; unique within the tree
  kind: NodeKind;
  tag: string;           // original tag, shown in the inspector
  text?: string;         // own text (for text nodes / leaves)
  attrs?: { href?: string; src?: string; alt?: string; level?: number; label?: string };
  children?: PageNode[];
};

type PageTree = { url: string; title: string; root: PageNode };
```

`kind` drives everything:
- the plain-language label (See & select)
- context placement: container vs leaf (Hide & add context)
- rendering in the preview, Markdown and HTML

### 3.2 `clean(html, baseUrl) → PageTree`

First built in 01. Used by every page load, forward and Agent View.

- Parse with htmlparser2.
- **Drop:** `script`, `style`, `noscript`, `iframe`, `object`, `embed`, `svg` internals, `template`, comments, hidden inputs, all `on*` attributes.
- **Map** tags to `kind` with a whitelist. Unwrap any element not on the whitelist (`div`, `span`, etc.), keeping its children. This yields "only meaningful elements" (See & select).
- **Prune** nodes with no text and no meaningful children. Images are kept if they have `src`.
- **Resolve** `href`/`src` against `baseUrl`. Drop `javascript:` links' href.
- **Collapse** whitespace.
- **Deterministic:** the same HTML always produces the same tree. Required for targeting.

### 3.3 Selectors & targets
- `selector` = path in the **clean tree**: `kind:nth` steps, e.g. `main:1>section:2>paragraph:3` (format defined in the global spec, Configuration). It's computed over the clean tree, not the raw DOM, so wrapper churn (`div` soup) on the live site doesn't break it.
- `target.text` = first 60 chars of the node's normalized text (or `alt` for images).
- `resolve(tree, target) → node | null`: find by selector, then require that the snippet still matches. Otherwise return `null` (unmatched, see Save & review changes). Never fall back to a guess.

### 3.4 `transform(tree, config, forwards) → Result`

The one function that applies a configuration, run by both the editor and Agent View. The contract lives here; the rules of each step live in the feature plan that owns it.

```ts
type Forwarded = { href: string; tree?: PageTree; error?: ForwardError };
type Result = {
  tree: PageNode;                         // modified tree (hidden removed, annotations inserted)
  status: Record<ModId, 'active' | 'inactive' | 'unmatched' | 'overBudget' | 'failed'>;
};
```

Pipeline, in this order:

| Step | What | Rules in |
|---|---|---|
| 1. Resolve | Resolve each modification with `resolve`. If unresolved, mark it `unmatched`. | §3.3 |
| 2. Hide | Remove subtrees; nested modifications become `inactive`. | 03 Hide & add context |
| 3. Context | Insert `annotation` nodes, placed by kind. | 03 Hide & add context |
| 4. Forward | Insert `forwarded` nodes within size limits; `overBudget` / `failed` leave the plain link. | 04 Forward a link |

- Note text is stored and rendered as a plain string, never parsed.
- The editor uses `status` to group the changes list (Save & review changes). Agent View uses it to report what was skipped.

### 3.5 Renderers

Both first built in 02. The formats for `annotation` and `forwarded` nodes are defined in 03 and 04.

- **`renderMarkdown(tree)`:** our own tree-to-Markdown walker (headings, lists, tables, links, images). We own the tree, so we don't render HTML and then run it through Turndown. Deterministic, and no extraction guessing.
- **`renderHtml(tree)`:** semantic HTML, everything text-escaped.

### 3.6 Utilities
- `normalizeUrl`: lowercase scheme and host, drop the fragment, drop `utm_*` / `fbclid` / `gclid`, strip the trailing slash except on root, sort the query. `sample:` URLs pass through (see 01). First built in 01.
- `estimateTokens(text) = ceil(chars / 4)`.
- **zod schemas** for `Config` and `Modification`. They're the single source of the TS types and are used by both api validation and web.

### 3.7 Config type

```ts
type Target = { selector: string; text: string };
type Modification =
  | { id: string; type: 'hide';    target: Target }
  | { id: string; type: 'context'; target: Target; note: string }   // 1..500 chars
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
- Returns `{ finalUrl, html }`, or throws a typed `FetchError` with `code`: `INVALID_URL | BLOCKED | NOT_HTML | TOO_LARGE | TIMEOUT | UNREACHABLE`.

### 4.2 Endpoints (index)

Details live in the owning feature's plan.

| Method | Path | Owner |
|---|---|---|
| POST | `/api/snapshot` | 01 Open a page |
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
- `useSnapshot(url)`
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
- `result = transform(tree, draft, forwards)` drives the preview markers, the status groups and Markdown.
- `markdown = renderMarkdown(result.tree)`, plus the token count
- `dirty = JSON(draft) !== savedJson`
- `modsBySelector` lets each preview node subscribe to only its own modifications.

### 5.2 Preview vs Markdown
The preview renders the **original** tree with markers, so hidden nodes stay clickable. The Markdown renders the **transformed** tree. Both come from the same `transform` result.

## 6. Security (global spec, Trust & safety)

| Concern | Measure |
|---|---|
| Page code running | Never rendered as HTML. The tree is rendered via React (auto-escaped). Scripts and handlers are dropped in `clean`. |
| SSRF | SafeFetch: DNS-resolved IP checks on every hop, limits, HTML only. |
| Note injection | Notes are plain strings, escaped in every renderer, and capped at 500. |
| Bad configs | zod validation on PUT and on read. |
| Navigation out of the editor | Preview links don't navigate. "Open original" uses `rel="noopener noreferrer"`. |
| CORS | The API only allows `WEB_ORIGIN`. |

## 7. Testing strategy

- **Core (Vitest):** the bulk of the tests, mapped to spec ACs. Every shared core function is tested where it's first built; each feature plan lists its own tests.
- **API (Vitest):** safety checks (SafeFetch), validation, and Agent View on the demo page.
- **E2E (Playwright, 2 flows):**
  1. Open the demo page, hide the cookie banner, add context to the chart: the Markdown view reflects both. (Lands with 03.)
  2. Save, reload: the modifications are restored, and Agent View returns the same Markdown. (Lands with 06.)

## 8. Technical decisions

| # | Decision | Why | Rejected |
|---|---|---|---|
| P1 | Own page tree (JSON) shared by preview, Markdown, HTML | One model, three views; safe rendering; easy tests | Sanitized HTML strings in iframe |
| P2 | Own tree→Markdown renderer | We own the tree; deterministic; exact placement control | HTML→Turndown |
| P3 | Selectors over the clean tree (`kind:nth`) | Survive wrapper changes on live sites | Raw-DOM CSS selectors |
| P4 | Strict snippet check, no fuzzy fallback | Never misapply (Save & review changes) | Fuzzy text search (future) |
| P5 | Main content by heuristic (`main`/`article`, minus chrome) | Simple, deterministic, no extra deps | Mozilla Readability (better on messy pages, future) |
| P6 | `transform` in shared core, run on web + api | Parity by construction | Server-rendered preview per edit (latency) |
| P7 | TanStack Query + Zustand | Server data vs editor state separated; fine-grained re-renders | Context+useReducer, Redux, Jotai |
| P8 | `sample:` scheme for the bundled demo page | Offline demo without weakening SSRF rules | Serving it from localhost |
| P9 | Tokens ≈ chars/4 | Good enough for budget UX | Real tokenizer (heavy, model-specific) |
| P10 | SQLite behind a repository | Real DB, no setup, swappable for Postgres JSONB | JSON files |
| P11 | Session-cached forwards in editor only | Snappy editing; Agent View stays live per spec | Refetch on every edit |
