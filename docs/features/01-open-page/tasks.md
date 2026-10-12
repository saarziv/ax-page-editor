# Open a Page – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Running skeleton · Covers: —
- [x] T02 – Editor shell · Covers: AC2
- [x] T03 – Demo page in the preview · Covers: AC3, AC7
- [x] T04 – Real pages in the preview · Covers: AC1
- [x] T05 – Preview fixes · Covers: AC1
- Follow-ups (below) · Covers: AC4, AC5, AC6

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

## T03 – Demo page in the preview ✓

**Goal:** the server turns the bundled demo page into a clean tree and the editor draws it in the preview, with no network fetch. Real URLs still return the fake "Stub page". Fetching, the loading spinner and the friendly errors come in T04.

**Implements:** `plan.md` → API → Page tree, the demo page, and Web → Preview.

- [x] **S1 – Rename the endpoint**

  The endpoint used to be called "snapshot". It's now "page-tree", everywhere. It still returns a fake page.

  **Verify:** open any URL in the app and you see "Stub page".

- [x] **S2 – Tidy up the URL, and return errors properly**

  Before loading a page, the server tidies the URL so the same page always gets the same address. It lowercases the domain and drops `#anchors`, tracking parameters like `utm_source` and trailing slashes. A bad URL gets a clear error back instead of a crash.

  **Verify:**
  1. Send `HTTPS://Example.com/page/?utm_source=x#top` and you get back `https://example.com/page`.
  2. Send `ftp://x` and you get an `INVALID_URL` error.

- [x] **S3 – Clean a page into a tree, and add the demo page**

  This is the heart of the product: turning messy HTML into a clean tree of meaningful parts (headings, paragraphs, links, images, forms…). Scripts, styles and empty wrapper `div`s are thrown away. Every part gets an address like `main:1>paragraph:2`, which is how saved changes find it again later. The exact rules are in `plan.md` §3.2, and each rule gets its own test, written first.

  We also add a demo page (`samples/demo.html`), with a cookie banner, a chart image, a form and a few links. The server loads it straight from disk, so it needs no internet. Real URLs keep returning the fake page until T04.

  **Verify:**
  1. `pnpm test` passes. The `clean` tests check that:
     - meaningful tags become parts: `<h2>` becomes a heading (level 2), `<a href>` a link, `<img src>` an image
     - wrappers disappear but their content stays: `<div><p>Hi</p></div>` becomes just the paragraph
     - junk is removed: scripts, styles, `onclick` handlers and `javascript:` links
     - relative links become full URLs: `/about` becomes `https://site.com/about`
     - addresses are stable: the same HTML always gives the same tree, and wrapping a paragraph in extra `div`s doesn't change its `main:1>paragraph:2` address
  2. Send `sample:demo` to the endpoint. You get back the demo as a clean tree: its title, headings, image, form and links are all there, and no script code.
  3. In the app, click "Try a sample" and you see the demo's title.

- [x] **S4 – Draw the clean tree in the preview**

  Until now the preview only showed the page title. Now it draws the whole tree as a basic readable page: one React element per node kind, called recursively, with no `dangerouslySetInnerHTML` and no iframe (rules: `plan.md` → Web → Preview rendering). This is the first time you can *see* what `clean` produces, so the demo page is the main check: what's on screen is exactly what an agent will read. Real URLs still show the fake page until T04.

  **How the demo should look** (click "Try a sample"). Plain and unstyled, like a document, in the app's own font. A small header line shows the page title and URL, and below it, from top to bottom:
  1. **Cookie text** in a normal paragraph at the top, followed by an "Accept all" button. It's first because it's first in the HTML. The real page floats it at the bottom with CSS, which agents never see. It stays: hiding it is the publisher's job in 03.
  2. **Navigation:** a bulleted list of three links, Home, Pricing and Blog.
  3. **"Analytics that scale with you"** as the largest heading, then a paragraph starting "Plans start at $9 per month". The price is plain text, not bold (`strong` is unwrapped).
  4. **"Customer growth"** as a smaller heading, a grey chart image reading "Customer growth chart", and below it the caption "Customers per month, January to September 2026." as a normal paragraph.
  5. **"Plans"** heading, then a table with 3 rows and 3 columns (Plan / Price / Seats, Starter, Pro), with visible cell borders. The header row looks like the other rows.
  6. **One sentence** with two links inside it, "terms of service" and "guide to web analytics", all on the same line(s). The links don't break the sentence into separate blocks.
  7. **"Talk to sales"** heading, then three fields labelled "Work email", "Company size" and "How can we help?", and a "Request a demo" button. The dropdown's options aren't shown.
  8. **Footer:** "© 2026 Acme Analytics. Privacy", with "Privacy" as a link.

  **What must not appear:** any code (`dataLayer`, `acceptCookies`), CSS text, the hidden `csrf` field or its value `do-not-show`, the dropdown options (`1–10`), or the page's own styles. Clicking a link or a button does nothing.

  **Verify:**
  1. Click "Try a sample" and the preview matches the list above, top to bottom, with none of the "must not appear" items.
  2. Click "terms of service": the app stays on the editor, and no new tab opens.
  3. Open any real URL and you still see "Stub page" as a heading.
  4. `grep -rn "dangerouslySetInnerHTML\|<iframe" apps/web/src` finds nothing.
  5. `pnpm e2e` passes. A new test opens the sample and checks that the "Analytics that scale with you" heading and the Plans table are visible, and that `acceptCookies` and `do-not-show` are not on the page.

