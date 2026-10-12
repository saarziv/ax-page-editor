# Forward a Link – Spec

Turn a link into the content it points to, so an agent gets the answer instead of a pointer. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, agent output format, configuration format and trust & safety rules.

Applied from the inspector on a selected link (02). This feature replaces the Forward stub from 03.

All ACs are **Key** (must ship).

---

## What & why

**What:** For a selected link, the server fetches the page it points to and shows its main content inline, right where the agent reads the link.

**Why:** Most agents don't follow links or run JavaScript. "See our refund policy" is a dead end to them. Forwarding turns the pointer into the answer.

**Example:** forwarding `<a href="https://acme.com/terms">terms of service</a>` gives the agent:

```markdown
Full details in our [terms of service](https://acme.com/terms).

> **Forwarded content from https://acme.com/terms:**
>
> 1. Subscriptions renew monthly...
> 2. Refunds are available within 30 days...
```

## Behavior

- A **Forward to AI** switch in the inspector, **only for links**. It's disabled for links that don't lead to a page (`#anchor`, `mailto:`, `tel:`, `javascript:`), with the reason "This link doesn't lead to a page."
- Turning it on fetches the linked page the same way a page is loaded: server-side, no JavaScript, same safety checks.
- Only the page's **main content** is kept: navigation, header, footer and sidebars are dropped.
- **Placement** follows the context rule (03): right after the link, or after the enclosing paragraph when the link sits inside a sentence. The link itself stays.
- In the **preview**, the content appears there as a collapsed block labeled "Forwarded from <url>". Clicking it expands it.
- **One level deep:** links inside forwarded content are never forwarded.
- **Size limit:** at most about 3,000 tokens per forward (≈ 12,000 characters). Longer content is cut there and ends with "(truncated)". There's no page-wide budget (D10).
- **Always live:** the configuration stores only the link's `href`, never the content. Agent View fetches it on every request (D9).
- **If the fetch fails** (timeout, not HTML, blocked address, too large), the preview block shows the plain-language reason, the agent output keeps just the link, and the modification is kept so it can work later.

## Key acceptance criteria

- **K1.** Given a non-link element is selected, then there is no Forward control. Given a `mailto:`, `tel:`, `#anchor` or `javascript:` link, then the control is disabled with "This link doesn't lead to a page."
- **K2.** Given a link to a public page, when the user turns Forward on, then the preview shows a "Forwarded from <url>" block in place, and it expands to show the page's main content.
- **K3.** Given a forwarded link, then Agent View shows the link followed by "Forwarded content from <url>:" and the content, placed as in the example.
- **K4.** Given a forwarded page with navigation and a footer, then neither appears in the forwarded content.
- **K5.** Given forwarded content that contains links, then those links appear as plain links and are never forwarded.
- **K6.** Given a forwarded page longer than 3,000 tokens, then the content is cut at about 3,000 tokens and ends with "(truncated)".
- **K7.** Given a forward whose page fails to load, then the preview block shows the reason, Agent View shows the plain link only, and the forward stays in the changes list.
- **K8.** Given a saved forward, then the configuration holds only its `href`, and Agent View shows the page's current content.

## Out of scope

- A page-wide forward budget (D10).
- Forwarding only part of a page (a section, a heading, a `#fragment`).
- Blocking forwards to the current page.
- Showing the forwarded size or token count.
- Forwarding inside a hidden element (D18).
