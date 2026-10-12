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

### Fetching a real page

**The idea:** `fetchHtml` downloads the page with Node's built-in `fetch`, stopping as soon as one of the global plan's limits (§4.1) is broken, and turns every failure into a `FetchError` code. The page-tree service then cleans the HTML.

Example: `developer.mozilla.org/en-US/docs/Web/HTML/Element/p` answers with a 301 to `.../Reference/Elements/p`. The tree comes back with that article's headings and paragraphs, and its `url` is `https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/p`, the final address.

**Tricky parts:**
- **One timer covers the headers and the body.** A site can answer fast and then send the body a byte at a time, so the 10s limit runs until the last byte is read, not just until the headers arrive.
- **`content-type` is checked before reading the body.** A PDF is refused as `NOT_HTML` without downloading it.
- **The size is counted while reading.** `content-length` may be missing or wrong, so it's only an early exit. The real check counts bytes as they arrive and aborts past 3 MB.
- **Errors map by cause.** Our own timer firing is `TIMEOUT`. A network failure (unknown domain, connection refused) or a non-2xx answer is `UNREACHABLE`. Anything else is a bug and propagates as a 500.
- **`clean` gets the real final address, the tree gets the normalized one.** Relative links must resolve against what the browser would use: on `/docs/`, the link `intro` means `/docs/intro`, but on the normalized `/docs` it would mean `/intro`. The tree's `url` is the normalized one, because that's the key configurations are saved under.
- **Text is decoded with the `charset` from `content-type`**, falling back to UTF-8 when it's missing or unknown.

### Demo page
The demo lives in `/samples/demo.html` and is addressed as `sample:demo`. The endpoint loads it from disk instead of fetching, because SafeFetch would correctly block `localhost`. `normalizeUrl` passes `sample:` through. Its links point to real public URLs.

## Web

- **StartScreen:** URL input + Open, and a "Try a sample" link.
- **Editor shell:** TopBar (URL field + Open), Preview (left), Inspector (right).
- **Preview:** draws the page tree as a plain, readable document. Rules in **Preview rendering** below. 02 extends it into the full preview.
- **Inspector:** the Hide, Context and Forward controls, rendered disabled. 02 connects them to the selection.
- **Loading:** `usePageTree(url)` pending state drives the preview's spinner.
- **Error mapping:** `FetchError.code` → the spec's edge-case messages, shown in the preview panel however the page was opened (start screen, top bar or sample). `TIMEOUT` / `UNREACHABLE` get a Retry button, which refetches. Any other failure (no `{ code }` in the response, or the api unreachable) gets the generic message with Retry. A failed load isn't retried automatically, so the message shows right away and retrying is the user's choice.

### Preview rendering

`clean` already did the hard work on the server: junk is gone, every node has a `kind`, and text is tidy (spaces between a text and a link are kept). So the preview only *draws*, it never cleans or guesses.

**The idea:** one recursive component, `PreviewNode`. It picks an element for the node's `kind`, then renders the node's `text`, or calls itself for each child. The preview calls it once on the root. React escapes all text, so page content never runs as code.

Example: `paragraph[text "Read our ", link "terms", text " before you subscribe."]` becomes `<p>Read our <span>terms</span> before you subscribe.</p>`, one sentence on one line. Only `text` and `link` are inline, which is all it takes to keep sentences whole.

**Straightforward:** each kind becomes the element you'd expect. Headings become `h1`–`h6` by `level`. Paragraphs, lists, quotes and code become `p`, `ul`/`li`, `blockquote` and `pre`. Tables get visible cell borders (header cells are already plain cells, so the header row looks like the rest). Images become `img` with `src`, `alt` and their `width`/`height` when known.

**Deliberate choices** (the preview is for looking, not using):
- **Links are styled spans with the address as a hover title, not `<a href>`.** Clicking can't leave the editor. In 02, a click selects instead.
- **Forms are a plain bordered box, not `<form>`.** Nothing can submit.
- **Fields are drawn by `inputType`.** A checkbox or radio is a small disabled checkbox or radio with its `label` beside it. Any other field shows its `label` above an empty, disabled box. `clean` already dropped values and options.
- **Buttons are `type="button"` with no handler.**
- **Images use `referrerPolicy="no-referrer"`.** Otherwise every preview shows up in the publisher's logs as a visit from the editor.
- **Images are drawn at the size the page gives them, and capped in height.** The page's stylesheets never reach us, so without a size a logo is drawn at its natural size and fills the screen. When the tag itself carries a size (global plan §3.2), the preview uses it. The cap is the fallback for images with no size, and it also keeps a sized image from growing past the panel.
- **Regions (`header`, `nav`, `main`, `aside`, `footer`, `section`, …) are plain `div`s.** Real landmark tags would mix with the editor's own for screen readers. 02 adds visible labels.
- **`annotation` and `forwarded` draw nothing yet.** The `switch` on `kind` is exhaustive, so when 03 and 05 add them, TypeScript points to the spot.

#### Refinements from real pages

Real sites surface things the demo didn't. The preview should still show exactly what an agent gets, but without misleading the publisher. Each refinement fixes either what `clean` keeps (global plan §3.2) or how the preview draws it (above).

Example, from Wikipedia's header:
- `<input type="checkbox" aria-label="Main menu">` used to show as an empty grey text box. It is now the field `{ label: "Main menu", inputType: "checkbox" }`, drawn as a small checkbox labelled "Main menu".
- `<img src="enwiki-25.svg" alt="" aria-hidden="true">` (the globe icon) used to fill the viewport. It is decorative, so it's now dropped.
- `<img alt="Wikipedia" style="width: 8.75em; height: 1.375em">` (the wordmark) is real content, so it stays. It used to be drawn at the SVG's natural size. It now carries `{ width: 140, height: 22 }` and is drawn at about the size it has on the real site.
- `<div>Main menu</div>`, the menu buttons, and `<div>Navigation</div>` used to run together on one line. Each loose text is now its own paragraph, so they sit on separate lines, as in a browser or lynx.
- `<label for="…">Main menu</label>` next to its checkbox used to show "Main menu" twice. The label's text is the field's label already, so it's dropped. The demo's "Work email" and "Company size" had the same problem.

**Reference:** `lynx -dump <url>` reads a page the same way we do (no JavaScript, no CSS, source order, nothing hidden). Our order and line breaks should match it. It prints image alt text and `[ ]` / `(BUTTON)` markers where we draw the real thing.

**How it looks:** a plain document in the editor's own font and colors, the same for every site, because the page's CSS never arrives (D2). A cookie banner that floats on the real site appears as a normal paragraph in its place, because that's where an agent reads it.

## Tests

Unit tests for `clean`, `normalizeUrl` and SafeFetch (DNS mocked). The cases are listed per step in `tasks.md`.
