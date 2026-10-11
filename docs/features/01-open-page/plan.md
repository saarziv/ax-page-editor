# Open a Page – Plan

How we build the Open a page spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

First built here (contracts in the global plan):
- Page tree types, zod schemas (§3.1, §3.6–3.7)
- `clean` (§3.2)
- `normalizeUrl` (§3.6)
- `SafeFetchService` (§4.1)
- Error convention `{ code, message }` (§4.3)

## API

| Method | Path | In | Out |
|---|---|---|---|
| POST | `/api/page-tree` | `{ url }` | `PageTree` (url = normalized final URL) |

- **Page tree:** `normalizeUrl` → SafeFetch (or the demo loader) → `clean`. A `FetchError` is returned as `{ code, message }`.

### Demo page
The demo lives in `/samples/demo.html` and is addressed as `sample:demo`. The endpoint loads it from disk instead of fetching, because SafeFetch would correctly block `localhost`. `normalizeUrl` passes `sample:` through. Its links point to real public URLs.

## Web

- **StartScreen:** URL input + Open, a "Try a sample" link, and the error state.
- **Editor shell:** TopBar (URL field + Open), Preview (left), Inspector (right).
- **Preview:** a basic recursive React renderer, one element per `PageNode.kind`. Links render without navigation. 02 extends it into the full preview.
- **Inspector:** the Hide, Context and Forward controls, rendered disabled. 02 connects them to the selection.
- **Loading:** `usePageTree(url)` pending state drives the preview's spinner.
- **Error mapping:** `FetchError.code` → the spec's edge-case messages, shown as an on-screen state. `TIMEOUT` / `UNREACHABLE` get a Retry button, which refetches.

## Tests

- `clean`: whitelisting, unwrapping, pruning, URL resolution, determinism (clean twice gives an identical tree).
- `normalizeUrl`: tracking params, trailing slash, host case, fragment, query order, `sample:` passthrough (spec AC: `?utm_source=x`).
- SafeFetch (API): blocks private IPs and redirects to them, with DNS mocked; size, timeout and content-type limits.
