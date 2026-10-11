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
- [ ] **S5 – Feature stubs (no logic)**
  - core: `normalizeUrl` and `clean` with their final signatures, throwing "not implemented".
  - api:
    - `SafeFetchService.fetchHtml` stub.
    - `POST /api/snapshot` validates `{ url }` and returns a hardcoded stub `PageTree` that echoes the url.
    - `GET /api/configs` returns `[]`.
  - web:
    - StartScreen: URL input + Open, and the three sample buttons. The Recent row is hidden because the list is empty.
    - Editor placeholder: a top bar URL field, plus the stub tree's url and title.
    - Switching between the two screens is driven by the store's `url`.
  - **Verify:** in the browser, type any URL and click Open, and the editor shows "Stub page" with that URL. Click a sample and see the same with `sample:pricing`. `POST /api/snapshot` with `{}` returns 400.
- [ ] **S6 – E2E**
  - Playwright config that starts web and api.
  - One smoke flow: start screen → Open → stub editor.
  - **Verify:** `pnpm e2e` passes.

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
- S4: `ZodValidationPipe` is applied per route (`@Body(new ZodValidationPipe(schema))`). Its 400 uses `code: 'INVALID_REQUEST'`; the global plan doesn't name a code for bad request bodies.
- S4: The web app still calls `http://localhost:3001`, so if `API_PORT` changes, the web stops reaching the api. Follow-up: a Vite `/api` proxy or a `VITE_API_URL`.

---

## T02 – Start screen: URL input, samples and recent row, with input validation

## T03 – Open flow and editor shell: loading state, top bar URL field, final URL and JavaScript banner

## T04 – Plain-language error states (all edge cases, Retry), driven by API error codes

## T05 – Sample pages (Article, Product, Pricing) loaded by snapshot from disk

## T06 – Core page tree types, zod schemas and `clean` (incl. `isNearlyEmpty`)

## T07 – `normalizeUrl` (tracking params, trailing slash, `sample:` passthrough)

## T08 – `SafeFetchService` and real-URL snapshot (SSRF checks, limits, `FetchError` codes)
