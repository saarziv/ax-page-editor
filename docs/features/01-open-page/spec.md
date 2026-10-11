# Open a Page – Spec

Type a URL, click Open, and see the page's clean tree in the editor, fetched exactly as an agent would fetch it. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts and trust & safety rules.

---

## What & why

**What:** A start screen with a URL input, and an editor shell that shows the opened page.

```
Start screen                              Editor
┌───────────────────────────────────┐     ┌────────────────────────────────────────────┐
│  AX Editor                        │     │ [ example.com/pricing      ] [Open]        │
│                                   │     ├──────────────────────────┬─────────────────┤
│  See your page the way AI agents  │     │  Pricing that scales     │  Hide from AI   │
│  read it.                         │ ──▶ │                          │  Context for AI │
│  [ https://your-site.com ] [Open] │     │  Plans start at $9...    │  Forward link   │
│                                   │     │  • Starter  • Pro        │  (coming soon)  │
│  Try a sample                     │     │  Read our terms          │                 │
└───────────────────────────────────┘     └──────────────────────────┴─────────────────┘
```

**Why:** Everything else in the product (selecting, hiding, context, forwarding) works on an opened page. This feature delivers that foundation: a real page, fetched safely, cleaned, and on screen in the editor's layout.

## Behavior

**Opening a page**

- The user types a URL and clicks **Open** (or presses Enter).
- The page is fetched server-side, exactly as an agent would fetch it (no JavaScript), then cleaned into the page tree.
- The URL is normalized: lowercase host, no trailing slash, no fragment, and tracking parameters like `utm_*` removed. Redirects are followed.
- While loading, the preview shows a loading spinner, never the previous page.

**The editor shell**

- **Top bar:** a URL field and an Open button, so another page can be opened at any time.
- **Left panel:** the clean tree rendered as a basic readable page (headings, paragraphs, lists, links, images, tables). Links don't navigate. The full preview (reading layout, landmark labels, modification markers) is built in 02 See & select.
- **Right panel:** the modification controls (Hide from AI, Context for AI, Forward this link), shown as disabled stubs. 02 wires them to the selected element, and 03 and 04 make them work.

**Demo page**

- One bundled demo page, opened from a "Try a sample" link on the start screen, with no network access.
- It contains one of each thing worth modifying: a chart or image that needs context, a form, links worth forwarding, and a cookie banner worth hiding.

## Acceptance criteria

- **AC1** Given a valid public URL, when the user opens it, then its clean tree appears in the left panel.
- **AC2** Given the editor is open, then the right panel shows the Hide, Context and Forward controls, disabled.
- **AC3** Given `example.com/page/?utm_source=x`, when opened, then it normalizes to `example.com/page`.
- **AC4** Given a page is loading, then the preview shows a spinner, not the previous page.
- **AC5** Given the editor is open, when the user enters another URL in the top bar and opens it, then that page replaces the current one.
- **AC6** Given any failure in the table below, then the user sees that plain-language message on screen (not a toast), and no error code.
- **AC7** Given "Try a sample" is clicked, then the demo page opens without any network fetch.

## Edge cases

| Case                                | What the user sees                                         |
| ----------------------------------- | ---------------------------------------------------------- |
| Invalid URL / not http(s)           | "That doesn't look like a web address."                    |
| Private or local address            | "This address can't be opened for security reasons."       |
| Not an HTML page (PDF, image, JSON) | "This link isn't a web page."                              |
| Too large                           | "This page is too large to load."                          |
| Timeout / unreachable / the site answers with an error (404, 500…) | "The site didn't respond." with a Retry button |
| Anything else (our server down or failing) | "Something went wrong loading this page." with a Retry button |

## Out of scope

- Hover, selection, inspector, landmark labels and the Markdown view: 02 See & select.
- Restoring a saved configuration on open, and the unsaved-changes warning: 05 Save & review changes.
- Recent pages list and the "built with JavaScript" banner: follow-ups in `tasks.md`.
