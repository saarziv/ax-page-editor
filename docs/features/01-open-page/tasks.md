# Open a Page – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Running skeleton · Covers: —
- [x] T02 – Editor shell · Covers: AC2
- [ ] T03 – Page tree endpoint (backend) · Covers: AC1 (API), AC3, AC7
- [ ] T04 – Tree renderer + error screens · Covers: AC1 (UI), AC4, AC5, AC6

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

**Done when:** opening any URL from the start screen shows the three areas.

---

## T03 – Page tree endpoint (backend)

**Goal:** you send the server a URL, and it sends back that page cleaned up as a tree (JSON). If the page can't be loaded, you get back an error code and a message instead.

This task is backend only. The app keeps showing just the page title for now. Drawing the tree on screen, and the friendly error screens, come in T04.

**Implements:** `plan.md` → API → Page tree, and the demo page.

- [x] **S1 – Rename the endpoint**

  The endpoint used to be called "snapshot". It's now "page-tree", everywhere. It still returns a fake page.

  **Verify:** open any URL in the app and you see "Stub page".

- [x] **S2 – Tidy up the URL, and return errors properly**

  Before loading a page, the server tidies the URL so the same page always gets the same address. It lowercases the domain and drops `#anchors`, tracking parameters like `utm_source` and trailing slashes. A bad URL gets a clear error back instead of a crash.

  **Verify:**
  1. Send `HTTPS://Example.com/page/?utm_source=x#top` and you get back `https://example.com/page`.
  2. Send `ftp://x` and you get an `INVALID_URL` error.

- [ ] **S3 – Clean a page into a tree, and add the demo page**

  This is the heart of the product: turning messy HTML into a clean tree of meaningful parts (headings, paragraphs, links, images, forms…). Scripts, styles and empty wrapper `div`s are thrown away. Every part gets an address like `main:1>paragraph:2`, which is how saved changes find it again later. The exact rules are in `plan.md` §3.2, and each rule gets its own test, written first.

  We also add a demo page (`samples/demo.html`), with a cookie banner, a chart image, a form and a few links. The server loads it straight from disk, so it needs no internet. Real URLs keep returning the fake page until S4.

  **Verify:**
  1. `pnpm test` passes. The `clean` tests check that:
     - meaningful tags become parts: `<h2>` becomes a heading (level 2), `<a href>` a link, `<img src>` an image
     - wrappers disappear but their content stays: `<div><p>Hi</p></div>` becomes just the paragraph
     - junk is removed: scripts, styles, `onclick` handlers and `javascript:` links
     - relative links become full URLs: `/about` becomes `https://site.com/about`
     - addresses are stable: the same HTML always gives the same tree, and wrapping a paragraph in extra `div`s doesn't change its `main:1>paragraph:2` address
  2. Send `sample:demo` to the endpoint. You get back the demo as a clean tree: its title, headings, image, form and links are all there, and no script code.
  3. In the app, click "Try a sample" and you see the demo's title.

- [ ] **S4 – Fetch real pages safely**

  Now the server fetches real websites. It does that through a guard that refuses anything dangerous: addresses inside our own network (like `localhost`), redirects that sneak there, pages that are too slow or too big, and files that aren't web pages. Each refusal comes back as a clear error code. Each rule gets its own test, written first (rules: `plan.md` §4.1).

  **Verify:**
  1. `pnpm test` passes. The guard tests fake the network, and check that every dangerous case is refused with the right error:
     - private and local addresses are `BLOCKED`, like `127.0.0.1`, `192.168.x.x` and their IPv6 versions
     - a public URL that redirects to a private one is also `BLOCKED`, and so is a chain of more than 5 redirects
     - a slow site gives `TIMEOUT`, a page over 3 MB gives `TOO_LARGE`, and a PDF gives `NOT_HTML`
  2. Send `https://example.com` and you get back its real clean tree.
  3. Send `http://localhost:5173` and you get `BLOCKED`.
  4. Send a PDF link and you get `NOT_HTML`.
  5. Send `https://no-such-host.invalid` and you get `UNREACHABLE`.

**How to send a URL:** with `pnpm dev` running,
`curl -X POST localhost:3001/api/page-tree -H 'content-type: application/json' -d '{"url":"<URL>"}'`

**Done when:** a real website and the demo page both come back as clean trees, every dangerous URL is refused with its error code, and `pnpm e2e` still passes.

**Deviations:**

- A URL without a scheme gets `https://` (spec AC3) → plan.md §3.6

---

## Follow-ups

- The web app hardcodes `http://localhost:3001`, so changing `API_PORT` breaks it. Fix: a Vite `/api` proxy or `VITE_API_URL`. (From T01 S4)
- Playwright starting the servers itself (no `pnpm dev` running) hasn't been exercised yet. (From T01 S6)
- Recent pages list on the start screen (pages with a saved configuration and their change counts). The `GET /api/configs` stub from T01 exists for it. Needs 05.
- "Built with JavaScript" banner when a page's visible text is nearly empty.

