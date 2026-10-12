# Forward a Link – Plan

How we build the Forward a link spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- The modification flow (global plan §6.1): a forward is one more entry in `modificationsDraft`, applied by `markModificationsInTree`.
- `markModificationsInTree` contract and pipeline (global plan §3.4): this feature owns step 4 (Forward).
- Context placement (03 plan, `markModificationsInTree` step 3): a forward is placed by the same rule as a note, with the same function.
- `PageTreeService.getPageTree` (01): fetch through `SafeFetchService`, `clean`, errors as `FetchError`.
- `renderMarkdown` and Agent View (05), the Hide switch and its store action (03), the tooltip-on-a-wrapper pattern from the View as agent button (05).
- `estimateTokens` (global plan §3.6), session-cached forwards (P11).

## How forwarding works

A forward is stored as a pointer, and the content is fetched and inserted every time the page is shown.

1. **The publisher turns the switch on.** The store adds `{ type: 'forward', target, href }` to `modificationsDraft`. Only the `href` is stored, never the content (K8).
2. **The linked page is fetched.** The editor asks `POST /api/forward` for each distinct forwarded `href`. The api fetches it like any page, cleans it, keeps only its main content, and returns that tree.
3. **`markModificationsInTree` inserts it.** Given the page, the modifications and the fetched forwards, step 4 inserts one `forwarded` node per active forward, at the spot a note on that link would go, truncated to the size limit.
4. **The preview draws it** as a collapsed "Forwarded from <url>" block. **Agent View** does steps 2 and 3 on the server, then `prune` and `renderMarkdown` write it as a quoted block.

Example: the demo's "terms of service" link sits inside a sentence, so its content goes after the whole paragraph:

```
paragraph "Read our terms of service and the guide…"
forwarded (href: https://www.iana.org/help/example-domains)
  ├─ heading "Example Domains"
  └─ paragraph "As described in RFC 2606…"
```

and the agent reads:

```markdown
Read our [terms of service](https://www.iana.org/help/example-domains) and the [guide to web analytics](…) before you subscribe.

> **Forwarded content from https://www.iana.org/help/example-domains:**
>
> # Example Domains
>
> As described in RFC 2606…
```

## Core

### `forwardBlockReason(href, pageUrl)`

Says whether a link can be forwarded: `null` when it leads to a page, or the reason "This link doesn't lead to a page." It leads to a page when its scheme is `http` or `https` and it isn't an anchor on the current page.

The tricky part is the anchor. `clean` resolves every `href` against the page, so `#pricing` on `https://acme.com/` arrives as `https://acme.com/#pricing`, which looks like an ordinary web address. So an anchor is detected by comparing addresses: the `href` has a fragment, and without it, it's the same address as the page. `https://acme.com/terms#refunds` on that page is a different page, so it can be forwarded.

`javascript:` links never reach the inspector, because `clean` unwraps them. They are rejected by the scheme rule anyway.

### `mainContent(root)`

Keeps only what a reader comes for. Takes `main`, else the `article` with the most text, else the root. Then removes every `nav`, `header`, `footer` and `aside` inside it, at any depth (K4). Example: a page of `header, nav, main[h1, p, aside], footer` becomes `main[h1, p]`. It's a deliberate heuristic (P5), so messy pages may keep some chrome.

### `markModificationsInTree`, step 4: Forward

It takes a third argument, the fetched forwards by `href`: `ReadonlyMap<string, Forwarded>` (global plan §3.4). A `href` with neither `tree` nor `error` yet, or missing from the map, is still loading.

- **Which forwards:** the ones steps 1 and 2 left `active`. A forward inside a hidden element is `inactive`, as for any modification (D18).
- **Placement:** the same `notePlacementFor` as context notes (03): after the link, or after its paragraph, list item or table when the link sits inside one. When a note and a forward land on the same spot, the note comes first, because it frames what follows.
- **The node:** `{ id: 'forward:<modificationId>', kind: 'forwarded', tag: 'section', attrs: { forId, href, forwardState } }`, where `forwardState` is `loading`, `loaded` or `failed`. A failed one also carries `errorCode`, the `FetchError` code, so the preview can say why. Only a loaded one has children.
- **Status:** a failed forward's status is `failed`. Its node is still inserted, so the preview can show the reason in place, but it has no content, so the agent reads only the link (K7).
- **One level deep (K5):** the forwarded content's node ids are prefixed with the forward node's id (`forward:m3>main:1>paragraph:2`). Targets are only resolved on the original page, and no saved selector starts with `forward:`, so nothing inside forwarded content can ever be hidden, noted or forwarded. The prefix also stops those ids from colliding with the page's own ids in the preview.
- **Size limit (K6):** see `truncateTree` below.

### `truncateTree(root, maxChars)`

Cuts a tree to about 3,000 tokens: `maxChars` is 12,000 because `estimateTokens` counts 4 characters per token (P9). It walks the tree in reading order, counting the text it keeps. Nodes are kept whole while they fit. The text node where the limit runs out is cut at the last space before the limit, everything after it is dropped, and containers left empty are dropped too. A paragraph "(truncated)" is then added as the last child. A tree under the limit comes back unchanged. Example: a 20,000-character terms page keeps its first ~12,000 characters and ends with "(truncated)".

