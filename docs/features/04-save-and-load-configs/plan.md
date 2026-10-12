# Save & Load Configs – Plan

How we build the Save & load configs spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

This plan covers saving (T01), the Saved pages list (T02), the unsaved indicator with the review list (T03), and restoring saved changes when a page opens (T04). The load-failure Retry and the "Needs attention" group are follow-ups; their sections below describe how they'll be built.

---

## Builds on

- How saving and loading fit the modification flow (global plan §6.1, step 5).
- `modificationSchema` and `normalizeUrl` from core (global plan §3.6–3.7).
- `@ZodBody` and the `{ code, message }` error shape (global plan §4.3).
- The `DB_PATH` env variable and the `GET /api/configs` stub from 01.
- First built here: `configSchema`, the SQLite `ConfigRepository`, and the configs endpoints.

## How saving works

1. **The publisher clicks Save.** The top bar's Save button sends the page's URL and `modificationsDraft` to the server.
2. **The server checks it.** The request is validated against core's schemas. Anything invalid is rejected with a 400 and nothing is stored.
3. **The server builds the configuration.** It normalizes the URL, adds `version: 1` and the current time as `updatedAt`, and stores the result as one row per URL. Saving the same URL again overwrites that row.
4. **The editor confirms.** On success the top bar shows "Saved" for a few seconds. On any failure it shows "Your changes couldn't be saved. Try again." The draft is never touched by saving, so nothing is lost.

Example: on the demo page, the publisher hides the cookie banner and clicks Save.
- The request is `PUT /api/configs` with `{ url: 'sample:demo', modifications: [{ id: 'a1', type: 'hide', target: { selector: 'aside:1', text: 'We use cookies…' } }] }`.
- The stored row is `url = 'sample:demo'`, with `config` holding `{ version: 1, url: 'sample:demo', updatedAt: '2026-10-12T09:00:00.000Z', modifications: [ …the same hide… ] }`.
- The response is that configuration.

**Why the server sets `version`, `url` and `updatedAt`, not the browser:** the browser's clock can be wrong, and the Saved pages list is sorted by `updatedAt`, so one clock (the server's) decides the order. Normalizing on the server too means any client that saves gets the same key, so `acme.com/pricing/?utm_source=x` and `acme.com/pricing` always share one row.

## How the Saved pages list works

1. **The start screen asks for the list.** It calls `GET /api/configs`.
2. **The server returns one short summary per saved page**, newest first: `{ url, updatedAt, modificationCount }`. It doesn't send whole configurations, because the list only needs these three things.
3. **The start screen draws one row per summary**, below "Try a sample": the URL, then "3 changes · saved 2 hours ago". The section isn't drawn when the list is empty.
4. **Clicking a row opens that page**, the same way as typing its URL, so its changes are restored like on any open (How opening a page restores its changes, below).

Example: after saving the demo with one hide, the list is `[{ url: 'sample:demo', updatedAt: '2026-10-12T09:00:00.000Z', modificationCount: 1 }]`, and the row reads "sample:demo · 1 change · saved just now".

## How reviewing and removing works

1. **The list shows every change.** With nothing selected, "Changes on this page" in the inspector lists every entry of `modificationsDraft`, in the order they were made. Each row says the type in plain words, the element's text snippet, and for a context change, the note.
2. **Remove drops one entry.** Each row has a Remove button that calls `removeModification(id)`. The entry leaves `modificationsDraft`, so the preview and the list redraw by themselves (global plan §6.1, step 2).
3. **The top bar notices.** The draft now differs from the last save, so the dirty flag turns on and "Unsaved changes" appears next to Save. Saving stores the list without that entry.

Example: the demo is saved with a hide on the cookie banner and a note on the chart. The publisher clicks Remove on "Hidden from AI · We use cookies…".
- `modificationsDraft` goes from `[a1 (hide), b2 (context)]` to `[b2 (context)]`.
- The banner is no longer drawn faded, the list shows one row, and the top bar shows "Unsaved changes".
- After Save, the stored row's `modifications` holds only `b2`, and the Saved pages row says "1 change".

