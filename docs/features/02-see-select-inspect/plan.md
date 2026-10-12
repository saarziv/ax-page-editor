# See, Select & Inspect – Plan

How we build the See, select & inspect spec. Shared architecture, core contracts and conventions are in the global `plan.md`. Sections are added task by task.

---

## Builds on

First built here (contracts in the global plan):
- `selectedId` and the `select` action in the editor store (§5.1)
- The plain-language label for each `kind` (§3.1)
- The `Target` and `Modification` zod schemas (§3.7), `resolve` and the target snippet (§3.3), and `modificationsDraft` in the editor store (§5.1), for the demo mock (see Modification markers)

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

**What's selectable:** every kind that `clean` produces except `text` and `page`. A `text` node is a piece of a sentence, so a click on it selects its parent, which is what a publisher means. `page` is the whole document. `annotation` and `forwarded` come with 03 and 05.

**The highlight:** a selected node gets `data-selected="true"`, styled as a 2px primary-colored `outline` with an offset and a very light tint. An outline, unlike a border, takes no space, so the page doesn't shift when the selection moves. The same attribute is what the e2e test checks. Selectable nodes get `cursor-pointer`.

**Re-rendering only what changed:** each `PreviewNode` subscribes with `useEditorStore(s => s.selectedId === node.id)`. That's a boolean, so when the selection moves only the old and the new node re-render, not the whole page.

**Store:** `selectedId: string | null` and `select(id | null)`. `setUrl` also resets `selectedId` to `null`, because ids belong to one page's tree.

### Inspector

**Two states**, chosen by whether `findNodePath(tree, selectedId)` finds a node. The inspector reads the tree with the same `usePageTree(url)` as the preview, so TanStack Query serves it from the cache with no second request. A stale id that isn't in the tree simply shows the empty state.

- **Nothing selected:** the hint at the top, then "Changes on this page" at the bottom. What it lists is in Modification markers.
- **Element selected**, top to bottom:
  - the plain-language type ("Link"), with "Tag: `<a>`" under it, from `node.tag`
  - **Text:** `nodeText(node)`. Text over about 200 characters is clamped to four lines with a "Show more" / "Show less" toggle. For images, the description `attrs.alt`, or "No description" when missing. For fields, `attrs.label`.
  - for links, the destination `attrs.href`, as plain text (not a link, so nothing leaves the editor)
  - "Changes on this element": the element's modifications, see Modification markers
  - a divider, then the three modification buttons, still disabled. 03 and 05 make them work.

**Plain-language labels** live in `apps/web/src/editor/nodeLabels.ts` as a `Record<NodeKind, string>` ("Link", "Heading", "Image", "List item", "Form field", "Navigation", …). They're words for the screen, so they stay in the web app. Typing the map as a `Record` over every kind means TypeScript flags a missing label when a kind is added. The later hover task reuses the same map.

**Files:**
- `Inspector.tsx` picks the state.
- `ElementDetails.tsx` holds the selected-element block.
- `PageChanges.tsx` holds the page's changes list.
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
- It lives in `Breadcrumb.tsx`, and `ElementDetails` receives the path along with the node.

Example: select "terms of service" on the demo, then click "Section" in the breadcrumb. The outline moves to the whole section, and the breadcrumb becomes `Main content › Section`.

### Hover

**The idea:** hovering shows a light outline around the innermost selectable element under the pointer, with a small label chip naming its type ("Link", "Image"). It's drawn by one overlay box in the preview, not by the nodes themselves.

**Why one overlay, not a style on each node:** the label has to sit inside or on the element, and some elements can't hold extra content. An `<img>` has no children, and a chip inside a `<tr>` or `<ul>` breaks the markup. A CSS `:hover` style also can't help, because hovering a link inside a paragraph matches both of them. So the content column gets an `onMouseOver` that finds the hovered element with the same `closest('[data-node-id]')` as the click. The preview positions one absolutely placed box over that element's bounding rect. The box ignores the pointer (`pointer-events: none`), and `onMouseLeave` hides it.

- **Lighter than the selection:** a 1px, half-transparent primary outline with no tint, against the selection's solid 2px outline with a tint. The chip sits just above the element's top-left corner, so it never covers the content.
- **Label:** the hovered id is looked up with `findNodePath` in the tree the preview already has, and its kind goes through the same `nodeLabels` map as the inspector.
- **Local state:** the hovered element's id, label and position are `useState` in `HoverLayer.tsx`, the wrapper around the content column, not in the store. Nothing else reads them, and they change on every mouse move, so keeping them local re-renders only the overlay.
- **Scrolling:** the box is positioned relative to the content column, which scrolls with the page, so it stays on its element while scrolling. A layout change under a still pointer (an image finishing loading) can leave it slightly off until the next mouse move. That's acceptable for a hover hint.

