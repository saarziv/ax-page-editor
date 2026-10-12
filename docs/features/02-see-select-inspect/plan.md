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

**One click handler on the preview, not one per node.** Every selectable element carries `data-node-id`. The preview's `onClick` takes `event.target.closest('[data-node-id]')` and selects that id. `closest` walks up from the exact element clicked, so the innermost selectable element always wins (K2) with no `stopPropagation` juggling. A click that finds no id is a click on empty space (see Deselect).

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

### Deselect

**The idea:** two ways back to "nothing selected", both calling `select(null)`. Esc does it from anywhere, and so does a click on empty preview space.

- **Esc:** one `keydown` listener on `window`, added by `Editor` while it's mounted. It's on the window, not the preview, because the preview isn't focusable, so a key press there would never reach it.
- **Empty space:** the click handler moves from the content column to the whole preview `section`, and a click whose `closest('[data-node-id]')` finds nothing now selects `null` instead of being ignored. That covers the margins around the content column, the page title header and the gaps between top-level landmarks.

**The tricky part, what counts as empty:** containers like `main` and `section` are selectable and fill their whole box, so a click in the gap between two paragraphs inside a section selects the section. That's the innermost rule doing its job, not a bug, and the breadcrumb is how you get back down. Only space that no selectable element covers clears the selection. Example on the demo: a click to the right of the content column clears it, and a click in the gap between the "Plans" table and the paragraph below it selects the "Plans" section.

### Breadcrumb

**The idea:** a click always picks the innermost element, so containers are hard to click directly. The breadcrumb at the top of the selected element's details shows the path down to it, and each step selects that ancestor. It comes straight from `findNodePath`, which the inspector already computes.

- The steps are the path minus the `page` root, each named with its plain-language label: `Main content › Section › Paragraph › Link`. The ancestors are buttons that call `select(ancestor.id)`. The last step is the current element, plain text, marked `aria-current`.
- An element whose only ancestor is `page` (e.g. the demo's `main`) has nothing to climb to, so it shows no breadcrumb.
- It lives in `Breadcrumb.tsx`, and `ElementDetails` receives the path instead of just the node.

Example: select "terms of service" on the demo, then click "Section" in the breadcrumb. The outline moves to the whole section, and the breadcrumb becomes `Main content › Section`.

### Hover

**The idea:** hovering shows a light outline around the innermost selectable element under the pointer, with a small label chip naming its type ("Link", "Image"). It's drawn by one overlay box in the preview, not by the nodes themselves.

**Why one overlay, not a style on each node:** the label has to sit inside or on the element, and some elements can't hold extra content. An `<img>` has no children, and a chip inside a `<tr>` or `<ul>` breaks the markup. A CSS `:hover` style also can't help, because hovering a link inside a paragraph matches both of them. So the content column gets an `onMouseOver` that finds the hovered element with the same `closest('[data-node-id]')` as the click. The preview positions one absolutely placed box over that element's bounding rect. The box ignores the pointer (`pointer-events: none`), and `onMouseLeave` hides it.

- **Lighter than the selection:** a 1px, half-transparent primary outline with no tint, against the selection's solid 2px outline with a tint. The chip sits just above the element's top-left corner, so it never covers the content.
- **Label:** the hovered id is looked up with `findNodePath` in the tree the preview already has, and its kind goes through the same `nodeLabels` map as the inspector.
- **Local state:** the hovered element is `useState` in `Preview`, not in the store. Nothing else reads it, and it changes on every mouse move, so keeping it local re-renders only the preview's overlay.
- **Scrolling:** the box is positioned relative to the content column, which scrolls with the page, so it stays on its element while scrolling. A layout change under a still pointer (an image finishing loading) can leave it slightly off until the next mouse move. That's acceptable for a hover hint.

Example: hovering the "Customer growth" chart shows a faint outline around the image and an "Image" chip above it. Moving onto the "terms of service" link moves the box to the link with "Link", and the paragraph around it isn't outlined.

## Tests

- **Core unit tests** for `findNodePath` and `nodeText` (cases in `tasks.md`).
- **E2E:** a new `e2e/select-inspect.spec.ts`. The 01 test that checked the disabled buttons is updated to the new empty state. T02 adds tests there for Esc and empty-space deselect, the breadcrumb and the hover overlay. The web app has no unit test setup. These components only display what core computes, so e2e covers them.
