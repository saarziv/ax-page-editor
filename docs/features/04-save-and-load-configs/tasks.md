# Save & Load Configs – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Save the configuration · Covers: AC1, AC2, AC4, AC5
- [x] T02 – Show saved pages on the start screen · Covers: AC9, and the first half of AC10 (clicking a row opens the page)

**Not in a task yet** (tasks to be added later):

- AC3 – the "Unsaved changes" indicator.
- AC6, AC7, AC8 – the review list with Remove buttons, and the "Needs attention" group.
- AC10 (second half), AC11, AC12, AC13 – restoring a page's saved changes when it opens, by any URL, flagging the ones that no longer match, and the error with Retry when they can't be loaded.

---



## T01 – Save the configuration

**Goal:** the publisher clicks Save, and the page's changes are stored on the server, one configuration per page.

The flow (`plan.md` → How saving works):

1. The Save button in the top bar sends the page URL and `modificationsDraft` to `PUT /api/configs`.
2. The server validates the request with core's schemas and rejects anything invalid.
3. The server adds `version` and `updatedAt`, normalizes the URL, and writes one SQLite row per URL, replacing the old one.
4. A toast shows "Saved", or a plain-language error if the save didn't go through. Save is enabled only while there are unsaved changes.

S1 builds the whole path for a save that succeeds. S2 makes a failed save visible.

Not in this task: the "Unsaved changes" indicator (AC3), and reading configurations back (T02 and later).

**Implements:** `plan.md` → `configSchema` and `saveConfigRequestSchema`, Endpoints (`PUT`), `ConfigRepository` (`save`), Save button.

- [x] **S1 – Save the configuration to the server (AC1, AC2, AC5)**
  Core gets the configuration schemas. The api gets a `ConfigRepository` backed by SQLite and a `PUT /api/configs` endpoint that stores the configuration under the normalized URL. The top bar gets a Save button, enabled only when the draft differs from the last save, that sends the draft and shows a "Saved" toast for a few seconds when it succeeds.
  **Verify:**
  1. With `pnpm dev` running, click "Try a sample": Save is disabled. Hide the cookie banner and add a note to the chart: Save is enabled and shows a pointer cursor. Click Save: a "Saved" toast appears at the bottom right and disappears after a few seconds, and Save is disabled again (AC1).
  2. Run `sqlite3 apps/api/data/ax.db "select url, config from page_configs"`. There's one row, `sample:demo`, whose config has `version: 1`, an `updatedAt`, and the two modifications (AC1).
  3. Clear the chart's note and click Save again. Run the same query: still one row, now with only the hide and a later `updatedAt` (AC2).
  4. Send an unknown modification type: `curl -s -X PUT localhost:3001/api/configs -H 'content-type: application/json' -d '{"url":"sample:demo","modifications":[{"id":"x","type":"blink","target":{"selector":"aside:1","text":"a"}}]}'`. The answer is a 400 with `code: "INVALID_REQUEST"`, and the query from step 2 shows the row unchanged (AC5).
  5. `pnpm test` passes. New tests check:
    - The schemas reject an unknown type, a missing `target`, a 301-character note and two modifications with the same id, and accept a valid list.
    - Saving through the controller stores a full configuration, with `version: 1` and an `updatedAt`, under the normalized URL: `acme.com/pricing/?utm_source=x` is stored as `https://acme.com/pricing`.
    - Saving the same URL twice leaves one row, holding the second save.
  6. `pnpm e2e` passes. A new test opens the demo (Save disabled), hides the banner (Save enabled), clicks Save, sees the "Saved" toast, and Save is disabled again.