**Done when:** "Try a sample" shows the demo as described in S4, with no scripts or hidden fields. `pnpm test` and `pnpm e2e` pass.

**Deviations:**

- A URL without a scheme gets `https://` (spec AC3) → plan.md §3.6
- Fields survive pruning like images; whitespace-only text is pruned → plan.md §3.2
- Unresolvable hrefs (e.g. relative on `sample:`) unwrap the link like `javascript:` → plan.md §3.2
- core depends on `domhandler` directly for DOM types and guards → plan.md §2
- `clean.ts` split into a `clean/` folder, one file per pipeline step → plan.md §2

---

## T04 – Real pages in the preview ✓

**Goal:** opening any real URL fetches it through `SafeFetchService` and shows its clean tree in the preview. The private-address guard, the loading spinner and the plain-language errors were moved to Follow-ups.

**Implements:** `plan.md` → API → Page tree (SafeFetch, global plan §4.1).

- [x] **S1 – Load real pages into the preview**

  The server now fetches the real URL through `SafeFetchService` and cleans it, so any website shows in the preview, not just the demo. This first version only covers the basics: http(s) only, a 10s timeout, HTML only, a 3 MB cap, and normal redirect-following (rules: global `plan.md` §4.1, and `plan.md` → Fetching a real page). The private-address guard comes in S2, and errors still show as plain text until S4. If a real site looks wrong in the preview, add it as a follow-up instead of fixing `clean` in this step.

  We test against Wikipedia and MDN, not example.com: example.com's HTML is a single paragraph plus a script, so it proves very little.

  **Verify:**
  1. `pnpm test` passes. The fetch tests fake the network and check that:
     - a slow site gives `TIMEOUT`, also when only the body is slow
     - a page over 3 MB gives `TOO_LARGE`, with or without a `content-length` header, and a PDF gives `NOT_HTML`
     - a site that doesn't exist, or that answers 404, gives `UNREACHABLE`
     - after a redirect, the tree's `url` is the final address, normalized
  2. Open `https://en.wikipedia.org/wiki/Web_page` in the app. You see the "Web page" heading, many section headings and paragraphs, images, and links inside sentences that don't break them apart. No CSS or script text.
  3. Open `https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p`. It redirects: the grey address line under the page title in the preview shows `.../Reference/Elements/p`. The top bar keeps what you typed.
  4. Open 2–3 real sites you know (a blog post, a news article). The preview reads like the page's content, with no code or CSS showing.
  5. `pnpm e2e` passes. The e2e tests that expected "Stub page" now open the sample instead, so they don't depend on the internet.

**How to send a URL:** with `pnpm dev` running,
`curl -X POST localhost:3001/api/page-tree -H 'content-type: application/json' -d '{"url":"<URL>"}'`

**Done when:** a real website renders in the preview. `pnpm test`, `typecheck` and `e2e` pass.

---

## T05 – Preview fixes ✓

**Goal:** the preview shows exactly what an agent gets, without misleading the publisher. Real sites surface things the demo didn't. For example, checkboxes and radio buttons show as empty text boxes, and decorative logos fill the screen. Each refinement either changes what `clean` keeps or how the preview draws it, but never hides real content. New refinements found on real pages go to Follow-ups.

**Implements:** global `plan.md` §3.2, and `plan.md` → Preview rendering (including Refinements from real pages).

