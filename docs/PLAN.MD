# AX Editor – Plan

How we build what `spec.md` defines. Spec sections are referenced as `§6.5` etc.
Time budget: ~3 hours. The plan covers the whole spec; `tasks.md` orders the work so the most important ACs land first.

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
- Same code on both sides, so the Markdown view equals Agent View (§6.9, §6.11) by construction.

## 2. Stack & repo layout

- pnpm workspaces, Node 20+, TypeScript strict everywhere.
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
    page/           snapshot + forward controllers/services, samples
    config/         controller, ConfigRepository (SQLite)
    agent-view/     controller + service
packages/
  core/src/
    types.ts  schemas.ts  clean.ts  selector.ts  resolve.ts
    transform.ts  render-markdown.ts  render-html.ts  url.ts  tokens.ts
samples/            article.html  product.html  pricing.html
```

**Run:** `pnpm install && pnpm dev` (web + api together). `pnpm test`, `pnpm e2e`.
**Env (`.env.example`):** `API_PORT=3001`, `WEB_ORIGIN=http://localhost:5173`, `DB_PATH=./data/ax.db`.

## 3. Shared core (`packages/core`)

All pure, all unit-tested. This is where most correctness lives.

### 3.1 Page tree

```ts
type NodeKind =
  | 'heading' | 'paragraph' | 'link' | 'image' | 'list' | 'listItem'
  | 'table' | 'row' | 'cell' | 'form' | 'field' | 'button' | 'quote' | 'code'
  | 'section' | 'article' | 'nav' | 'header' | 'footer' | 'aside' | 'main' | 'figure'
  | 'text';

type PageNode = {
  id: string;            // = selector; unique within the tree
  kind: NodeKind;
  tag: string;           // original tag, shown in the inspector
  text?: string;         // own text (for text nodes / leaves)
  attrs?: { href?: string; src?: string; alt?: string; level?: number; label?: string };
  children?: PageNode[];
};

type PageTree = { url: string; title: string; root: PageNode; isNearlyEmpty: boolean };
```

`kind` drives everything:
- the plain-language label (§6.2)
- context placement: container vs leaf (§6.6)
- rendering in the preview, Markdown and HTML

### 3.2 `clean(html, baseUrl) → PageTree`
- Parse with htmlparser2.
- **Drop:** `script`, `style`, `noscript`, `iframe`, `object`, `embed`, `svg` internals, `template`, comments, hidden inputs, all `on*` attributes.
- **Map** tags to `kind` with a whitelist. Unwrap any element not on the whitelist (`div`, `span`, etc.), keeping its children. This yields "only meaningful elements" (§6.4).
- **Prune** nodes with no text and no meaningful children. Images are kept if they have `src`.
- **Resolve** `href`/`src` against `baseUrl`. Drop `javascript:` links' href.
- **Collapse** whitespace.
- `isNearlyEmpty` = visible text under ~200 chars, which drives the JavaScript banner (§6.1).
- **Deterministic:** the same HTML always produces the same tree. Required for targeting.

### 3.3 Selectors & targets
- `selector` = path in the **clean tree**: `kind:nth` steps, e.g. `main>section:2>paragraph:3`. It's computed over the clean tree, not the raw DOM, so wrapper churn (`div` soup) on the live site doesn't break it.
- `target.text` = first 60 chars of the node's normalized text (or `alt` for images).
- `resolve(tree, target) → node | null`: find by selector, then require that the snippet still matches. Otherwise return `null` (unmatched, §6.10). Never fall back to a guess.

### 3.4 `transform(tree, config, forwards) → Result`

```ts
type Forwarded = { href: string; tree?: PageTree; error?: ForwardError };
type Result = {
  tree: PageNode;                         // modified tree (hidden removed, annotations inserted)
  status: Record<ModId, 'active' | 'inactive' | 'unmatched' | 'overBudget' | 'failed'>;
};
```
1. Resolve each modification. If unresolved, mark it `unmatched`.
2. **Hide:** mark the subtree removed. Modifications inside it become `inactive`.
3. **Context:** insert an `annotation` node.
   - Containers (`section`, `article`, `nav`, `header`, `footer`, `aside`, `main`, `list`, `table`, `form`, `figure`): first child.
   - Everything else: next sibling.
4. **Forward:** walk forwards in document order. Truncate each to 3,000 tokens and add them up to the 10,000-token page budget. Any that don't fit become `overBudget`; failed ones become `failed`. Both leave the plain link. Fitting ones are inserted as a `forwarded` node right after the link, with the forwarded tree's main content.
5. Note text is stored and rendered as a plain string, never parsed.

