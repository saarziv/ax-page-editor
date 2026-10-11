# Open a Page – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

Verified elsewhere: restoring a saved configuration on open, and the unsaved-changes warning, are verified in 05 Save & review changes. They need `GET /api/configs?url=`, `load` and `dirty`.

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

## T02 – Start screen: URL input, samples and recent row, with input validation



## T03 – Open flow and editor shell: loading state, top bar URL field, final URL and JavaScript banner



## T04 – Plain-language error states (all edge cases, Retry), driven by API error codes



## T05 – Sample pages (Article, Product, Pricing) loaded by snapshot from disk



## T06 – Core page tree types, zod schemas and `clean` (incl. `isNearlyEmpty`)



## T07 – `normalizeUrl` (tracking params, trailing slash, `sample:` passthrough)



## T08 – `SafeFetchService` and real-URL snapshot (SSRF checks, limits, `FetchError` codes)



---

## Follow-ups

- The web app hardcodes `http://localhost:3001`, so changing `API_PORT` breaks it. Fix: a Vite `/api` proxy or `VITE_API_URL`. (From T01 S4)
- Playwright starting the servers itself (no `pnpm dev` running) hasn't been exercised yet. (From T01 S6)
