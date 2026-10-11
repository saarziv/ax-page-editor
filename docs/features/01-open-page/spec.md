# Open a Page – Spec

Get a page on screen, exactly as an agent would fetch it. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, configuration format and trust & safety rules.

---

## What & why

**What:** A focused entry screen whose only job is to get a page open.

```
┌──────────────────────────────────────────────────┐
│  AX Editor                                       │
│                                                  │
│    See your page the way AI agents read it.      │
│    [ https://your-site.com/page         ] [Open] │
│                                                  │
│    Try a sample:  Article · Product · Pricing    │
│    Recent:  example.com/blog/post  · 3 changes   │
└──────────────────────────────────────────────────┘
```

**Why:** The first thing a publisher needs is their own page on screen. Sample pages let anyone (including reviewers) try every feature with no network issues, using pages designed to exercise each modification (a chart, a form, links worth forwarding, a cookie banner). Recent pages make returning to work one click.

## Behavior

**Opening a page**

- The URL bar stays visible in the editor's top bar, so a different page can be opened at any time.
- Opening a URL fetches the page server-side, exactly as an agent would (no JavaScript).
- The URL is normalized (lowercase host, no trailing slash, tracking parameters like `utm_*` removed) and redirects are followed. The final URL is the one shown and the one configurations are saved under.
- While loading, the preview shows a loading state.
- If there is a saved configuration for the URL, it's restored and the change count is shown. (How restored modifications are matched back to elements is defined in the Save & review changes spec.)
- If the editor has unsaved changes, opening another URL or leaving the editor warns first.

**Sample pages**

- Three samples: **Article**, **Product**, **Pricing**.
- Together they contain at least one of each thing worth modifying: a chart or image that needs context, a form, links worth forwarding, a cookie banner or promo worth hiding.
- Samples open with no network access. Their forwardable links point to other sample pages, so forwarding can be tried offline too.

**Recent pages**

- Lists the pages that have a saved configuration, each with its URL and its number of changes.
- Most recently saved first.
- Clicking one opens it, the same as typing its URL.
- When nothing has been saved yet, the "Recent" row is not shown.

## Acceptance criteria

- Given a valid public URL, when the user opens it, then the clean page appears in the preview.
- Given a URL with a saved configuration, when opened, then all its modifications are shown in the preview and changes list.
- Given `example.com/page/?utm_source=x`, when opened, then it resolves to the same configuration as `example.com/page`.
- Given unsaved changes, when the user opens another URL or leaves, then they are warned first.
- Given a URL that redirects, when opened, then the final URL is shown in the URL bar.
- Given a page is loading, then the preview shows a loading state, not the previous page.
- Given a sample is picked, then it opens without any network fetch.
- Given saved configurations exist, then the start screen lists them under "Recent" with their change counts, most recently saved first.
- Given a page whose visible text is nearly empty, when opened, then it opens with the JavaScript banner (see Edge cases), not an error.
- Given any failure in the table below, then the user sees that plain-language message as an on-screen state (not a toast), and no error code.

## Edge cases

Each is a clear, plain-language state, not a toast.

| Case                                    | What the user sees                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid URL / not http(s)               | "That doesn't look like a web address."                                                                                                                             |
| Private or local address                | "This address can't be opened for security reasons."                                                                                                                |
| Not an HTML page (PDF, image, JSON)     | "This link isn't a web page."                                                                                                                                       |
| Too large                               | "This page is too large to load."                                                                                                                                   |
| Timeout / unreachable                   | "The site didn't respond." with Retry                                                                                                                               |
| Page is mostly empty (JavaScript-built) | The page opens, with a banner: "This page is built with JavaScript, so AI agents see almost nothing here. This is what they get." This is a finding, not a failure. |
