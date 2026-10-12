# Save & Load Configs – Plan

How we build the Save & load configs spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

This plan covers saving (T01) and the Saved pages list (T02). Restoring changes into the editor, the unsaved indicator and the review list are added here when their tasks start.

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
4. **Clicking a row opens that page**, the same way as typing its URL. (Restoring its changes into the editor is a later task.)

Example: after saving the demo with one hide, the list is `[{ url: 'sample:demo', updatedAt: '2026-10-12T09:00:00.000Z', modificationCount: 1 }]`, and the row reads "sample:demo · 1 change · saved just now".

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

- `PUT` uses `@ZodBody(saveConfigRequestSchema)`, so an invalid body never reaches the controller (400 `INVALID_REQUEST`). A URL that `normalizeUrl` refuses is also a 400 `INVALID_REQUEST`.
- `GET` replaces the 01 stub, which always returned `[]`.
- Loading one page's configuration gets its own endpoint (`GET /api/configs/:url`) in a later task.

### `ConfigRepository` (SQLite)

The controller talks to a `ConfigRepository` with two methods: `save(config)` and `listSummaries()`. It hides SQLite, so the controller stays simple and the database could be swapped later (P10).

- **Table:** `page_configs(url TEXT PRIMARY KEY, config TEXT NOT NULL, updated_at TEXT NOT NULL)`. `config` is the whole configuration as JSON. `updated_at` is copied out of it so the list can be sorted without reading every document.
- **`save` replaces, never duplicates (AC2):** it writes with `INSERT … ON CONFLICT(url) DO UPDATE`. `url` is the primary key, so a second row for the same page is impossible.
- **`listSummaries`** reads `url`, `updated_at` and the number of modifications, sorted by `updated_at`, newest first. SQLite counts the modifications itself with `json_array_length(config, '$.modifications')`, so no document is parsed.
- **The database file** is opened from `DB_PATH`, and its folder is created if missing. The table is created on start if it doesn't exist. Tests open an in-memory database (`:memory:`), so they never touch the real file.

## Web

### Save button (T01)

- A **Save** button at the right of the top bar. It calls a TanStack Query mutation, `useSaveConfig()`, with the loaded page tree's `url` (already normalized) and `modificationsDraft`.
- While the request runs the button is disabled, so a double click can't send two saves.
- **Success:** a short "Saved" text next to the button, gone after about 3 seconds. The mutation also refreshes the Saved pages query, so the start screen is up to date.
- **Failure (T01 S2):** "Your changes couldn't be saved. Try again." next to the button, until the next save. Three cases count as a failure, with one message for all of them: the server can't be reached (`fetch` rejects), it answers with an error status, or it doesn't answer within 10 seconds (`AbortSignal.timeout`). Without the timeout, a server that hangs would leave the button disabled forever.

### Saved pages list (T02)

- A `useSavedPages()` query calls `GET /api/configs` and parses the answer with `savedPageSummarySchema`.
- `SavedPages` sits below "Try a sample". Each row is a button: the URL on the first line, "N changes · saved <time ago>" on the second. Clicking it calls `setUrl(summary.url)`, the same action as typing a URL.
- **Time ago** comes from a small helper, `formatSavedAgo(updatedAt, now)`, built on `Intl.RelativeTimeFormat`: "just now" under a minute, then minutes, hours, days ("2 hours ago", "yesterday"). It takes `now` as an argument so tests don't depend on the clock. The change count says "1 change" and "0 changes".
- While loading, nothing is drawn. If the request fails, the section shows "Saved pages couldn't be loaded." and the rest of the start screen works as before (spec, Edge cases).

## Tests

- **Core:** `configSchema` and `saveConfigRequestSchema` reject an unknown type, a missing field, a 301-character note and a repeated id, and accept a valid list.
- **API:** the repository and controller run against an in-memory database. Saving stores a full configuration under the normalized URL; saving the same URL twice leaves one row with the second content; the list is newest first with the right counts.
- **Web:** `formatSavedAgo` for each range, and singular vs plural counts.
- **E2E:** saving the demo shows "Saved"; after a reload, the demo appears in the Saved pages list and clicking it opens the demo. These tests run against the dev's api (`reuseExistingServer`), so they save `sample:demo` into the dev database, replacing any demo configuration saved by hand. That's acceptable for a demo page; a separate test database is a follow-up if it gets in the way.
