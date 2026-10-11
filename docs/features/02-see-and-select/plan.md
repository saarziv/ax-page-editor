# See & Select the Page – Plan

How we build the See & select spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- Page tree and `kind` (global plan §3.1)
- Store shape and derived values (§5.1), Preview vs Markdown rule (§5.2)
- `transform` contract (§3.4); until 03/04 add steps, it returns the tree unchanged

First built here:
- `renderMarkdown` and `renderHtml` generic walk (§3.5)

## Core

- **`renderMarkdown(tree)`:** walk headings, paragraphs, lists, tables, links, images, quotes, code. Text is escaped for Markdown.
- **`renderHtml(tree)`:** semantic HTML, everything text-escaped.
- **Plain-language label** per `kind` ("Heading", "Paragraph", "Link", ...), shared by hover label and inspector.

## Web

- **TopBar:** URL field (01), Page/Markdown toggle, change count (opens the changes list, 05), and Save with a dirty dot (05).
- **Preview:** a recursive `PreviewNode` renders the original tree by `kind`, overlaying the draft status:
  - hover outline and label, a selected ring, and click-to-select via `stopPropagation`
  - landmark sections (`header`, `nav`, `main`, `footer`, `aside`) shown as labeled regions
  - no `dangerouslySetInnerHTML` anywhere
  - markers for hidden, context and forwarded are added by 03 and 04
  - "Open original" link with `rel="noopener noreferrer"`
- **Inspector, element selected:** label + tag, text (truncated, expandable; image description; link destination), breadcrumb (from the selector path), Select parent, and this element's modifications. Modification controls are added by 03 and 04.
- **Inspector, nothing selected:** slot for the ChangesList (05).
- **MarkdownView:** `<pre>` of the derived Markdown, token count (`estimateTokens`), copy and download (`.md`).
- **Keyboard:** Esc deselects. Clicking empty space deselects.
- **Store actions:** `select(id | null)`, and setting `view`. Switching `view` leaves `selectedId` untouched.

## Tests

- `renderMarkdown`: snapshot test for the demo page.
- `renderHtml`: escaping of page text.
- Label per `kind`.
- Breadcrumb derivation from a selector.