The editor uses `status` to group the changes list (§6.8). Agent View uses it to report what was skipped.

### 3.5 Renderers
- **`renderMarkdown(tree)`:** our own tree-to-Markdown walker (headings, lists, tables, links, images). We own the tree, so we don't render HTML and then run it through Turndown. Deterministic, and no extraction guessing.
  - Annotation: `> **Context:** …` (note text escaped for Markdown).
  - Forwarded: `> **Forwarded content from <url>:**` followed by the content as a quoted block.
  - For containers whose first child is an annotation, the blockquote goes directly before the container's content (a Markdown list can't contain a leading blockquote).
- **`renderHtml(tree)`:** semantic HTML, everything text-escaped.
  - Context: `<p data-ax="context"><strong>Context:</strong> …</p>`
  - Forward: `<section data-ax="forwarded" data-source="…"><p><strong>Forwarded content from …:</strong></p>…</section>`

### 3.6 Main content (for forwards)
`mainContent(tree)`: use `main`, else the largest `article`, else `root`. Strip `nav`, `header`, `footer` and `aside` from it.

### 3.7 Utilities
- `normalizeUrl`: lowercase scheme and host, drop the fragment, drop `utm_*` / `fbclid` / `gclid`, strip the trailing slash except on root, sort the query.
- `estimateTokens(text) = ceil(chars / 4)`.
- **zod schemas** for `Config` and `Modification`. They're the single source of the TS types and are used by both api validation and web.

### 3.8 Config type

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
- Accepts http(s) only.
- **Before each request:** resolve DNS and reject private, loopback, link-local and reserved IPs (IPv4 + IPv6).
- **Redirects:** followed manually, max 5, each hop re-checked.
- **Limits:** 10s timeout, 3 MB body cap (stream and abort), `content-type` must be `text/html`.
- Returns `{ finalUrl, html }`, or throws a typed `FetchError` with `code`: `INVALID_URL | BLOCKED | NOT_HTML | TOO_LARGE | TIMEOUT | UNREACHABLE`.

### 4.2 Endpoints

| Method | Path | In | Out |
|---|---|---|---|
| POST | `/api/snapshot` | `{ url }` | `PageTree` (url = normalized final URL) |
| POST | `/api/forward` | `{ url }` | `{ url, title, tree (main content), tokens }` |
| GET | `/api/configs?url=` | | `Config` or 404 |
| GET | `/api/configs` | | `[{ url, updatedAt, count }]` (recent list, §6.1) |
| PUT | `/api/configs` | `Config` | saved `Config` |
| GET | `/agentView?url=&format=md\|html` | | `text/markdown` or `text/html` |

- **Errors:** `{ code, message }`. The web maps `code` to the plain-language messages in §6.1.
- **Validation:** a zod pipe with the core schemas, plus checks that context ≤ 500, forward `href` is absolute http(s), and ids are unique.
- **Agent View:**
  1. SafeFetch, then `clean`
  2. load the config
  3. fetch all forward hrefs in parallel (each through SafeFetch, `mainContent`)
  4. `transform`, then `renderMarkdown` or `renderHtml`
  5. Skipped modifications are reported in the `X-AX-Skipped` header as JSON `[{ id, reason }]`.
- **No caching anywhere** (spec: forwards are live).

### 4.3 Sample pages
Samples live in `/samples` and are addressed as `sample:pricing`, etc. Snapshot loads them from disk instead of fetching, because SafeFetch would correctly block `localhost`. Their forward links point to other `sample:` pages, so every feature works offline. `normalizeUrl` passes `sample:` through.

### 4.4 Storage
`ConfigRepository` interface (`get(url)`, `save(config)`, `list()`), implemented with SQLite:
`page_configs(url TEXT PRIMARY KEY, config TEXT NOT NULL, updated_at TEXT NOT NULL)`.
The JSON is validated on save and on read.

## 5. Frontend (`apps/web`)

### 5.1 State

**Server data (TanStack Query):**
- `useSnapshot(url)`
- `useConfig(url)`
- `useForward(href)`, one query per forward modification and cached by href in the session, so the preview isn't refetched on every edit. This is editor-session caching only; Agent View still fetches live.

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
Actions enforce the spec rules: one modification per type per element, an empty note removes the context modification, forward only on links, and the page forward budget.

**Derived (memoized, never stored):**
- `result = transform(tree, draft, forwards)` drives the preview markers, the status groups and Markdown.
- `markdown = renderMarkdown(result.tree)`, plus the token count
- `dirty = JSON(draft) !== savedJson`
- `modsBySelector` lets each preview node subscribe to only its own modifications.