**Why Remove works by id, not by target:** the list already holds the exact entry, and ids are unique within a configuration (Core, below), so removing by id can never take a different change with it.

## How opening a page restores its changes

1. **The page loads first.** The editor asks for the page tree as before (01). The tree's `url` is the normalized address, after redirects, which is exactly the key Save stores under.
2. **Then its configuration.** With the tree in hand, the editor calls `GET /api/configs/:url` with that `url`. The server answers with the stored configuration, or a 404 when nothing is saved, which the editor reads as "no changes".
3. **The draft is filled once.** The store's `loadSavedModifications(pageUrl, modifications)` puts the saved list into `modificationsDraft` and into `savedJson`, so the page opens with its changes and no "Unsaved changes". From here, the preview and the list redraw by themselves (global plan §6.1, steps 2–3).
4. **Nothing shows until then.** The loading state stays until the page and its configuration are both loaded and the draft is filled, so a page never appears without its changes. If the configuration can't be loaded, the editor shows "Your saved changes couldn't be loaded." (and later a Retry button, a follow-up), and neither the preview nor the inspector, so there's nothing to edit.
5. **Changes that no longer match are kept, not applied.** `markModificationsInTree` already marks a modification `unmatched` when its target doesn't resolve (global plan §3.3–3.4). The changes list puts those under "Needs attention". They stay in the draft, so the next save keeps them until the publisher removes them.

Example: `sample:demo` was saved with a hide on the cookie banner (`a1`, target `aside:1` + "We use cookies…") and a hide on an old promo (`c3`, target `aside:1` + "Old promo"). The publisher types `sample:demo` and opens it.
- `GET /api/configs/sample%3Ademo` returns both, and the draft becomes `[a1, c3]`, with no "Unsaved changes".
- `a1` resolves, so the banner is drawn faded. `c3`'s selector exists, but its text is now "We use cookies…", so it resolves to nothing and is `unmatched`: nothing else is hidden.
- The list shows "Hidden from AI · We use cookies…" as a change, and under "Needs attention", "Hidden from AI · Old promo" with "Not found on this page" and a Remove button.

**Why the configuration is loaded after the page, not alongside it:** the page tree's `url` is the one Save uses, after normalizing and following redirects. Loading by that same `url` means a page is always loaded from the key it's saved under. Loading in parallel by the typed URL would miss the configuration whenever the page redirects. It costs one short request after the page arrives.

