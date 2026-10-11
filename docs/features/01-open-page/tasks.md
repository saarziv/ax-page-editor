# Open a Page – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

---

## T01 – Running skeleton ✓

**Goal:** web and api are fully set up, with every library from the global plan §2 configured. 01's key pieces exist as empty stubs, so the dev can click through start screen → Open → editor and see the server respond.

- [x] **S1 – Minimal wiring:** pnpm workspace with strict TS. `pnpm dev` runs core, api (`GET /api/health`) and web, and the web shows the health response.
- [x] **S2 – Quality scripts:** Vitest in core and api, ESLint (`no-explicit-any` as an error, react-hooks), and root `test`, `typecheck`, `lint` and `build` scripts.
- [x] **S3 – Web libraries:** Tailwind and shadcn/ui, TanStack Query (health moved to `useQuery`, with devtools), Zustand, and the `app/`, `editor/`, `state/` folders.
- [x] **S4 – API libraries:** env loading validated with zod (`API_PORT`, `WEB_ORIGIN`, `DB_PATH`), CORS limited to `WEB_ORIGIN`, a zod validation pipe, and better-sqlite3 installed.
- [x] **S5 – Feature stubs (no logic):** `normalizeUrl`, `clean`, `SafeFetchService`, `POST /api/snapshot` (fake "Stub page") and `GET /api/configs` exist with their final signatures. StartScreen and the editor placeholder switch on the store's `url`.
- [x] **S6 – E2E:** Playwright config at the repo root that reuses a running `pnpm dev`, plus a start → Open → "Stub page" smoke test, with `e2e:ui`, `e2e:headed` and `e2e:debug` scripts.

**Done when:** `pnpm dev` boots web and api, and the start screen → Open → stub editor flow works against the real API. `pnpm test`, `typecheck`, `lint`, `build` and `e2e` pass. `packages/core` has no I/O, Nest or React dependencies.

**Deviations:**

- Node `>=20.12` (built-in `.env` loading) → plan.md §2
- `.env.example` lives in `apps/api/`; e2e needs `playwright install chromium` on a fresh clone → plan.md §2
- Bodies validated per route with `@ZodBody`; invalid → 400 `INVALID_REQUEST` → plan.md §4.3

---



## T02 – Editor shell ✓

**Goal:** the editor shows the spec's layout.

- [x] **S1 – Shell layout (no BE call):** top bar with URL field + Open, preview panel on the left, disabled Hide / Context / Forward controls on the right.
  - **Verify:** open any URL from the start screen and see the three areas.

**Done when:** S1's Verify passes, and `pnpm test` and `pnpm typecheck` pass.

---

## T03 – Page tree endpoint (backend)

**Goal:** `POST /api/page-tree` with `{ url }` returns the real clean page as `{ url, title, root }`, or `{ code, message }` when it fails. Backend only: the web keeps showing just the title and URL. The tree renderer and the plain-language error screens come in the next task.

How a request flows:

1. `normalizeUrl(url)`: canonical URL (lowercase host, no fragment, no `utm_*`, no trailing slash). A non-http(s) or unparseable URL fails with `INVALID_URL`.
2. Get the HTML:
   - `sample:demo` → read `samples/demo.html` from disk (the **demo loader**: the bundled "Try a sample" page, loaded without any network).
   - anything else → `SafeFetchService.fetchHtml(url)`, which returns `{ finalUrl, html }` or throws a `FetchError`.
3. `clean(html, finalUrl)` → `PageTree`, with `url` = the normalized final URL.
4. Any `FetchError` → an HTTP error with body `{ code, message }`, where `code` is one of `INVALID_URL | BLOCKED | NOT_HTML | TOO_LARGE | TIMEOUT | UNREACHABLE`.

- [x] **S1 – Rename:** `/api/snapshot` → `/api/page-tree` (controller, route, `useSnapshot` → `usePageTree`). Still returns the stub page.
  - **Verify:** open any URL in the app and see "Stub page". `curl -X POST localhost:3001/api/page-tree -d '{"url":"x"}' -H 'content-type: application/json'` returns the stub tree. The e2e smoke test passes.
- [ ] **S2 – `normalizeUrl` + the error response:** tests first (spec AC `example.com/page/?utm_source=x` → `example.com/page`, host case, fragment, query order, root slash, `sample:` passthrough, invalid → `INVALID_URL`). The endpoint normalizes the URL, and a `FetchError` becomes `{ code, message }` with a matching HTTP status.
  - **Verify:** curl `{"url":"HTTPS://Example.com/page/?utm_source=x#top"}` → the stub tree's `url` is `https://example.com/page`. Curl `{"url":"ftp://x"}` → 400 `{ "code": "INVALID_URL", ... }`.
- [ ] **S3 – `clean`:** tests first (whitelist → kind, unwrap `div`/`span`, drop scripts/styles/`on*`/`javascript:` hrefs, prune empty nodes, keep images with `src`, resolve relative URLs, collapse whitespace, ids = `kind:nth` selector paths, deterministic, title from `<title>`).
  - **Verify:** `pnpm test` passes the `clean` suite.
- [ ] **S4 – Demo page + loader:** write `samples/demo.html` (cookie banner, chart image, form, links to real public URLs). `sample:demo` is read from disk and cleaned.
  - **Verify:** curl `{"url":"sample:demo"}` returns a tree with the demo's title, headings, the image, the form and absolute links, and no script content. In the app, "Try a sample" shows the demo's title.
- [ ] **S5 – `SafeFetchService`:** tests first, with DNS mocked: blocks private/loopback/link-local/reserved IPs (v4 + v6), re-checks every redirect hop (max 5), 10s timeout, 3 MB cap, `text/html` only. Each failure is a typed `FetchError`.
  - **Verify:** curl `https://example.com` → its real tree. `http://localhost:5173` → `BLOCKED`. A PDF URL → `NOT_HTML`. `https://no-such-host.invalid` → `UNREACHABLE`.

**Done when:** every Verify passes; `pnpm test`, `pnpm typecheck` and `pnpm e2e` pass.

---



## Follow-ups

- The web app hardcodes `http://localhost:3001`, so changing `API_PORT` breaks it. Fix: a Vite `/api` proxy or `VITE_API_URL`. (From T01 S4)
- Playwright starting the servers itself (no `pnpm dev` running) hasn't been exercised yet. (From T01 S6)
- Recent pages list on the start screen (pages with a saved configuration and their change counts). The `GET /api/configs` stub from T01 exists for it. Needs 05.
- "Built with JavaScript" banner when a page's visible text is nearly empty.

