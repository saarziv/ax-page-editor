# Agent View – Plan

How we build the Agent View spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- `SafeFetchService` (global plan §4.1), `clean` (§3.2), `normalizeUrl` (§3.6)
- `transform` (§3.4), `renderMarkdown` / `renderHtml` (§3.5)
- `ConfigRepository` (05), `mainContent` (04)
- No caching (§4.3)

## API

| Method | Path | In | Out |
|---|---|---|---|
| GET | `/agentView?url=&format=md\|html` | | `text/markdown` or `text/html` |

Flow:
1. `normalizeUrl`, then SafeFetch, then `clean`
2. load the config (none → return the clean page unmodified)
3. fetch all forward hrefs in parallel (each through SafeFetch, `mainContent`)
4. `transform`, then `renderMarkdown` or `renderHtml`
5. Skipped modifications are reported in the `X-AX-Skipped` header as JSON `[{ id, reason }]`, where `reason` is the `transform` status (`unmatched`, `overBudget`, `failed`).

- If the page itself fails to load, return `{ code, message }` with an error status, not an empty page.

## Tests

- Agent View on the demo page (API): applied output plus the skipped header.
- No configuration → clean page.
- `format=html` returns HTML with the same content.
- E2E flow 2 (global plan §7): save, reload; the modifications are restored, and Agent View returns the same Markdown as the editor.
