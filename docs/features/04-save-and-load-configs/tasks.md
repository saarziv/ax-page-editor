# Save & Load Configs – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Save the configuration · Covers: AC1, AC2, AC4, AC5
- [x] T02 – Show saved pages on the start screen · Covers: AC9, and the first half of AC10 (clicking a row opens the page)
- [x] T03 – Review and remove changes · Covers: AC3, AC6, and the first half of AC7 (removed from the list and the preview, "Unsaved changes" appears, and the next save drops it)
- [x] T04 – Restore saved changes when a page opens · Covers: the second half of AC7 (a removed change stays gone after reopening), the second half of AC10, AC11, AC14
- Follow-ups (below) · Covers: AC8, AC12, AC13

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
  1. With `pnpm dev` running, click "Try a sample": Save is disabled. Hide the cookie banner and add a note to the chart: Save is enabled and shows a pointer cursor. Click Save: a "Saved" toast appears at the bottom center and disappears after a few seconds, and Save is disabled again (AC1).
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

Not in this task: the opened page doesn't get its saved changes back yet. That's the restore task (AC10 second half, AC11).

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



## T03 – Review and remove changes

**Goal:** the publisher sees every change on the page in one list, removes the ones they don't want, and always knows when there's something left to save.

The flow (`plan.md` → How reviewing and removing works):

1. With nothing selected, "Changes on this page" lists every change: its type in plain words, the element's text snippet, and for a context change, the note.
2. Each row has a Remove button. Clicking it drops that change from `modificationsDraft`, so it disappears from the list and the preview at once.
3. Whenever the draft differs from the last save, the top bar shows "Unsaved changes" next to Save. Saving clears it, and stores the list without the removed change.

For example, with the banner hidden and a note on the chart, removing the hide un-fades the banner, leaves one row in the list, and shows "Unsaved changes". After Save, the stored configuration holds only the note.

S1 adds the indicator, because S2's Verify relies on seeing it. S2 builds the list and Remove.

Not in this task: the "Needs attention" group (AC8). Only a configuration loaded back into the editor can hold a change that no longer matches the page, so it waits until restoring exists (T04) and is a follow-up.

**Implements:** `plan.md` → Unsaved indicator, Changes list and Remove.

- [x] **S1 – "Unsaved changes" in the top bar (AC3)**
  The top bar shows "Unsaved changes" next to Save whenever the draft differs from the last save. It reads the same dirty flag that already enables Save, so the text and the button always agree.
  **Verify:**
  1. With `pnpm dev` running, click "Try a sample": no "Unsaved changes", and Save is disabled.
  2. Hide the cookie banner: "Unsaved changes" appears and Save is enabled (AC3).
  3. Click Save: the "Saved" toast appears, and both "Unsaved changes" and the enabled Save are gone (AC3).
  4. Turn the banner's Hide off: "Unsaved changes" is back, because the page now differs from what was saved.
  5. `pnpm e2e` passes. The save test from T01 also checks that "Unsaved changes" appears after the hide and is gone after the save.

- [x] **S2 – Each change in the list, with a Remove button (AC6, AC7 first half)**
  Each row of "Changes on this page" shows the type, the element's snippet and, for context, the note, plus a Remove button. Remove calls a new store action, `removeModification(id)`, which drops just that entry. The last save is left as it was, so the removal shows as unsaved until the publisher saves.
  **Verify:**
  1. Open the demo, hide the cookie banner and add a note to the chart. Press Escape so nothing is selected. The list shows two rows: "Hidden from AI · We use cookies…", and "Context · Customer growth" with the note under it. Each has a Remove button (AC6).
  2. Click Save. Then click Remove on the hide: the banner is no longer drawn faded, the list shows one row, and "Unsaved changes" appears (AC7).
  3. Click Save, then run `sqlite3 apps/api/data/ax.db "select config from page_configs where url = 'sample:demo'"`: the configuration holds only the context note (AC7).
  4. Remove the note and save. Go back to the start screen: the `sample:demo` row says "0 changes".
  5. `pnpm test` passes. New tests check the store:
    - With a hide and a context in the draft, `removeModification` on the hide's id leaves only the context.
    - An unknown id leaves the draft unchanged.
    - After a save, removing a change turns the dirty flag on.
  6. `pnpm e2e` passes. A new test hides the banner, saves, removes the hide from the list, and sees the banner un-faded, the list empty ("No changes yet.") and "Unsaved changes".

- Toasts moved to the bottom center, since at the bottom right they covered the Remove buttons → plan.md §Save button, T01 S1 Verify

**Done when:** every change on the page is listed with its details and can be removed, the preview follows at once, "Unsaved changes" shows exactly when the page differs from the last save, and saving after a remove stores the list without it. `pnpm test`, `typecheck` and `e2e` pass.