### 5.2 Components
- **StartScreen:** URL input, samples, recent configs from `GET /api/configs`, and error states.
- **TopBar:** URL field, Page/Markdown toggle, change count (opens the changes list), and Save with a dirty dot. Unsaved changes are guarded with `beforeunload` and a confirm on URL change.
- **Preview:** a recursive `PreviewNode` renders the original tree by `kind`, overlaying the draft status:
  - ghosted when hidden
  - an inline callout for context
  - a collapsible forwarded block, with an error state when the forward fails
  - hover outline and label, a selected ring, and click-to-select via `stopPropagation`
  - links render as non-navigating elements
  - images get `referrerPolicy="no-referrer"`
  - no `dangerouslySetInnerHTML` anywhere
- **Inspector:**
  - **Element selected:** label + tag, text, breadcrumb (from the selector path), Select parent, Hide toggle, context textarea with counter, Forward button with disabled reasons and remaining budget, and this element's modifications.
  - **Nothing selected:** **ChangesList**, grouped Active, Inactive and Needs attention. Clicking an item selects it and scrolls it into view.
- **MarkdownView:** `<pre>` of the derived Markdown, token count, copy and download.
- **Keyboard:** Esc deselects.

### 5.3 Preview vs Markdown
The preview renders the **original** tree with markers, so hidden nodes stay clickable (§6.5). The Markdown renders the **transformed** tree. Both come from the same `transform` result.

## 6. Security (§9)

| Concern | Measure |
|---|---|
| Page code running | Never rendered as HTML. The tree is rendered via React (auto-escaped). Scripts and handlers are dropped in `clean`. |
| SSRF | SafeFetch: DNS-resolved IP checks on every hop, limits, HTML only. |
| Note injection | Notes are plain strings, escaped in every renderer, and capped at 500. |
| Bad configs | zod validation on PUT and on read. |
| Navigation out of the editor | Preview links don't navigate. "Open original" uses `rel="noopener noreferrer"`. |
| CORS | The API only allows `WEB_ORIGIN`. |

## 7. Testing

**Core (Vitest):** the bulk of the tests, mapped to spec ACs.
- `clean`: whitelisting, unwrapping, pruning, URL resolution, determinism (clean twice gives an identical tree)
- `resolve`: match, snippet mismatch gives `unmatched` (§6.10)
- `transform`:
  - hide removes the subtree and inactivates nested modifications (§6.5)
  - context placement on containers vs leaves (§6.6)
  - note escaping (§6.6)
  - forward insertion and the depth-1 rule (§6.7)
  - per-link truncation and page budget order (§6.7)
- `renderMarkdown`: snapshot tests for the samples
- `normalizeUrl`: §6.1 AC3

**API (Vitest):**
- SafeFetch blocks private IPs and redirects to them, with DNS mocked
- config validation
- Agent View on a sample: applied output plus the skipped header

**E2E (Playwright, 2 flows):**
1. Open the pricing sample, hide the banner, add context to the chart: the Markdown view reflects both.
2. Save, reload: the modifications are restored, and Agent View returns the same Markdown.

## 8. Technical decisions

| # | Decision | Why | Rejected |
|---|---|---|---|
| P1 | Own page tree (JSON) shared by preview, Markdown, HTML | One model, three views; safe rendering; easy tests | Sanitized HTML strings in iframe |
| P2 | Own tree→Markdown renderer | We own the tree; deterministic; exact placement control | HTML→Turndown |
| P3 | Selectors over the clean tree (`kind:nth`) | Survive wrapper changes on live sites | Raw-DOM CSS selectors |
| P4 | Strict snippet check, no fuzzy fallback | Never misapply (§6.10) | Fuzzy text search (future) |
| P5 | Main content by heuristic (`main`/`article`, minus chrome) | Simple, deterministic, no extra deps | Mozilla Readability (better on messy pages, future) |
| P6 | `transform` in shared core, run on web + api | Parity by construction | Server-rendered preview per edit (latency) |
| P7 | TanStack Query + Zustand | Server data vs editor state separated; fine-grained re-renders | Context+useReducer, Redux, Jotai |
| P8 | `sample:` scheme for bundled pages | Offline demos without weakening SSRF rules | Serving samples from localhost |
| P9 | Tokens ≈ chars/4 | Good enough for budget UX | Real tokenizer (heavy, model-specific) |
| P10 | SQLite behind a repository | Real DB, no setup, swappable for Postgres JSONB | JSON files |
| P11 | Session-cached forwards in editor only | Snappy editing; Agent View stays live per spec | Refetch on every edit |