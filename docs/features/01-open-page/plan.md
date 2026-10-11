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
- **Preview:** draws the page tree as a plain, readable document. Rules in **Preview rendering** below. 02 extends it into the full preview.
- **Inspector:** the Hide, Context and Forward controls, rendered disabled. 02 connects them to the selection.
- **Loading:** `usePageTree(url)` pending state drives the preview's spinner.
- **Error mapping:** `FetchError.code` → the spec's edge-case messages, shown as an on-screen state. `TIMEOUT` / `UNREACHABLE` get a Retry button, which refetches.

### Preview rendering

`clean` already did the hard work on the server: junk is gone, every node has a `kind`, and text is tidy (spaces between a text and a link are kept). So the preview only *draws*, it never cleans or guesses.

**The idea:** one recursive component, `PreviewNode`. It picks an element for the node's `kind`, then renders the node's `text`, or calls itself for each child. The preview calls it once on the root. React escapes all text, so page content never runs as code.

Example: `paragraph[text "Read our ", link "terms", text " before you subscribe."]` becomes `<p>Read our <span>terms</span> before you subscribe.</p>`, one sentence on one line. Only `text` and `link` are inline, which is all it takes to keep sentences whole.

**Straightforward:** each kind becomes the element you'd expect. Headings become `h1`–`h6` by `level`. Paragraphs, lists, quotes and code become `p`, `ul`/`li`, `blockquote` and `pre`. Tables get visible cell borders (header cells are already plain cells, so the header row looks like the rest). Images become `img` with `src` and `alt`.

**Deliberate choices** (the preview is for looking, not using):
- **Links are styled spans with the address as a hover title, not `<a href>`.** Clicking can't leave the editor. In 02, a click selects instead.
- **Forms are a plain bordered box, not `<form>`.** Nothing can submit.
- **Fields show their `label` above an empty, disabled box.** `clean` already dropped values and options.
- **Buttons are `type="button"` with no handler.**
- **Images use `referrerPolicy="no-referrer"`.** Otherwise every preview shows up in the publisher's logs as a visit from the editor.
- **Regions (`header`, `nav`, `main`, `aside`, `footer`, `section`, …) are plain `div`s.** Real landmark tags would mix with the editor's own for screen readers. 02 adds visible labels.
- **`annotation` and `forwarded` draw nothing yet.** The `switch` on `kind` is exhaustive, so when 03 and 04 add them, TypeScript points to the spot.

**How it looks:** a plain document in the editor's own font and colors, the same for every site, because the page's CSS never arrives (D2). A cookie banner that floats on the real site appears as a normal paragraph in its place, because that's where an agent reads it.

## Tests

Unit tests for `clean`, `normalizeUrl` and SafeFetch (DNS mocked). The cases are listed per step in `tasks.md`.
