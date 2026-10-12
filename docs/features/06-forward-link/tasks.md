# Forward a Link – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Forward to AI switch · Covers: K1, K9, and the "only its `href`" part of K8
- [ ] T02 – Forwarded block in the preview · Covers: K2, K4, K5, and the "stays in the changes list" part of K7
- [ ] T03 – Forwarded content for agents · Covers: K3, K6, the Agent View part of K7, and the "current content" part of K8

**Not covered yet:** the "preview block shows the reason" part of K7. A failed block says only "Couldn't forward <href>" (see Follow-ups).

---

## T01 – Forward to AI switch

**Goal:** when the publisher selects a link, the inspector shows a working **Forward to AI** switch, with a tooltip explaining it. Turning it on records the forward in the draft.

Three rules decide what the publisher sees:

- **Not a link:** no Forward row at all, so there's nothing to click. Example: selecting the chart shows Hide and Context only.
- **A link to a page:** the switch is enabled. Hovering it says "AI agents get the main content of the linked page, right after this link. Useful because most agents don't follow links."
- **A link that doesn't lead to a page** (`mailto:`, `tel:`, an anchor on this page): the switch is disabled, and hovering it says "This link doesn't lead to a page."

Turning the switch on adds `{ type: 'forward', target, href }` to `modificationsDraft`, and turning it off removes it. Nothing is fetched yet, so the preview doesn't change; T02 adds the forwarded block.

S1 builds the switch and its tooltips. S2 makes it add and remove the forward.

**Implements:** `plan.md` → `forwardBlockReason`, Forward to AI switch, Store: `toggleForward`.

- [x] **S1 – The switch appears on links only, with its tooltip (K1, K9)**
  Core gets `forwardBlockReason(href, pageUrl)`, which tells a link to a page apart from one that isn't. The inspector's disabled "Forward this link" button becomes a Forward to AI switch row, shown only for links and disabled with its reason when the link doesn't lead to a page. The demo page gets a `mailto:` link at the end of its footer, so there's a non-page link to try; it goes last so no existing selector shifts.
  **Verify:**
  1. With `pnpm dev` running, click "Try a sample", then click the "Customer growth" chart: the inspector shows Hide from AI and Context for AI, and no Forward row (K1).
  2. Click "terms of service": a "Forward to AI" switch, off and enabled. Hover it: the tooltip says "AI agents get the main content of the linked page, right after this link. Useful because most agents don't follow links." (K9).
  3. Click the new email link in the footer: the switch is disabled. Hover it: the tooltip says "This link doesn't lead to a page." (K1).
  4. `pnpm test` passes. New tests check `forwardBlockReason`:
    - `mailto:hi@acme.com` and `tel:+123` are blocked with "This link doesn't lead to a page."
    - `https://acme.com/#pricing` on the page `https://acme.com/` is blocked, because it's an anchor on this page.
    - `https://acme.com/terms#refunds` on that same page is allowed, because it's another page.
  5. `pnpm e2e` passes. The tests that expected a disabled "Forward this link" button now expect no Forward row on non-links, and an enabled "Forward to AI" switch on "terms of service".

- [x] **S2 – The switch adds and removes the forward in the draft (K8)**
  The store gets `toggleForward(target, href)`, which works like `toggleHide`: the first call adds one forward, the next removes it, so a link can never have two. The switch reads its state from the draft, so a forwarded link shows on when selected again.
  **Verify:**
  1. Open the demo, select "terms of service" and turn Forward to AI on: "Changes on this element" shows "Forwarded: https://www.iana.org/help/example-domains", and Save is enabled.
  2. Turn it off: the change is gone and Save is disabled again.
  3. Turn it on and Save. Run `curl 'localhost:3001/api/configs/sample%3Ademo'`: the modification is `type: "forward"` with its `target` and `href`, and no page content (K8).
  4. Reload the editor and select "terms of service": the switch is on.
  5. `pnpm test` passes. New store tests check that `toggleForward` adds one forward with the given `href`, removes it on the second call, and leaves a hide or note on the same link alone.

