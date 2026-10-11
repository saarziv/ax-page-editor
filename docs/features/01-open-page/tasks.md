# Open a Page – Tasks

Follows the SDD guidelines in `CLAUDE.md`:

- Aim for one session per task. The dev commits and pushes, not Claude: commits optionally after each step, and pushes once the task is done.
- Each step is one prompt or a short prompt loop, with its own **Verify** action.
- Detail a task's steps right before it starts.

Verified elsewhere: restoring a saved configuration on open, and the unsaved-changes warning, are verified in 05 Save & review changes. They need `GET /api/configs?url=`, `load` and `dirty`.

---

## T01 – Running skeleton

**Goal:** web and api are fully set up, with every library from the global plan §2 configured. 01's key pieces exist as empty stubs, so the dev can click through start screen → Open → editor and see the server respond.

**Steps**

- [x] **S1 – Minimal wiring**
  - pnpm workspace, `tsconfig.base.json` (strict), Node 20+.
  - `packages/core` (`@ax/core`) exports one value.
  - `apps/api` (NestJS) serves `GET /api/health` → `{ ok: true, core: <value> }`.
  - `apps/web` (Vite + React) fetches it and shows it.
  - `pnpm dev` starts all three.
  - **Verify:** run `pnpm dev`, open http://localhost:5173, and see the health response, including the core value.
- [x] **S2 – Quality scripts**
  - Vitest in core and api (global plan §2/§7), with no placeholder tests. The first tests land with real logic.
  - ESLint flat config: typescript-eslint, `no-explicit-any` as an error, and react-hooks rules for web.
  - Root `test`, `typecheck`, `lint` and `build` scripts.
  - **Verify:** `pnpm test && pnpm typecheck && pnpm lint && pnpm build` all pass.
- [x] **S3 – Web libraries**
  - Tailwind + shadcn/ui (Button, Input, Card).
  - TanStack Query provider and devtools, with the health call moved to `useQuery`.
  - Zustand.
  - Folders per global plan §2 (`app/`, `editor/`, `state/`).
  - **Verify:** the health response shows in a styled shadcn Card, and the Query devtools list the health query.
