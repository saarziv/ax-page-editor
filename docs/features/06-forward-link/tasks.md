# Forward a Link – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [ ] T01 – Forward to AI switch · Covers: K1, K9, and the "only its `href`" part of K8
- [ ] T02 – Forwarded block in the preview · Covers: K2, K4, K5, and the preview part of K7
- [ ] T03 – Forwarded content for agents · Covers: K3, K6, the Agent View part of K7, and the "current content" part of K8

---

## T01 – Forward to AI switch

**Goal:** when the publisher selects a link, the inspector shows a working **Forward to AI** switch, with a tooltip explaining it. Turning it on records the forward in the draft.

Three rules decide what the publisher sees:

- **Not a link:** no Forward row at all, so there's nothing to click. Example: selecting the chart shows Hide and Context only.
- **A link to a page:** the switch is enabled. Hovering it says "AI agents get the main content of the linked page, right after this link."
- **A link that doesn't lead to a page** (`mailto:`, `tel:`, an anchor on this page): the switch is disabled, and hovering it says "This link doesn't lead to a page."

Turning the switch on adds `{ type: 'forward', target, href }` to `modificationsDraft`, and turning it off removes it. Nothing is fetched yet, so the preview doesn't change; T02 adds the forwarded block.

S1 builds the switch and its tooltips. S2 makes it add and remove the forward.

**Implements:** `plan.md` → `forwardBlockReason`, Forward to AI switch, Store: `toggleForward`.

- [ ] **S1 – The switch appears on links only, with its tooltip (K1, K9)**
  Core gets `forwardBlockReason(href, pageUrl)`, which tells a link to a page apart from one that isn't. The inspector's disabled "Forward this link" button becomes a Forward to AI switch row, shown only for links and disabled with its reason when the link doesn't lead to a page. The demo page gets a `mailto:` link at the end of its footer, so there's a non-page link to try; it goes last so no existing selector shifts.
  **Verify:**
  1. With `pnpm dev` running, click "Try a sample", then click the "Customer growth" chart: the inspector shows Hide from AI and Context for AI, and no Forward row (K1).
  2. Click "terms of service": a "Forward to AI" switch, off and enabled. Hover it: the tooltip says "AI agents get the main content of the linked page, right after this link." (K9).
  3. Click the new email link in the footer: the switch is disabled. Hover it: the tooltip says "This link doesn't lead to a page." (K1).
  4. `pnpm test` passes. New tests check `forwardBlockReason`:
    - `mailto:hi@acme.com` and `tel:+123` are blocked with "This link doesn't lead to a page."
    - `https://acme.com/#pricing` on the page `https://acme.com/` is blocked, because it's an anchor on this page.
    - `https://acme.com/terms#refunds` on that same page is allowed, because it's another page.
  5. `pnpm e2e` passes. The tests that expected a disabled "Forward this link" button now expect no Forward row on non-links, and an enabled "Forward to AI" switch on "terms of service".

- [ ] **S2 – The switch adds and removes the forward in the draft (K8)**
  The store gets `toggleForward(target, href)`, which works like `toggleHide`: the first call adds one forward, the next removes it, so a link can never have two. The switch reads its state from the draft, so a forwarded link shows on when selected again.
  **Verify:**
  1. Open the demo, select "terms of service" and turn Forward to AI on: "Changes on this element" shows "Forwarded: https://www.iana.org/help/example-domains", and Save is enabled.
  2. Turn it off: the change is gone and Save is disabled again.
  3. Turn it on and Save. Run `curl 'localhost:3001/api/configs/sample%3Ademo'`: the modification is `type: "forward"` with its `target` and `href`, and no page content (K8).
  4. Reload the editor and select "terms of service": the switch is on.
  5. `pnpm test` passes. New store tests check that `toggleForward` adds one forward with the given `href`, removes it on the second call, and leaves a hide or note on the same link alone.

**Done when:** links, and only links, show the Forward to AI switch with the right tooltip, it's disabled with its reason for non-page links, and turning it on adds a forward that saves as only its `href`. `pnpm test`, `typecheck` and `e2e` pass.

---

## T02 – Forwarded block in the preview

**Goal:** turning Forward on fetches the linked page and shows its main content in the preview, collapsed under "Forwarded from <url>", right where the agent will read it.

The api gets `POST /api/forward`, which fetches the page safely and keeps only its main content (no navigation, header, footer or sidebars). The editor fetches each forwarded link once per session, and `markModificationsInTree` step 4 inserts it after the link, or after its paragraph when the link sits in a sentence. Links inside forwarded content are plain links: they can't be selected or forwarded. If the fetch fails, the block says why, and the forward stays in the changes list.

Example: forwarding "terms of service" on the demo shows, under the paragraph, a collapsed "Forwarded from https://www.iana.org/help/example-domains" that expands to "Example Domains" and its text.

Steps are detailed when this task starts.

**Implements:** `plan.md` → `mainContent`, `markModificationsInTree` step 4, `POST /api/forward`, `useForwardedPages`, Forwarded block in the preview.

---

## T03 – Forwarded content for agents

**Goal:** Agent View fetches every saved forward live and writes its content after the link as `> **Forwarded content from <url>:**`, cut at about 3,000 tokens with "(truncated)".

A forward that fails leaves just the link for the agent. Nothing is cached, so the agent always reads the page's current content.

Steps are detailed when this task starts.

**Implements:** `plan.md` → `truncateTree`, Renderer formats, Agent View fetches forwards live.

---

## Follow-ups

- `modificationStatusSchema` still has `overBudget`, left from the rejected page-wide budget (D10). Nothing sets it, so it can be removed.