**Done when:** links, and only links, show the Forward to AI switch with the right tooltip, it's disabled with its reason for non-page links, and turning it on adds a forward that saves as only its `href`. `pnpm test`, `typecheck` and `e2e` pass.

- Enabled tooltip also says why it helps: "Useful because most agents don't follow links." → spec.md §Behavior, K9

---

## T02 – Forwarded block in the preview

**Goal:** turning Forward on fetches the linked page and shows its main content in the preview, collapsed under "Forwarded from <url>", right where the agent will read it.

The api gets `POST /api/forward`, which fetches the page safely and keeps only its main content (no navigation, header, footer or sidebars). The editor fetches each forwarded link once per session, and `markModificationsInTree` step 4 inserts it after the link, or after its paragraph when the link sits in a sentence. Links inside forwarded content are plain links: they can't be selected or forwarded. If the fetch fails, the block says "Couldn't forward <href>", and the forward stays in the changes list. Saying why it failed is a follow-up.

Example: forwarding "terms of service" on the demo shows, under the paragraph, a collapsed "Forwarded from https://www.iana.org/help/example-domains" that expands to "Example Domains" and its text.

The cut at about 3,000 tokens (`truncateTree`) isn't part of this task. It comes with T03, so the preview may show a long page in full until then. Agent View doesn't fetch anything yet either: it passes no forwards, so its output stays the same until T03.

S1 places the block, S2 builds the endpoint, and S3 connects them.

**Implements:** `plan.md` → `mainContent`, `markModificationsInTree` step 4 (without the size limit), `POST /api/forward`, `useForwardedPages`, Forwarded block in the preview.

- [ ] **S1 – A "Loading…" block appears where the forward goes**
  `markModificationsInTree` gets its third argument, the fetched forwards by `href`, and step 4 inserts one `forwarded` node per active forward, in the spot a note on that link would go. The editor doesn't fetch yet, so it passes an empty map and every forward shows as a muted "Loading <href>…" block. Core already handles all three states (`loading`, `loaded` and `failed`), because the map is just an input and tests can supply it. Clicking the block selects the link, as clicking a note does.
  **Verify:**
  1. Open the demo, select "terms of service" and turn Forward to AI on. "Loading https://www.iana.org/help/example-domains…" appears below the whole "Read our terms of service…" paragraph, not in the middle of the sentence.
  2. Add the context "Our legal terms" to the same link. The note shows above the loading block.
  3. Click the loading block: the inspector shows "terms of service".
  4. Select the "Plans" section and hide it. The loading block disappears, because a forward inside a hidden element is inactive.
  5. `pnpm test` passes. New `markModificationsInTree` tests check:
    - a forward on a link inside a sentence lands after its paragraph, and a note on the same link comes before it
    - an `href` missing from the map gives `loading`, one with a tree gives `loaded` with the content as children, and one with an error gives `failed`, carries its `errorCode`, and has the status `failed`
    - loaded content ids start with `forward:<modificationId>>`, so a forward whose target points inside forwarded content comes back `unmatched`
    - a forward inside a hidden element is `inactive` and inserts nothing

- [x] **S2 – `POST /api/forward` returns the page's main content (K4)**
  Core gets `mainContent(root)`, which keeps `main` (or the longest `article`) and drops every `nav`, `header`, `footer` and `aside` inside it. The api gets `ForwardService` and its controller: they load the page through `PageTreeService`, so every safety check applies, and return it with `mainContent` applied.
  **Verify:**
  1. With `pnpm dev` running, run `curl -s -X POST localhost:3001/api/forward -H 'content-type: application/json' -d '{"url":"https://www.iana.org/help/example-domains"}' | jq '[.. | .kind? // empty] | unique'`. The list has `heading` and `paragraph`, but no `nav`, `header`, `footer` or `aside` (K4).
  2. Run the same command with `https://www.rfc-editor.org/rfc/rfc2606.txt` and drop the `jq` filter. It answers `{"code":"NOT_HTML", …}`.
  3. `pnpm test` passes. New tests check:
    - `mainContent` prefers `main`, then the article with the most text, then the root. `header, nav, main[h1, p, aside], footer` becomes `main[h1, p]`.
    - `/api/forward` on a stubbed page returns only its main content, and a stubbed `BLOCKED` fetch answers `{ code: 'BLOCKED' }`.