**Why the store remembers which page the draft was restored for (`restoredPageUrl`):** filling the draft is a one-time step per opened page. Without that marker, a second render (React's StrictMode, or the query delivering the same data again) would fill it again and wipe the edits made since. `setUrl` clears the marker, so opening any page, even the same one again, restores it fresh.

## Core

### `configSchema` and `saveConfigRequestSchema`

- `configSchema` is the stored document from global plan §3.7: `version` (always 1), `url`, `updatedAt` (an ISO date), and `modifications`. It's the single source of the `Config` type.
- `saveConfigRequestSchema` is what Save sends: `{ url, modifications }`. Both use `modificationSchema`, so unknown types, missing fields and notes over 300 characters are rejected by the same rules in both (AC5).
- **Ids must be unique** within one configuration: the editor removes a modification by its id, so two with the same id would be removed together. Both schemas refuse a list with a repeated id.
- `savedPageSummarySchema` is one row of the Saved pages list: `{ url, updatedAt, modificationCount }`. It lives in core because the api returns it and the web parses it.

## API

### Endpoints

| Method | Path | In | Out |
|---|---|---|---|
| PUT | `/api/configs` | `{ url, modifications }` | the stored `Config` |
| GET | `/api/configs` | | `SavedPageSummary[]`, newest first |
| GET | `/api/configs/:url` | the page URL, URI-encoded | the stored `Config`, or 404 `{ code: 'NOT_FOUND' }` |

- `PUT` uses `@ZodBody(saveConfigRequestSchema)`, so an invalid body never reaches the controller (400 `INVALID_REQUEST`). A URL that `normalizeUrl` refuses is also a 400 `INVALID_REQUEST`.
- `GET` replaces the 01 stub, which always returned `[]`.
- `GET /api/configs/:url` normalizes the URL like `PUT` does, so `acme.com/pricing/?utm_source=x` finds the configuration saved for `https://acme.com/pricing` whatever the client sends (AC11). A URL that `normalizeUrl` refuses is a 400 `INVALID_REQUEST`.

### `ConfigRepository` (SQLite)

The controller talks to a `ConfigRepository` with three methods: `save(config)`, `listSummaries()` and `findByUrl(url)`. It hides SQLite, so the controller stays simple and the database could be swapped later (P10).

- **Table:** `page_configs(url TEXT PRIMARY KEY, config TEXT NOT NULL, updated_at TEXT NOT NULL)`. `config` is the whole configuration as JSON. `updated_at` is copied out of it so the list can be sorted without reading every document.
- **`save` replaces, never duplicates (AC2):** it writes with `INSERT … ON CONFLICT(url) DO UPDATE`. `url` is the primary key, so a second row for the same page is impossible.
- **`listSummaries`** reads `url`, `updated_at` and the number of modifications, sorted by `updated_at`, newest first. SQLite counts the modifications itself with `json_array_length(config, '$.modifications')`, so no document is parsed.
- **`findByUrl`** returns the stored configuration for one URL, or `null`. It parses the row with `configSchema` before returning it (global plan §7, validation on read), so a damaged row fails the request instead of reaching the editor.
- **The database file** is opened from `DB_PATH`, and its folder is created if missing. The table is created on start if it doesn't exist. Tests open an in-memory database (`:memory:`), so they never touch the real file.

## Web

### Save button (T01)

- A **Save** button at the right of the top bar. It calls a TanStack Query mutation, `useSaveConfig()`, with the loaded page tree's `url` (already normalized) and `modificationsDraft`.
- **Enabled only when there's something to save:** when the draft differs from the last saved copy (the dirty flag, global plan §5.1). On success, `markSaved` records the modifications that were *sent*, not the current draft, so an edit made while the save ran still counts as unsaved. Opening another page resets the saved copy to "nothing saved". It's also disabled while a request runs, so a double click can't send two saves.
- **Results are toasts** (`sonner`, bottom center), not text next to the button. Bottom center sits over the preview, which scrolls; on the right a toast would cover the Changes list pinned to the inspector's bottom, and the error toast stays until the next save. Both outcomes share one toast id, so a new save's result replaces the previous one instead of stacking.
- **Success:** a "Saved" toast, gone after about 3 seconds. The mutation also refreshes the Saved pages query, so the start screen is up to date.
- **Failure (T01 S2):** a "Your changes couldn't be saved. Try again." toast that stays until the next save or until it's closed. The draft is still dirty, so Save stays enabled for the retry. Three cases count as a failure, with one message for all of them: the server can't be reached (`fetch` rejects), it answers with an error status, or it doesn't answer within 10 seconds (an `AbortController` aborted by a timer). Without the timeout, a server that hangs would leave the button disabled forever.

### Unsaved indicator (T03)

- The top bar shows "Unsaved changes" next to Save whenever `hasUnsavedChanges` is true, the same dirty flag that enables Save. It's derived, never stored, so the button and the text can't disagree.
- **The comparison includes ids.** Turning a hide off and on again creates a new id, so it counts as an unsaved change even though the page looks the same. That's accepted: the next save simply stores the new id, and comparing without ids would need a second, looser equality for a rare case.

### Changes list and Remove (T03)

- `PageChanges` keeps reading `modificationsDraft`. Each row shows `MODIFICATION_LABELS[type]`, then the target's text snippet, and for context, the note on its own line. Long text is cut to one line, with the full text in a tooltip.
- Each row has a Remove button (an ✕ icon) labelled for screen readers with what it removes, for example "Remove Hidden from AI: We use cookies…", so the buttons can be told apart.
- **`removeModification(id)`** is a new store action that drops the entry with that id. It doesn't touch `savedJson`, so the change shows as unsaved until the next save.
- Changes inside a hidden element are listed like any other (spec, Out of scope).

### Restoring on open (T04)

- A `useConfig(pageUrl)` query calls `GET /api/configs/:url` once the page tree has loaded, and parses the answer with `configSchema`. A 404 becomes `null` (nothing saved); any other failure is an error. It uses the same 10-second timeout as Save, so a hanging server ends in the load error, not an endless loading state.
- **The cache must match what's stored.** The query never refetches by itself (`staleTime: Infinity`), because a refetch could replace the draft under the publisher's edits. So a successful save writes the returned configuration into this query's cache. Without that, going back to the start screen and reopening the page would restore the configuration from before the save.
- The editor calls `loadSavedModifications` when the configuration arrives and `restoredPageUrl` isn't this page yet. It draws the preview and the inspector only once `restoredPageUrl` equals the page tree's `url`.
- **Retry** refetches the configuration query. The rest of the editor stays as it is; the page tree isn't fetched again.

### Needs attention (T04)

- `PageChanges` reads `status` from `useMarkedPage()` (03) and splits the draft in two: every modification that isn't `unmatched` stays in "Changes on this page" as before, and the `unmatched` ones go under a "Needs attention" heading, with "Not found on this page" under it. The group isn't drawn when it's empty.
- Rows in both groups are the same component with the same Remove button. Removing an unmatched change works like any other (`removeModification(id)`), and the next save drops it.
- The draft's order is kept inside each group, so a restored list reads in the order the changes were made.

### Saved pages list (T02)

- A `useSavedPages()` query calls `GET /api/configs` and parses the answer with `savedPageSummarySchema`.
- `SavedPages` sits below "Try a sample". Each row is a button: the URL on the first line, "N changes · saved <time ago>" on the second. Clicking it calls `setUrl(summary.url)`, the same action as typing a URL.
- **Time ago** comes from a small helper, `formatSavedAgo(updatedAt, now)`, built on `Intl.RelativeTimeFormat`: "just now" under a minute, then minutes, hours, days ("2 hours ago", "yesterday"). It takes `now` as an argument so tests don't depend on the clock. The change count says "1 change" and "0 changes".
- While loading, nothing is drawn. If the request fails, the section shows "Saved pages couldn't be loaded." and the rest of the start screen works as before (spec, Edge cases).

## Tests

- **Core:** nothing new for restoring: `resolve` and the `unmatched` status are already tested (02, 03).
- **Core:** `configSchema` and `saveConfigRequestSchema` reject an unknown type, a missing field, a 301-character note and a repeated id, and accept a valid list.
- **API:** the repository and controller run against an in-memory database. Saving stores a full configuration under the normalized URL; saving the same URL twice leaves one row with the second content; the list is newest first with the right counts. `GET /api/configs/:url` returns a saved configuration for an equivalent URL (tracking parameter, trailing slash), and 404 for a URL with nothing saved.
- **Web:** `formatSavedAgo` for each range, and singular vs plural counts. `removeModification` drops only the entry with that id, and the dirty flag turns on after a remove and off once that draft is saved. `loadSavedModifications` fills the draft with the dirty flag off, and `setUrl` clears `restoredPageUrl`. The config request reads a 404 as `null` and a 500 as a failure.
- **E2E:** removing a change from the list un-fades the element and shows "Unsaved changes"; saving the demo shows "Saved"; after a reload, the demo appears in the Saved pages list and clicking it opens the demo with its changes; a saved change that no longer matches is listed under "Needs attention"; a blocked config request shows the load error, and Retry recovers. These tests run against the dev's api (`reuseExistingServer`), so they save `sample:demo` into the dev database, replacing any demo configuration saved by hand. That's acceptable for a demo page; a separate test database is a follow-up if it gets in the way. Because pages restore their saved changes, a shared fixture answers every config load with "nothing saved" by default, so each test opens a clean demo; tests that check restoring turn it off. All tests that save `sample:demo` live in one file, because files run in parallel and a save from another file could land between a test's save and its check.
