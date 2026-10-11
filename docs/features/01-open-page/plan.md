# Open a Page – Plan

How we build the Open a page spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

First built here (contracts in the global plan):
- Page tree types, zod schemas (§3.1, §3.6–3.7)
- `clean` (§3.2), including `isNearlyEmpty`
- `normalizeUrl` (§3.6)
- `SafeFetchService` (§4.1)
- Error convention `{ code, message }` (§4.3)

## API

| Method | Path | In | Out |
|---|---|---|---|
| POST | `/api/snapshot` | `{ url }` | `PageTree` (url = normalized final URL) |
| GET | `/api/configs` | | `[{ url, updatedAt, count }]` (recent list) |

- **Snapshot:** `normalizeUrl` → SafeFetch (or sample loader) → `clean`. A `FetchError` is returned as `{ code, message }`.
- **Recent list:** reads `ConfigRepository.list()`, ordered by `updatedAt` descending. The repository itself is built in 05; until then, this endpoint returns an empty list.

### Sample pages
Samples live in `/samples` and are addressed as `sample:pricing`, etc. Snapshot loads them from disk instead of fetching, because SafeFetch would correctly block `localhost`. Their forward links point to other `sample:` pages, so every feature works offline. `normalizeUrl` passes `sample:` through.

## Web

- **StartScreen:** URL input, samples, recent configs from `GET /api/configs`, and error states.
- **Error mapping:** `FetchError.code` → the plain-language messages in the spec's edge-case table. Shown as an on-screen state, not a toast. `TIMEOUT` / `UNREACHABLE` get a Retry button.
- **JavaScript banner:** shown when `PageTree.isNearlyEmpty` is true.
- **TopBar URL field:** opens a new page from inside the editor. Unsaved changes are guarded with `beforeunload` and a confirm on URL change (uses `dirty`, global plan §5.1).
- **Loading:** `useSnapshot(url)` pending state drives the preview's loading state.
- **Restore on open:** `useConfig(url)` loads the saved configuration into the store via `load` (matching and statuses are covered in 05).

## Tests

- `clean`: whitelisting, unwrapping, pruning, URL resolution, determinism (clean twice gives an identical tree), `isNearlyEmpty`.
- `normalizeUrl`: tracking params, trailing slash, host case, fragment, query order, `sample:` passthrough (spec AC: `?utm_source=x` resolves to the same configuration).
- SafeFetch (API): blocks private IPs and redirects to them, with DNS mocked; size, timeout and content-type limits.
