# See, Select & Inspect – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Select an element and inspect it · Covers: K1, K2, K3, K4, K5, K6, K7, K8 (no-changes case), S4
- [x] T02 – Deselect, climb with the breadcrumb, and see what you hover · Covers: S1, S2, S3
- [ ] T03 – See the changes on the demo page · Covers: K8 (with changes), B1, B2, B3

---

## T01 – Select an element and inspect it

**Goal:** the user clicks any element in the preview, sees it clearly highlighted, and sees what it is in the inspector: type, tag, text and its changes. With nothing selected, the inspector shows a hint and the (still empty) list of changes on the page. There are no modifications in the app yet, so both change lists say there are none. The bonus task adds mock changes to the demo later.

**Implements:** `plan.md` → Selection, and Inspector.

- [x] **S1 – Inspector: the "nothing selected" state (UI only)**: the inspector shows the hint and an empty "Changes on this page" list instead of the three disabled buttons.
- [x] **S2 – Click to select, and show the element in the inspector**: one click handler on the preview selects the innermost element and outlines it. The inspector shows its type, tag, text, link destination and the disabled buttons. Core gained `findNodePath` and `nodeText`.

**Done when:** on the demo page, any element can be clicked and is clearly highlighted, the inspector shows its type, tag, text and "No changes on this element.", and with nothing selected it shows the hint and the empty page changes list. `pnpm test`, `typecheck` and `e2e` pass.

---

## T02 – Deselect, climb with the breadcrumb, and see what you hover

**Goal:** the selection becomes easy to steer. Esc or a click on empty preview space clears it. A breadcrumb in the inspector (`Main content › Section › Paragraph › Link`) lets the user select any container around the element, which a click can't reach because it always picks the innermost element. Hovering shows a light outline and a small type label before the user clicks, so they know what a click will select. No new core logic: everything comes from `findNodePath` and the label map T01 built.

**Implements:** `plan.md` → Deselect, Breadcrumb, and Hover.

- [x] **S1 – Clear the selection with Esc or a click on empty space**: Esc on the window, or a click the preview finds no element under, selects nothing. A click in a gap inside a section still selects the section.
- [x] **S2 – Breadcrumb to select a container**: the path from the page down to the element, in plain words, with each ancestor clickable. A top-level element shows none.
- [x] **S3 – Hover outline with a type label**: one overlay box over the innermost hovered element, lighter than the selection, with a type chip above it.

**Done when:** on the demo page, Esc and a click on empty space clear the selection, the breadcrumb selects any container around the selected element, and hovering shows a light outline with the element's type. `pnpm test`, `typecheck` and `e2e` pass.

- Breadcrumb receives the path along with the node → plan.md §Breadcrumb
- Hover state lives in `HoverLayer`, not `Preview` → plan.md §Hover

---

## T03 – See the changes on the demo page

**Goal:** the publisher can see what has been changed on a page, both at a glance in the preview and in the inspector. There are no real controls until 03, so opening the demo page loads three sample modifications into the draft, one of each type: the cookie banner hidden, a context note on the chart image, and the "guide to web analytics" link forwarded. Each modified element gets an amber dashed marker with a badge naming the change. Selecting it lists its changes in the inspector, and with nothing selected the page's changes list shows all three. Everything reads the draft, not the mock, so it keeps working when 03 replaces the mock with real modifications.

**Implements:** `plan.md` → Modification markers.

- [ ] **S1 – Load the demo mock and list it in "Changes on this page"**

  Core gets the `Target` and `Modification` zod schemas. The store gets `draft`, which `setUrl` fills with the three mock modifications when the demo page opens and empties for any other URL. The page changes list shows one line per modification, its type in plain words and the text of its target, instead of always saying "No changes yet."

  **Verify:**
  1. Click "Try a sample": with nothing selected, "Changes on this page" lists three lines, starting "Hidden from AI · We use cookies…", "Context · Customer growth" and "Forwarded · guide to web analytics".
  2. Open `https://example.com` from the top bar: the list says "No changes yet." Open the demo again: the three lines are back.
  3. `pnpm e2e` passes. The 01 test that expected "No changes yet." on the demo now expects the three lines.

- [ ] **S2 – List the selected element's changes (K8)**

  Core gets `targetSnippet`, `matchesTarget` and `resolve`, which decide whether a modification really belongs to an element: same selector and the same text snippet, never a guess. The inspector's "Changes on this element" uses them to list each of the selected element's modifications in plain words, and keeps "No changes on this element." when there are none.

  **Verify:**
  1. Click "Try a sample", click the cookie banner's text, then click "Sidebar" in the breadcrumb: the inspector lists "Hidden from AI". The paragraph inside it has no changes of its own, so before the climb it said "No changes on this element."
  2. Click the chart image: it lists "Context: " followed by the mock note. Click "guide to web analytics": it lists "Forwarded: https://en.wikipedia.org/wiki/Web_analytics".
  3. Click "terms of service": it still says "No changes on this element."
  4. `pnpm test` passes. New core tests check:
     - `targetSnippet` is the first 60 characters of the normalized text, and the alt for an image
     - `resolve` returns the node when selector and snippet match, e.g. `aside:1` with the banner's first 60 characters
     - `resolve` returns `null` when the selector exists but the text changed, or when the selector isn't in the tree
  5. `pnpm e2e` passes. A new test selects the chart image and checks its context line, then selects "terms of service" and checks "No changes on this element."

- [ ] **S3 – Mark modified elements in the preview (B1, B2)**

  One more overlay next to the hover overlay draws a box over every element with a modification that resolves: a dashed amber outline, a faint tint, and badges above its top-right corner. The box lets clicks through and follows its element when images load or the window resizes. See `plan.md` → Modification markers for why it's an overlay and how it stays different from hover and selection.

  **Verify:**
  1. Click "Try a sample": the cookie banner shows a "Hidden from AI" badge, the chart image a "Context" badge and "guide to web analytics" a "Forwarded" badge. Nothing else is marked, and nothing on the page shifts.
  2. Click the chart image: the solid selection outline and the amber marker with its "Context" badge both show, and the inspector lists the context line.
  3. Hover the chart: the hover chip on the left and the "Context" badge on the right are both readable.
  4. Resize the browser window: each marker stays on its element.
  5. `pnpm e2e` passes. A new test checks that the demo shows exactly three markers with those three badges, and that clicking the marked image selects it.

**Done when:** the demo page opens with three marked elements, selecting one lists its changes, the nothing-selected list shows all three, and a real URL shows no changes. `pnpm test`, `typecheck` and `e2e` pass.

---

## Follow-ups

- The theme's primary color is near-black, so the selection outline, hover outline and breadcrumb links are black/grey rather than a distinct accent color. Consider one accent token for selection, hover and clickable steps.