---



## T04 – Restore saved changes when a page opens

**Goal:** opening a page, however it's opened, brings back its saved changes on the same elements.

The flow (`plan.md` → How opening a page restores its changes):

1. The page tree loads as before. Its `url` is the normalized address the page is saved under.
2. The editor asks `GET /api/configs/:url` for that page's configuration. Nothing saved means no changes.
3. The saved list fills `modificationsDraft` and the last-saved copy together, so the page opens with its changes and without "Unsaved changes".
4. The loading state stays until all of this is done, so a page never appears without its changes.

For example, the demo is saved with the cookie banner hidden. The publisher goes back to the start screen and clicks the `sample:demo` row: the demo opens with the banner already faded and listed, and Save disabled.

Not in this task (follow-ups): a Retry button on the load error (AC13), and the "Needs attention" group for saved changes that no longer match (AC8, AC12). A change that doesn't match is already never applied, because `markModificationsInTree` refuses a target that doesn't resolve; it just isn't listed yet.

**Implements:** `plan.md` → How opening a page restores its changes, Endpoints (`GET /api/configs/:url`), `ConfigRepository` (`findByUrl`), Restoring on open.

- [x] **S1 – Open a page with its saved changes (AC7 second half, AC10 second half, AC11)**
  The api gets `findByUrl` and `GET /api/configs/:url`, which normalizes the URL and answers with the stored configuration or a 404. The web gets a `useConfig` query, run once the page tree has loaded, and a store action, `loadSavedModifications`, that fills the draft and the last-saved copy together. The editor keeps its loading state until the draft is filled, and a successful save updates the cached configuration, so reopening a page in the same session shows what was just saved.
  **Verify:**
  1. With `pnpm dev` running, open the demo, hide the cookie banner, add a note to the chart and click Save. Go back to the start screen and click the `sample:demo` row: the demo opens with the banner faded, the note under the chart, both listed under "Changes on this page", no "Unsaved changes", and Save disabled (AC10).
  2. Reload the browser and open the demo again with "Try a sample": the same two changes are there.
  3. Remove the hide from the list, click Save, then reopen the demo from the start screen: only the note is there (AC7).
  4. Open `https://example.com`, hide its paragraph (the page's only selectable element) and click Save. Then type `EXAMPLE.com/?utm_source=x#top` in the top bar and click Open: the page opens with the paragraph hidden (AC11).
  5. Open a page with nothing saved, e.g. `https://example.org`: it opens with "No changes yet." and no error.
  6. `pnpm test` passes. New tests check:
    - `GET /api/configs/:url` with `acme.com/pricing/?utm_source=x` returns the configuration saved for `https://acme.com/pricing`, and a URL with nothing saved gets a 404.
    - `loadSavedModifications` fills the draft with the dirty flag off, and `setUrl` clears `restoredPageUrl`, so the next page is restored fresh.
    - The config request reads a 404 as "nothing saved" and a 500 as a failure.
  7. `pnpm e2e` passes. The saved pages test now also checks that the demo opened from its row shows the saved hide: the chart faded and listed, no "Unsaved changes", and Save disabled.

- [x] **S2 – A plain error when the configuration can't be loaded (AC14)**
  If the configuration request fails, the editor shows "Your saved changes couldn't be loaded." in place of the preview and the inspector, so there's nothing to edit and Save stays disabled. A save from a page without its saved changes would overwrite them.
  **Verify:**
  1. In the browser's DevTools, Network tab, block the request URL pattern `*/api/configs/*`, then click "Try a sample": after a few seconds of "Loading…" (the request is retried), "Your saved changes couldn't be loaded." appears, with no preview, no inspector and Save disabled (AC14).
  2. Unblock the pattern, go back to the start screen and click "Try a sample" again: the demo opens with its saved changes.
  3. `pnpm e2e` passes. A new test answers `GET /api/configs/*` with a 500 and sees the message, no preview, no inspector and Save disabled.

- e2e: config loads answer "nothing saved" by default, and every test that saves `sample:demo` lives in one file → plan.md §Tests

**Done when:** opening a page from the Saved pages list, the sample button or a typed equivalent URL restores its saved changes on the same elements, and a configuration that can't be loaded shows a plain error with nothing to edit. `pnpm test`, `typecheck` and `e2e` pass.

---



## Follow-ups

- AC13: add a Retry button to the load error that refetches the configuration (plan.md §Restoring on open).
- AC8, AC12: list saved changes that no longer match under "Needs attention" with a Remove button (plan.md §Needs attention).
- The e2e hover test (`select-inspect.spec.ts` "hovering an element outlines it…") failed once in a full parallel run and passed on re-run; make it stable.