- [x] **S2 – A plain error when the save doesn't go through (AC4)**
  If the server can't be reached, answers with an error, or doesn't answer within 10 seconds, a toast shows "Your changes couldn't be saved. Try again." and stays until the next save. The draft is never touched by saving, so every change stays on screen. Without the timeout, a hanging server would leave the Save button disabled forever.
  **Verify:**
  1. Open the demo and hide the banner. Stop `pnpm dev` (the page stays open in the browser). Click Save: the toast "Your changes couldn't be saved. Try again." appears, Save stays enabled, and the banner is still hidden and still listed under "Changes on this page" (AC4).
  2. Start `pnpm dev` again and click Save: the error toast is replaced by "Saved", and Save is disabled.
  3. `pnpm test` passes. New tests check the save request and the dirty flag:
    - A 500 answer counts as a failed save.
    - A server that never answers counts as a failed save after 10 seconds (with fake timers, so the test doesn't wait).
    - The dirty flag is false on a fresh page, true after a change, false once that draft is saved, true again if an edit happened while the save ran, and reset when another page opens.

- Timeout uses an `AbortController` with a timer, not `AbortSignal.timeout` (fake timers can't advance it) → plan.md §Save button
- Save results are toasts, and Save is enabled only with unsaved changes (the dirty flag from global plan §5.1, built early) → spec.md §2 Save, plan.md §Save button, this task's steps

**Done when:** on the demo page, Save stores the configuration in SQLite, saving again replaces it, an invalid configuration is refused, and a failed save shows the plain-language error with all changes still on screen. `pnpm test`, `typecheck` and `e2e` pass.

---



## T02 – Show saved pages on the start screen

**Goal:** the start screen lists every saved page, newest first, and clicking one opens it.

The flow (`plan.md` → How the Saved pages list works):

1. The start screen calls `GET /api/configs`.
2. The server returns one short summary per saved page, newest first: its URL, when it was saved, and how many changes it has.
3. Below "Try a sample", a "Saved pages" section shows one row per page, for example "sample:demo · 1 change · saved 2 hours ago".
4. Clicking a row opens that page, the same way as typing its URL.

S1 builds steps 1 and 2. S2 builds steps 3 and 4.

Not in this task: the opened page doesn't get its saved changes back yet. That's the restore task (AC10 second half, AC11–AC13).

**Implements:** `plan.md` → Endpoints (`GET`), `ConfigRepository` (`listSummaries`), Saved pages list.

- [x] **S1 – The server lists saved pages**
  The repository gets `listSummaries`, and `GET /api/configs` returns its result instead of the 01 stub's empty list. Each summary has the URL, the last save time and the number of changes. SQLite counts the changes itself, so the list never parses whole configurations.
  **Verify:**
  1. With the demo saved (T01), run `curl -s localhost:3001/api/configs`. The answer is one item: `url: "sample:demo"`, an `updatedAt`, and `modificationCount` matching the demo's saved changes.
  2. Open `https://example.com`, hide its heading and click Save. Run the curl again: two items, `https://example.com` first.
  3. `pnpm test` passes. New tests check `listSummaries` against an in-memory database:
    - An empty database gives `[]`.
    - Pages come back newest first.
    - `modificationCount` is right, including 0 for an empty configuration.

- [x] **S2 – The start screen shows saved pages (AC9, AC10 first half)**
  A "Saved pages" section below "Try a sample" shows one row per saved page: the URL, then "N changes · saved ". Clicking a row opens that page. The section isn't drawn when nothing is saved, and if the list can't be loaded it shows "Saved pages couldn't be loaded." while the rest of the start screen keeps working. After a successful save, the list is refreshed, so it's current when the publisher comes back.
  **Verify:**
  1. Reload the browser. The start screen shows "Saved pages" with `https://example.com` above `sample:demo`, each with its change count and time, for example "1 change · saved 3 minutes ago" (AC9).
  2. Click the `sample:demo` row: the demo page opens in the editor. Its saved changes aren't restored yet (later task).
  3. Run `sqlite3 apps/api/data/ax.db "delete from page_configs"` and reload: the "Saved pages" section is gone.
  4. `pnpm test` passes. New tests check `formatSavedAgo` and the count wording:
    - 30 seconds ago is "just now", 5 minutes ago is "5 minutes ago", 2 hours ago is "2 hours ago", 1 day ago is "yesterday".
    - 1 is "1 change", 0 is "0 changes", 3 is "3 changes".
  5. `pnpm e2e` passes. New tests:
    - Save the demo, reload, see the `sample:demo` row, click it, and the demo opens.
    - With `GET /api/configs` blocked (Playwright `page.route`), the start screen shows "Saved pages couldn't be loaded." and "Try a sample" still opens the demo.

**Done when:** after saving pages, the start screen lists them newest first with their change counts and times, and clicking a row opens that page. `pnpm test`, `typecheck` and `e2e` pass.

---



## Follow-ups

- The e2e hover test (`select-inspect.spec.ts` "hovering an element outlines it…") failed once in a full parallel run and passed on re-run; make it stable.