Example: hovering the "Customer growth" chart shows a faint outline around the image and an "Image" chip above it. Moving onto the "terms of service" link moves the box to the link with "Link", and the paragraph around it isn't outlined.

### Modification markers

**The idea:** until 03 adds real controls, opening the demo page puts a few sample modifications into the store's `modificationsDraft`, exactly as if the publisher had made them. Everything else reads `modificationsDraft`, never the mock, so when 03 deletes the mock the preview markers and both change lists keep working with real modifications.

**The mock** lives in `apps/web/src/editor/demoMock.ts`, next to `DEMO_URL`, which moves there from the start screen. It's three plain `Modification`s, written like a saved config, one of each type, so every badge shows:
- hide on the cookie banner (`aside:1`)
- context on the chart image (`main:1>figure:1>image:1`), with a short note
- forward on the "guide to web analytics" link (`main:1>section:1>paragraph:1>link:2`). Not "terms of service", so that link stays the example of an element with no changes.

`setUrl` sets `modificationsDraft` to the mock when the url is `DEMO_URL` and to `[]` otherwise. So reopening the demo restores the mock, and a real URL opens with none.

**Core gets the shared types and `resolve` now** (contracts in global plan §3.3 and §3.7), because the hard rule "a modification that can't be confidently resolved is never applied" covers markers too. A marker on the wrong element would tell the publisher something false.
- `targetSnippet(node)`: the first 60 characters of `nodeText(node)`, or `attrs.alt` for an image.
- `matchesTarget(node, target)`: the node's id equals `target.selector` and its snippet equals `target.text`.
- `resolve(root, target)`: `findNodePath` by selector, then `matchesTarget`, else `null`. No fallback.

Example: the mock's hide targets `{ selector: 'aside:1', text: 'We use cookies to improve your experience. By continuing you' }`. If someone edits the banner text in `demo.html`, the snippet no longer matches, and the banner shows no marker instead of a misleading one.

**Per-element changes (K8):** a hook `useNodeModifications(node)` in `apps/web/src/state/derived.ts` returns the draft modifications whose target matches that node. It reads the store with `useShallow`, so a component re-renders only when its own list changes. `ElementDetails` shows one line per modification in plain words: "Hidden from AI", "Context: <note>", "Forwarded: <href>". With none, it keeps "No changes on this element." The words for each type live in `modificationLabels.ts`, next to `nodeLabels.ts`.

**Page changes list (B3):** `PageChanges` lists every draft modification as one line, its type and its target snippet, e.g. "Hidden from AI · We use cookies to improve…". It reads the snippet from the modification itself, so it needs no tree. Statuses and grouping (including "not found on this page") come in 04.

**Preview markers (B1, B2):** one more overlay in the same positioned box as the hover overlay, for the same reason: a badge can't go inside an `<img>` or a `<tr>`. For each draft modification that `resolve`s, `ModificationLayer.tsx` finds the element by `[data-node-id]` (with `CSS.escape`, since ids contain `>` and `:`) and draws one box over its rect: a dashed amber outline with a faint amber tint, and the badges ("Hidden from AI", "Context", "Forwarded") above its top-right corner. An element with two modifications gets one box with two badges.
- **Different from hover and selection:** both of those use the theme's primary color, solid or faint, with the chip on the left. The marker is dashed, amber and badged on the right, so all three can show on one element at once (B2).
- **Pointer-transparent:** the boxes have `pointer-events: none`, so a click still reaches the element and selects it.
- **Staying in place:** rects are measured after each render and again whenever the content box resizes (a `ResizeObserver`), which covers images finishing loading and window resizes.
- **Interim:** a resolved modification counts as active. 03 replaces this with the marked page (03 plan → Rendering the preview).

## Tests

- **Core unit tests** for `findNodePath`, `nodeText`, `targetSnippet`, `matchesTarget` and `resolve` (cases in `tasks.md`).
- **E2E:** a new `e2e/select-inspect.spec.ts`. The 01 test that checked the disabled buttons is updated to the new empty state. T02 adds tests there for Esc and empty-space deselect, the breadcrumb and the hover overlay. T03 updates the demo's empty-list check to the mock, and adds tests for the markers, the per-element list and the page list. The web app has no unit test setup. These components only display what core computes, so e2e covers them.