- [x] **S4 – API libraries**
  - `.env.example` (`API_PORT`, `WEB_ORIGIN`, `DB_PATH`) and env loading.
  - CORS limited to `WEB_ORIGIN`.
  - A zod validation pipe, with `zod` added to core.
  - `better-sqlite3` installed (no schema yet; that's 05).
  - **Verify:** `curl -i -H "Origin: http://evil.test" localhost:3001/api/health` has no `Access-Control-Allow-Origin` header, while the web app still loads health. Changing `API_PORT` in `.env` moves the server.
- [x] **S5 – Feature stubs (no logic)**
  - Goal: every piece of 01 exists with its final name and signature, but returns fake data. Later tasks replace the insides without rewiring.
  - core (`packages/core`):
    - `normalizeUrl(rawUrl)` and `clean(html, baseUrl)` throw "not implemented".
    - `PageNode` / `PageTree` zod schemas, so the api and web share one type.
  - api (`apps/api`):
    - `SafeFetchService.fetchHtml(url)` rejects with "not implemented".
    - `POST /api/snapshot` checks the body is `{ url }`, then returns a fake `PageTree` titled "Stub page" that echoes the url.
    - `GET /api/configs` returns `[]`.
  - web (`apps/web`):
    - StartScreen: a URL input with an Open button, plus Article / Product / Pricing sample buttons. The Recent row stays hidden because the list is empty.
    - Editor placeholder: a top bar URL field, and below it the stub page's title and url.
    - Which screen shows depends on the store's `url`: empty shows StartScreen, set shows the editor. No router.
  - **Verify:** in the browser, type any URL and click Open, and the editor shows "Stub page" with that URL. Click a sample and see the same with `sample:pricing`. `POST /api/snapshot` with `{}` returns 400.
- [x] **S6 – E2E**
  - Goal: turn the S5 click-through into an automated browser test.
  - A Playwright config that starts web and api itself, with `reuseExistingServer: true` so a running `pnpm dev` is reused. Servers Playwright starts stop when the run ends.
  - One smoke test: start screen → type a URL → Open → the stub editor shows "Stub page".
  - Scripts so the dev can watch the test: `pnpm e2e:ui` (Playwright UI mode, click ▶ to run, step through each action) and `pnpm e2e:headed` (real browser window, slowed with `SLOW_MO=800` so the clicks are visible), and `pnpm e2e:debug` (Playwright Inspector, step through each action).
  - **Verify:** `pnpm e2e` passes. Run `pnpm e2e:ui`, click ▶, and watch the smoke test pass.

**Done when**

- `pnpm dev` boots web and api. The start screen → Open → stub editor flow works in the browser against the real API.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm e2e` all pass.
- `packages/core` has no I/O, Nest or React dependencies.
- `.env.example` is committed. `.env` and `data/` are gitignored.

**Out of scope:** any real feature logic (fetching, cleaning, normalizing, error mapping), the DB schema, routing beyond the store-driven screen switch.

**Deviations:**

- S2: Vitest pinned to 4.x. Vitest 5 requires Node 22.12+, which conflicts with "Node 20+".
- S2: Smoke tests dropped. Per `CLAUDE.md`, tests only cover code where our logic can be wrong. Vitest is wired in core and api with `passWithNoTests`, so `pnpm test` passes until the first real tests land.
- S3: Tailwind v4 via `@tailwindcss/vite`, so there's no `tailwind.config`. shadcn (new-york, neutral) uses `@/` → `src/`, and its `cn` helper comes from shadcn's `cn` package, not clsx + tailwind-merge. `App.tsx` moved to `app/`. `state/store.ts` holds only `url` for now (used in S5).
- S4: `better-sqlite3` pinned to 12.x. 13.x requires Node 22+, which conflicts with "Node 20+".
- S4: Env is loaded with Node's built-in `process.loadEnvFile` (no dotenv), so `engines` is now `>=20.12`. `.env.example` lives in `apps/api/` because the api reads `.env` from its own working directory. Values are validated with zod and default to the `.env.example` values, so a fresh clone runs without a `.env`. An invalid value stops startup.
- S4: CORS takes `[WEB_ORIGIN]`, not a plain string. With a string, `cors` sends that origin to every caller, which would fail the Verify.
- S4: `ZodValidationPipe` was first applied per route. Its 400 uses `code: 'INVALID_REQUEST'`; the global plan doesn't name a code for bad request bodies.
- S4: The web app still calls `http://localhost:3001`, so if `API_PORT` changes, the web stops reaching the api. Follow-up: a Vite `/api` proxy or a `VITE_API_URL`.
- S5: The stub snapshot's `root` is a single empty `main` node, since the `PageTree` schema requires one. Stubs that take parameters include them in the "not implemented" message, so lint doesn't flag unused arguments and the error names its input.
- S5: The pipe stays per-route, behind a `@ZodBody(schema)` decorator (`common/zod-body.decorator.ts`) that wraps `Body(new ZodValidationPipe(schema))`. A global pipe with DTO classes (`createZodDto`) was tried and dropped: it needed a class built by a function, a cast and a type guard, which was too hard to read. Trade-off: a raw `@Body()` still skips validation, so `CLAUDE.md` says bodies must use `@ZodBody`.
- S5: The web `queries.ts` now has `useSnapshot(url)`, which parses the response with core's `pageTreeSchema`. It's still hardcoded to `http://localhost:3001` (see the S4 follow-up).
- S6: `playwright.config.ts` and `e2e/` live at the repo root. The config has two `webServer` entries (api health URL, web URL), because the api needs time to boot. The smoke test matches the Open button with `exact: true`, since the TanStack devtools button also contains "Open". Only Chromium is installed (`pnpm exec playwright install chromium` on a fresh clone). The run was checked against the dev's already-running `pnpm dev`; the path where Playwright starts the servers itself wasn't exercised. UI mode shows recorded DOM snapshots, not a live browser; `e2e:headed` and `e2e:debug` were added to watch the real one.

---

## T02 – Start screen: URL input, samples and recent row, with input validation

## T03 – Open flow and editor shell: loading state, top bar URL field, final URL and JavaScript banner

## T04 – Plain-language error states (all edge cases, Retry), driven by API error codes

## T05 – Sample pages (Article, Product, Pricing) loaded by snapshot from disk

## T06 – Core page tree types, zod schemas and `clean` (incl. `isNearlyEmpty`)

## T07 – `normalizeUrl` (tracking params, trailing slash, `sample:` passthrough)

## T08 – `SafeFetchService` and real-URL snapshot (SSRF checks, limits, `FetchError` codes)
