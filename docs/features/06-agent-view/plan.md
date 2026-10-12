# Agent View – Plan

How we build the Agent View spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- The marked page (global plan §3.4, built in 03)
- First built here: `prune` (§3.4)
- `renderMarkdown` / `renderHtml` (§3.5, built in 02), `estimateTokens` (§3.6)

## The idea

What an agent reads is computed the same way in the editor and in Agent View: `renderMarkdown(prune(markedPage))` (global plan §6.1, steps 4 and 6). The marked page already holds every decision, what's hidden and where each note goes (03). So this feature adds no decisions of its own, only the text formats, the Markdown view and the endpoint. That's why the editor's Markdown view and Agent View can't differ.

## Core

### `prune(root)`

Returns the marked page without its `hidden` subtrees: the agent tree, the only tree the renderers see. Like `mark`, it never changes its input and copies only the nodes on the path to a removed subtree. A container left empty stays, because it renders as nothing. Example: with the cookie banner hidden, `prune` drops `aside:1` and everything in it, and `prune(mark(page, []).tree)` equals the page. This is where 03's K2 and K4 are checked on the real output.

### Renderer formats for `annotation`

- **Markdown:** a blockquote, `> **Context:** <note>`. With `attrs.about` set (a note moved after its paragraph or table, 03), the label names the element: `> **Context** (on "terms"): <note>`.
- **HTML:** `<p data-ax="context"><strong>Context:</strong> …</p>`, with the same label rule.
- **Escaping:** the note is plain text, so Markdown's special characters are escaped (`\#`, `\[`) and HTML is entity-escaped. `# heading` or `[x](y)` reaches the agent as those literal characters, never as markup (03 spec K9).

**The tricky part, a note at the start of a list:** 03 places a container's note as its first child. Markdown can't put a blockquote inside a list before the first item, so when a list's or table's first child is an annotation, the renderer writes it just before the list or table. The agent reads it in the same spot.

## Web

### Markdown view

The Page | Markdown toggle (`view` in the store) switches the preview area to a `MarkdownView` that shows the agent's Markdown as plain text, with its token count.
- It computes `renderMarkdown(prune(marked.tree))` in a `useMemo` on the marked page from `useMarkedPage()` (03), so it re-runs only when the draft or the page changes.
- It's mounted only while the Markdown view is open, so editing in the Page view never pays for rendering Markdown.

## API

Agent View runs the same chain on the live page: `renderMarkdown(prune(mark(clean(html), config, forwards).tree))`, or `renderHtml` for `format=html`. The modifications it couldn't apply come from the marked page's `status`.

## Tests

- **`prune`:** a hidden element's text, links, images and nested elements are gone (03 K2), nothing else changes, and with no hides the output equals the page (03 K4).
- **Renderers:** a note after a leaf, a note before a section's content, a note before a list (written before the list, not inside it), the "on …" label, and escaping (`<script>`, `# heading`, `[x](y)` come out literal).
- **Parity:** for the same page and configuration, the editor's Markdown equals Agent View's.