- [x] **S3 – The editor fetches each forward and shows it collapsed (K2, K5)**
  `useForwardedPages` asks `/api/forward` once per forwarded `href` in this session, and `useMarkedPage` passes the result to `markModificationsInTree`. The loaded block shows "Forwarded from <href>" with a chevron and expands on click. Nothing inside it can be selected or hovered, and its links are plain links. A failed block says only "Couldn't forward <href>".
  **Verify:**
  1. Forward "terms of service". "Loading…" turns into a collapsed "Forwarded from https://www.iana.org/help/example-domains" (K2).
  2. Click the label. It expands to "Example Domains" and its text, and the inspector shows "terms of service".
  3. Hover the content and click a link inside it. No hover outline appears, and the selection stays on "terms of service" (K5).
  4. With the browser's Network tab open, type in a note and turn the forward off and on. No new `/api/forward` request is sent, because the session cache keeps it.
  5. The expanded block shows only the page's main content, which is what S2's endpoint does (K4). It has "Example Domains" and "Further Reading", but not IANA's site header ("Domains", "Protocols", "Numbers", "About") or its footer ("Root Zone Registry").
  6. Forward "guide to web analytics" and expand it. It shows the Wikipedia article's sections, such as "Basic steps of the web analytics process", but none of Wikipedia's menu or footer ("Main page", "Random article", "Privacy policy").
  7. Forward "Privacy" in the demo footer, a page that doesn't exist. The block says "Couldn't forward https://example.com/privacy", and in the Network tab its `/api/forward` response is `{"code":"UNREACHABLE", …}`, so the api's reason reaches the editor for the follow-up's plain-language message.
  8. `pnpm test` passes. New tests check that a failed `/api/forward` call keeps the api's `code` (`BLOCKED` stays `BLOCKED`), and that a failure without a code becomes `UNREACHABLE`: a non-JSON 502, an unknown code, or our api being down.
  9. `pnpm e2e` passes. A new test stubs `/api/forward` with a small page that contains a link. It checks that the block appears collapsed, expands to the content, and that clicking the link inside keeps "terms of service" selected.

**Done when:** a forwarded link shows its page's main content in the preview, collapsed under "Forwarded from <url>" right where the agent will read it. Its content can't be selected, a failed forward says so and stays in the changes list, and each forward is fetched only once per session. `pnpm test`, `typecheck` and `e2e` pass.

---

## T03 – Forwarded content for agents

**Goal:** Agent View fetches every saved forward live and writes its content after the link as `> **Forwarded content from <url>:**`, cut at about 3,000 tokens with "(truncated)".

Today Agent View already places forwards: `markModificationsInTree` inserts a `forwarded` node for each one, but Agent View passes no fetched pages, so every node is still `loading`, and `renderMarkdown` writes nothing for it. This task fills both gaps. Agent View fetches each forwarded `href` through `ForwardService` on every request, with no cache, so the agent always reads the page's current content (K8). `renderMarkdown` writes a loaded node as a quoted block, and a failed one as nothing, so the agent reads just the link (K7). Last, step 4 cuts long content with `truncateTree`, which the preview gets too, since both use the same `markModificationsInTree`.

Example: with "terms of service" forwarded and saved on the demo, "View as agent" shows the paragraph with its link, then:

```markdown
> **Forwarded content from https://www.iana.org/help/example-domains:**
>
> # Example Domains
>
> As described in RFC 2606…
```

S1 writes the block, S2 handles failed forwards, and S3 adds the size limit.

**Implements:** `plan.md` → Renderer formats, Agent View fetches forwards live, `truncateTree`.

