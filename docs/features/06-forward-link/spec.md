# Forward a Link – Spec

Turn a link into the content it points to, so an agent gets the answer instead of a pointer. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, agent output format, configuration format and trust & safety rules.

Applied from the inspector on a selected link (see the See, select & inspect spec).

---

## What & why

**What:** For a selected link, fetch the page it points to (server-side) and include its main content inline, right after the link.

**Why:** Agents don't follow links. "See our refund policy" is a dead end to them. Forwarding turns the pointer into the actual answer.

## Behavior

- "Forward this link" appears **only for links**.
- On forward, the editor fetches the linked page (same rules as loading a page: no JavaScript, same safety checks), extracts its **main content** (no nav, footer, ads), cleans it, and shows it under the link in the preview as a collapsible block with its source URL and approximate size.
- In the **agent output**, the content is inserted right after the link, as a labeled section: `Forwarded content from <url>:`, then the content. The link itself is kept.
- Forwarding goes **one level deep only**: links inside forwarded content are never forwarded.
- The configuration stores **only the link destination**, never the fetched content, so agents always get current content.
- The approximate size is shown because every forward adds to what the agent must read; forwarding many long pages dilutes the main content.
- Within one editing session, a forwarded page may be reused instead of refetched on every edit. Agent View always fetches live (see the Agent View spec).

**Size limits**

- **Per link: 3,000 tokens.** Longer forwarded content is truncated to the limit and ends with a visible "(truncated)" marker.
- **Per page: 10,000 tokens** across all forwards. Forwards are added in page order (top to bottom) until the budget is used. A forward that doesn't fit is **not added**: its link stays a plain link, and the forward is flagged as **over budget** in the changes list (see the Save & load configs spec). The modification is kept.
- The inspector shows the remaining page budget next to the Forward control.
- Tokens are estimated (about 4 characters per token).

## Acceptance criteria

- Given a link to a public HTML page, when forwarded, then its main content appears under the link in both preview and agent output, labeled with its source.
- Given a non-link element is selected, then the forward control is not shown.
- Given forwarded content contains links, then none of them are forwarded.
- Given a forwarded page longer than 3,000 tokens, then only the first 3,000 tokens are included, followed by "(truncated)".
- Given forwards that together exceed 10,000 tokens, then the earlier ones (in page order) are included, the later ones are left as plain links, and those are flagged as over budget.
- Given a forwarded link, then the saved configuration contains only its destination (`href`), never the fetched content.
- Given a forwarded page with navigation and footer, then only its main content is included.
- Given a link to `#anchor`, `mailto:`, `tel:` or `javascript:`, then the Forward control is disabled with the reason "This link doesn't lead to a page."
- Given a link to the current page, then the Forward control is disabled with the reason "This link points to the current page."
- Given a forward whose target fails to load, then the forward block in the preview shows the plain-language reason, the agent output keeps the link as is, and the modification is kept.
- Given a relative link, when forwarded, then it is resolved against the page URL and that full URL is fetched and stored.
- Given a link is selected, then the inspector shows the remaining page budget next to the Forward control.

## Edge cases

| Case                                                                          | Behavior                                                                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Link is not forwardable (`#anchor`, `mailto:`, `tel:`, `javascript:`)         | Control disabled with reason: "This link doesn't lead to a page."                                                                   |
| Link points to the page itself                                                | Disabled: "This link points to the current page."                                                                                   |
| Target fails (timeout, not HTML, too large, blocked address, JavaScript-only) | Shown in the forward block with the reason. In agent output the link is left as is. The modification is kept, so it can work later. |
| Relative link                                                                 | Resolved to a full URL before fetching.                                                                                             |