### Renderer formats

- **Markdown:** a loaded `forwarded` node is a blockquote: `> **Forwarded content from <href>:**`, a blank quoted line, then its content's blocks, each line prefixed with `> `. The `href` is written as is: the schema only accepts absolute http(s) URLs, and escaping it would corrupt it (`a_b` → `a\_b`). The content is page text, so it's escaped like any page text. A `loading` or `failed` node writes nothing.
- **List items and tables:** a forward lands in exactly the spots a note does, so `renderMarkdown` handles it with the note's rules (05 plan, tricky parts). After a list item it's written inside that item, indented. Its own content stays block Markdown, because a forward is never inside a cell: placement moves it after the table.
- **HTML:** `<section data-ax="forwarded" data-source="…"><p><strong>Forwarded content from …:</strong></p>…</section>`, once `renderHtml` exists (future).

## API

### `POST /api/forward`

Body `{ url }`, validated with `@ZodBody`. A `ForwardService` asks `PageTreeService.getPageTree(url)` for the page, so the fetch goes through `SafeFetchService` with every safety check. It returns the same `PageTree` shape with `mainContent` applied to its root. A failure is the usual `FetchError`, sent as `{ code, message }`.

Truncation isn't done here. It's in `markModificationsInTree`, so the editor and Agent View cut at exactly the same place.

### Agent View fetches forwards live

`AgentViewService` gets one step before `markModificationsInTree`: for each distinct `href` among the configuration's forward modifications, it asks `ForwardService`, all in parallel. A `FetchError` becomes that forward's `error`. Any other error is a bug and propagates. There's no cache, so every request reads each page's current content (D9, K8).

## Web

### Forward to AI switch

A `ForwardSwitch` row in the inspector, replacing the disabled "Forward this link" button, built like the Hide switch: label left, shadcn `Switch` right, state read from the draft through `useNodeModifications`.

- **Only for links:** the row is rendered only when the selected node's `kind` is `link` (K1). For any other element there's no row, so nothing can be clicked.
- **Disabled:** when `forwardBlockReason(href, pageUrl)` returns a reason.
- **Tooltip:** shadcn `Tooltip`, with the wrapper trigger from the View as agent button, because a disabled switch gets no hover. Enabled, it says "AI agents get the main content of the linked page, right after this link. Useful because most agents don't follow links." (K9). Disabled, it shows the reason.
- It calls `toggleForward(targetFor(node), href)`.

### Store: `toggleForward(target, href)`

Works like `toggleHide`: the first call adds one `forward` modification with the link's `href`, the next removes it. So a link can never have two forwards.

### `useForwardedPages(modificationsDraft)`

One TanStack query per distinct forwarded `href` (`useQueries`), keyed `['forward', href]` with `staleTime: Infinity`. That's the session cache (P11): editing a note or hiding something never refetches a forward, and turning a forward off and on again reuses it. Its `combine` option builds the `Map<href, Forwarded>` that `useMarkedPage` passes to `markModificationsInTree`. The tricky part is that this map must keep the same identity while nothing changes, or the marked page would be recomputed on every render. `combine` gives that, as long as it isn't an inline function that changes on every render.

A failed query keeps the api's `code` as the forward's `error`. It isn't retried automatically, so a blocked or non-HTML link fails fast.

### Forwarded block in the preview

`PreviewNode` draws a `forwarded` node by its `forwardState`:

- **loading:** a muted block "Loading <href>…".
- **loaded:** a collapsed block labeled "Forwarded from <href>", with a chevron. Clicking it expands it to show the content, drawn by `PreviewNode` as usual (K2). Expanded or not is local React state, since it's UI only.
- **failed:** the same block, labeled "Couldn't forward <href>", with the reason from 01's edge-case messages by `errorCode` (e.g. `BLOCKED` → "This address can't be opened for security reasons.").

Forwarded content can't be selected: `PreviewNode` is told it's inside forwarded content (a React context), and then adds no selection or hover props. Its links don't navigate, like every preview link.

## Tests

- `forwardBlockReason`: `mailto:`, `tel:`, a same-page anchor (`https://acme.com/#pricing` on `https://acme.com/`) are blocked; a page on the same site with a fragment (`https://acme.com/terms#refunds`) and other sites are allowed.
- `mainContent`: `main` preferred, the longest `article` as fallback, the root last; `nav`, `header`, `footer` and `aside` removed at any depth.
- `truncateTree`: under the limit unchanged; over it, cut at a space before 12,000 characters, ends with "(truncated)", empty containers dropped.
- `markModificationsInTree` step 4: a forward in a sentence lands after its paragraph; a note and a forward on one link keep note-then-forward order; loading, loaded and failed states; failed status; inside a hidden element it's `inactive`; forwarded ids are prefixed, so a forward targeting a link inside forwarded content is `unmatched`.
- `renderMarkdown`: a loaded forward's exact quoted block, escaped content, nothing for loading and failed, a forward after a list item written inside the item.
- Store: `toggleForward` adds then removes, never two.
- Api: `/api/forward` on a stubbed page returns only its main content, and a blocked address answers `{ code: 'BLOCKED' }`. Agent View with a saved forward includes the forwarded block, shows only the link when the forward fails, and fetches again on every request.