- [ ] **S1 – Agent View writes forwarded content as a quoted block (K3, K8)**
  `renderMarkdown` writes a loaded `forwarded` node as a blockquote headed "**Forwarded content from <href>:**", with its content escaped like any page text and the `href` written as is. `AgentViewService` fetches each distinct forwarded `href` in parallel through `ForwardService` before calling `markModificationsInTree`, so the nodes arrive loaded.
  **Verify:**
  1. With `pnpm dev` running, open the demo, forward "terms of service" and Save. Click "View as agent": after the "Read our terms of service…" paragraph comes "> **Forwarded content from https://www.iana.org/help/example-domains:**", then "> # Example Domains" and its text, each line quoted (K3).
  2. The quoted content has no IANA site header or footer ("Root Zone Registry"), and the link itself is still in the paragraph above.
  3. Reload the Agent View tab: the api log shows the IANA page fetched again, since nothing is cached (K8).
  4. `pnpm test` passes. New tests check:
    - `renderMarkdown` writes a loaded forward as the exact quoted block above, escapes its content (`*sale*` becomes `\*sale\*`), and leaves the `href` alone (`https://a.com/a_b` keeps its `_`)
    - a loading forward writes nothing
    - a forward after a list item is written inside that item, indented under its text
    - Agent View with a saved forward to a stubbed page returns that page's content after the link, and a second request returns the new content after the stubbed page changes

- [ ] **S2 – A failed forward leaves just the link (K7)**
  When `ForwardService` throws a `FetchError`, Agent View passes it as that forward's `error`, so the node is `failed` and writes nothing. Any other error is a bug and still fails the request. The modification stays in the configuration, so it works again once the page is back.
  **Verify:**
  1. Forward "Privacy" in the demo footer (a page that doesn't exist) and Save. "View as agent" returns the page, with "[Privacy](https://example.com/privacy)" in the footer and no "Forwarded content" after it (K7).
  2. Run `curl 'localhost:3001/api/configs/sample%3Ademo'`: the Privacy forward is still saved.
  3. `pnpm test` passes. New Agent View tests check that a forward to a `BLOCKED` stubbed address gives the page with the plain link and no forwarded block, and that an error that isn't a `FetchError` still fails the request.

- [ ] **S3 – Long forwarded content is cut at about 3,000 tokens (K6)**
  Core gets `truncateTree(root, maxChars)`, and `markModificationsInTree` step 4 applies it with 12,000 characters to every loaded forward. Because the cut happens there, the preview and Agent View end at exactly the same word.
  **Verify:**
  1. In the editor, forward "guide to web analytics" (the Wikipedia article, well over 12,000 characters) and expand its block. It ends with a "(truncated)" line, partway through the article.
  2. Save and click "View as agent". The forwarded block ends with "> (truncated)", right after the same words the preview ended with (K6).
  3. "terms of service" is short, so its block in both places ends with the page's last paragraph and no "(truncated)".
  4. `pnpm test` passes. New tests check:
    - `truncateTree` returns a tree under 12,000 characters unchanged
    - a longer one is cut at the last space before the limit, ends with a "(truncated)" paragraph, and drops containers left empty: a section whose text all came after the cut disappears
    - `markModificationsInTree` truncates a long loaded forward, so its `forwarded` node ends with "(truncated)"

**Done when:** Agent View shows each saved forward's current content right after its link as a quoted "Forwarded content from <url>:" block, a failed forward leaves just the link, and long content is cut at about 3,000 tokens with "(truncated)", the same in the preview and for agents. `pnpm test`, `typecheck` and `e2e` pass.

---

## Follow-ups

- A failed forward says why (K7, was T02 S4): the web gets the plain-language message for each fetch error code from 01's edge cases (01 T04 S4 reuses them for page loads), the failed block shows it under "Couldn't forward <href>", and the demo footer gets a last line linking a plain-text page (RFC 2606) as a forward that always fails.
- `modificationStatusSchema` still has `overBudget`, left from the rejected page-wide budget (D10). Nothing sets it, so it can be removed.