- [x] **S1 – Checkboxes, radios and decorative images**

  On Wikipedia, the hidden checkboxes that open the "Main menu" and "Appearance" menus show as long empty grey bars, because the tree records that a field exists but not what kind it is. Now `clean` also records an input's type (`inputType`), and the preview draws checkboxes and radio buttons as small disabled checkboxes and radios with their label beside them.

  The globe logo fills the screen, but the page marks it as decoration (`alt=""`). `clean` now drops images the page marks as decorative, with a code comment saying why: agents skip them too. Images that are real content, like the "Wikipedia" wordmark, stay, but the preview caps their height. The page's CSS sized them, and we never get it.

  **Verify:**
  1. `pnpm test` passes. The new `clean` tests check that:
     - an image with `alt=""`, `aria-hidden="true"` or `role="presentation"` is dropped
     - an image with no `alt` at all is kept (missing isn't the same as empty)
     - `<input type="checkbox">` and `type="radio"` record their `inputType`, and an input with no type records `text`
  2. Open `https://en.wikipedia.org/wiki/Web_page`:
     - the globe icon is gone
     - "Main menu" and "Appearance" show as small checkboxes, not grey bars
     - the menu toggles ("Personal tools", "Tools", "94 languages"…) are checkboxes too
     - the wordmark is no taller than the cap
  3. Click "Try a sample": the demo still looks exactly as T03 S4 describes, and `pnpm e2e` passes.

- [x] **S2 – Images at the size the page gives them**

  The "WIKIPEDIA 25" logo still fills the screen in the preview, while on the real page it's a small logo in the corner. The page sets its size with CSS on the tag itself (`style="width: 8.75em"`), which `clean` never read, so the preview drew the SVG at its natural size. A smaller height cap alone wouldn't fix it, because a cap small enough for logos makes charts unreadable. Now `clean` keeps the size written on the tag, in pixels, and the preview draws the image at that size. Images with no size keep the S1 cap (rules: global `plan.md` §3.2 → Image size, and `plan.md` → Preview rendering).

  **Verify:**
  1. `pnpm test` passes. The new `clean` tests check that:
     - `width="50" height="50"` gives `{ width: 50, height: 50 }`
     - `style="width: 8.75em; height: 1.375em"` gives `{ width: 140, height: 22 }`, and `rem` and `px` work too
     - the style wins over the attributes: `width="300" style="width: 100px"` gives `width: 100`
     - sizes we can't turn into pixels are left out: `width="100%"` and `style="width: auto"` give no `width`
  2. Open `https://en.wikipedia.org/wiki/Web_page`. The "WIKIPEDIA 25" wordmark and the "25 years of the free encyclopedia" tagline are small, about the size they are on the real page.
  3. Click "Try a sample": the chart image looks as before, and `pnpm e2e` passes.

**Done when:** the preview of Wikipedia has no misleading text boxes and no screen-filling images. The sample is unchanged. `pnpm test`, `typecheck` and `e2e` pass.

**Deviations:**

- Wikipedia's Small / Standard / Large radios are built by JavaScript, so they're not in the tree; Verify now checks the menu checkboxes instead → this file, T05 S1

---

## Follow-ups

- The web app hardcodes `http://localhost:3001`, so changing `API_PORT` breaks it. Fix: a Vite `/api` proxy or `VITE_API_URL`. (From T01 S4)
- Playwright starting the servers itself (no `pnpm dev` running) hasn't been exercised yet. (From T01 S6)
- Recent pages list on the start screen (pages with a saved configuration and their change counts). The `GET /api/configs` stub from T01 exists for it. Needs 04.
- "Built with JavaScript" banner when a page's visible text is nearly empty.
- `aria-hidden` on elements other than images (e.g. whole menus): should `clean` drop them too? It would hide much more than decoration, so it needs its own look. (From T05 S1)
- Block private and local addresses (was T04 S2): before every request and each redirect, `SafeFetchService` looks up the address and refuses private, loopback, link-local and reserved IPs with `BLOCKED`, and follows redirects itself, up to 5 (global `plan.md` §4.1). Example: `http://localhost:5173` gives `BLOCKED`.
- Spinner while loading, and a new URL replaces the old page (was T04 S3, AC4, AC5): while the page tree loads, the preview shows a spinner, never the previous page.
- Plain-language error messages with Retry (was T04 S4, AC6): the web shows the spec's message for each error code (`spec.md` → Edge cases), never the code. `TIMEOUT`, `UNREACHABLE` and unknown failures get Retry. Drop TanStack Query's 3 automatic retries.
- Keep line breaks where block wrappers were unwrapped (was T05 S3): an unwrapped wrapper `div` leaves a boundary, so `<div>A</div><div>B</div>` gives two paragraphs, not "AB" (global `plan.md` §3.2 → Block boundaries are kept).
- Say a field's name once (was T05 S4): drop a `<label>`'s loose text when it's already its field's label, so Wikipedia's menu checkboxes and the demo's "Work email" don't show their names twice (global `plan.md` §3.2 → Fields).
