# Hide & Add Context – Plan

How we build the Hide & add context spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- `transform` contract and pipeline (global plan §3.4): this feature owns steps 2 (Hide) and 3 (Context)
- `resolve` (§3.3), renderers (§3.5), store (§5.1)

## Core

### Transform step 2: Hide
- Mark the resolved node's subtree removed in `Result.tree`.
- Any modification whose target is inside a hidden subtree gets status `inactive`. It is kept in the configuration, so un-hiding restores it.

### Transform step 3: Context
Insert an `annotation` node holding the note as a plain string:
- **Containers** (`section`, `article`, `nav`, `header`, `footer`, `aside`, `main`, `list`, `table`, `form`, `figure`): first child.
- **Everything else:** next sibling.

### Renderer formats
- **Markdown:** `> **Context:** …` (note text escaped for Markdown).
  - For containers whose first child is an annotation, the blockquote goes directly before the container's content (a Markdown list can't contain a leading blockquote).
- **HTML:** `<p data-ax="context"><strong>Context:</strong> …</p>`

## Web

- **Inspector controls:** Hide toggle; context textarea with placeholder per `kind` and a 0/500 counter (input capped at 500).
- **Parent hidden:** when the selected node is inside a hidden subtree, the inspector shows "Hidden because a parent is hidden from AI" with a link that selects that parent.
- **Preview markers:** hidden nodes ghosted (faded, striped, "Hidden from AI" badge) and still clickable; context shown as an inline callout where the agent will read it.
- **Store actions:**
  - `toggleHide(selector)`: adds or removes the one `hide` modification for that element.
  - `setContext(selector, note)`: replaces the element's one `context` modification; an empty note removes it.

## Tests

- `transform`:
  - hide removes the subtree and inactivates nested modifications; un-hide restores them
  - context placement on containers vs leaves
  - note escaping (`<script>`, Markdown syntax appear as literal text)
- `renderMarkdown`: annotation as first block in a container (including lists), and directly after a leaf.
- `renderHtml`: annotation format and escaping.
- Store: one context per element, empty note removes it.
- E2E flow 1 (global plan §7): open the demo page, hide the cookie banner, add context to the chart; the Markdown view reflects both.
