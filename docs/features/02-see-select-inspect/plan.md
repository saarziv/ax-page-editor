# See, Select & Inspect – Plan

How we build the See, select & inspect spec. Shared architecture, core contracts and conventions are in the global `plan.md`. Sections are added task by task.

---

## Builds on

First built here (contracts in the global plan):
- `selectedId` and the `select` action in the editor store (§5.1)
- The plain-language label for each `kind` (§3.1)

Used from 01: the page tree (§3.1), `usePageTree` (§5.1), and `PreviewNode` (01 plan → Preview rendering).

## Core

Two small, pure tree helpers in `packages/core/src/tree.ts`. They're in core because 03 needs them too: the target snippet (§3.3) is `nodeText`, and the Hide & context controls look nodes up by id.

- **`findNodePath(root, id) → PageNode[] | null`:** the chain of nodes from the root down to the node with that id, or `null`. The last item is the node itself. The rest is its ancestors, which the breadcrumb (a later task) will show. A lookup by id is enough because ids are unique in the tree (§3.1).
- **`nodeText(node) → string`:** the node's own text followed by all its descendants' text, in order, with runs of spaces collapsed and trimmed. `clean` already kept the spaces between a text and a link, so joining is plain concatenation.

## Web

### Selection

**The idea:** the store holds only `selectedId`. The preview tells the store what was clicked, and each node checks "am I selected?". Everything else (which node, its text, its label) is derived from the tree, never stored.

**One click handler on the preview, not one per node.** Every selectable element carries `data-node-id`. The preview's `onClick` takes `event.target.closest('[data-node-id]')` and selects that id. `closest` walks up from the exact element clicked, so the innermost selectable element always wins (K2) with no `stopPropagation` juggling. A later task can treat a click that finds no id as a click on empty space (S2).

Example: in `<p data-node-id="…paragraph:3">Read our <span data-node-id="…link:1">terms of service</span> …</p>`, a click on "terms" finds the span first and selects the link. A click on "Read our" finds the paragraph.

**What's selectable:** every kind that `clean` produces except `text` and `page`. A `text` node is a piece of a sentence, so a click on it selects its parent, which is what a publisher means. `page` is the whole document. `annotation` and `forwarded` come with 03 and 04.

**The highlight:** a selected node gets `data-selected="true"`, styled as a 2px primary-colored `outline` with an offset and a very light tint. An outline, unlike a border, takes no space, so the page doesn't shift when the selection moves. The same attribute is what the e2e test checks. Selectable nodes get `cursor-pointer`.

**Re-rendering only what changed:** each `PreviewNode` subscribes with `useEditorStore(s => s.selectedId === node.id)`. That's a boolean, so when the selection moves only the old and the new node re-render, not the whole page.

**Store:** `selectedId: string | null` and `select(id | null)`. `setUrl` also resets `selectedId` to `null`, because ids belong to one page's tree.

### Inspector

**Two states**, chosen by whether `findNodePath(tree, selectedId)` finds a node. The inspector reads the tree with the same `usePageTree(url)` as the preview, so TanStack Query serves it from the cache with no second request. A stale id that isn't in the tree simply shows the empty state.

- **Nothing selected:** the hint at the top, then "Changes on this page" at the bottom: "No changes yet." There are no modifications in the app yet, so the list is always empty until the bonus mock and 03.
- **Element selected**, top to bottom:
  - the plain-language type ("Link"), with "Tag: `<a>`" under it, from `node.tag`
  - **Text:** `nodeText(node)`. Text over about 200 characters is clamped to four lines with a "Show more" / "Show less" toggle. For images, the description `attrs.alt`, or "No description" when missing. For fields, `attrs.label`.
  - for links, the destination `attrs.href`, as plain text (not a link, so nothing leaves the editor)
  - "Changes on this element": "No changes on this element." for now
  - a divider, then the three modification buttons, still disabled. 03 and 04 make them work.

**Plain-language labels** live in `apps/web/src/editor/nodeLabels.ts` as a `Record<NodeKind, string>` ("Link", "Heading", "Image", "List item", "Form field", "Navigation", …). They're words for the screen, so they stay in the web app. Typing the map as a `Record` over every kind means TypeScript flags a missing label when a kind is added. The later hover task reuses the same map.

**Files:**
- `Inspector.tsx` picks the state.
- `ElementDetails.tsx` holds the selected-element block.
- `PageChanges.tsx` holds the empty list.
- `Editor.tsx` passes `url` to the inspector.

## Tests

- **Core unit tests** for `findNodePath` and `nodeText` (cases in `tasks.md`).
- **E2E:** a new `e2e/select-inspect.spec.ts`. The 01 test that checked the disabled buttons is updated to the new empty state. The web app has no unit test setup. These components only display what core computes, so e2e covers them.
