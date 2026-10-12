# Forward a Link – Plan

How we build the Forward a link spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- The modification flow (global plan §6.1): a forward is one more entry in `modificationsDraft`, applied by `markModificationsInTree`
- `markModificationsInTree` contract and pipeline (global plan §3.4): this feature owns step 4 (Forward)
- `SafeFetchService` (§4.1), `clean` (§3.2), `estimateTokens` (§3.6), renderers (§3.5), store (§5.1)

## Core

### `markModificationsInTree` step 4: Forward
- Walk forwards in document order.
- Truncate each to 3,000 tokens, ending with a "(truncated)" marker.
- Failed ones become `failed` and leave the plain link.
- The rest are inserted as a `forwarded` node with the forwarded tree's main content, placed by the same rule as context notes (03): right after the link, or after the enclosing paragraph when the link is inside a sentence.
- Depth 1: links inside a `forwarded` node are never forwarded.

### `mainContent(tree)`
Use `main`, else the largest `article`, else `root`. Strip `nav`, `header`, `footer` and `aside` from it.

### Renderer formats
- **Markdown:** `> **Forwarded content from <url>:**` followed by the content as a quoted block.
- **HTML:** `<section data-ax="forwarded" data-source="…"><p><strong>Forwarded content from …:</strong></p>…</section>`

### Forwardability
- Not forwardable: `#anchor`, `mailto:`, `tel:`, `javascript:` → "This link doesn't lead to a page."
- Relative links are already resolved to absolute by `clean`.

## API

| Method | Path | In | Out |
|---|---|---|---|
| POST | `/api/forward` | `{ url }` | `{ url, title, tree (main content), tokens }` |

- SafeFetch → `clean` → `mainContent`. `FetchError` returned as `{ code, message }`.

## Web

- **`useForward(href)`:** one query per forward modification, cached by href for the editing session, so the preview isn't refetched on every edit (P11). Agent View still fetches live.
- **Inspector:** Forward to AI switch (links only), disabled with its reason for links that don't lead to a page.
- **Preview:** a collapsed forwarded block labeled with its source that expands on click, and an error state with the reason when the forward fails.
- **Store action:** `toggleForward(selector, href)`: adds or removes the one `forward` modification; only allowed on links.

## Tests

- `markModificationsInTree`:
  - forward insertion and the depth-1 rule
  - per-link truncation
  - failed forward leaves the link, status `failed`
- `mainContent`: `main` preferred, `article` fallback, chrome stripped.
- Forwardability rules.
- Renderer formats for `forwarded`.
