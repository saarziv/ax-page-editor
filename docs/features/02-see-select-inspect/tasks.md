# See, Select & Inspect – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Select an element and inspect it · Covers: K1, K2, K3, K4, K5, K6, K7, K8 (no-changes case), S4
- [x] T02 – Deselect, climb with the breadcrumb, and see what you hover · Covers: S1, S2, S3
- Next tasks are defined after T02. Still to cover: K8 (with changes), B1, B2, B3.

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

- [x] **S1 – Clear the selection with Esc or a click on empty space**

  Pressing Esc anywhere in the editor clears the selection, and so does a click on preview space that no element covers. The click handler moves up to the whole preview, and a click that finds no element now selects nothing instead of being ignored. A click in a gap inside a section still selects that section. That's by design, and `plan.md` → Deselect explains why.

  **Verify:**
  1. Click "Try a sample", click "terms of service", then press Esc: the outline disappears and the inspector is back to the hint.
  2. Select the link again, then click to the right of the page content: the selection clears the same way.
  3. Select the link, then click in the gap between the "Plans" table and the paragraph below it: the "Plans" section is selected, outlined as a whole, and the inspector says "Section".
  4. `pnpm e2e` passes. New tests in `select-inspect` select the link, then check that Esc clears it and that a click on empty preview space clears it.

- [x] **S2 – Breadcrumb to select a container**

  The top of the selected element's details shows the path from the page down to it, named in plain words, like `Main content › Section › Paragraph › Link`. Every step except the last is clickable and selects that container. The last step is the current element. A top-level element with nothing above it shows no breadcrumb.

  **Verify:**
  1. Click "Try a sample" and click "terms of service": the inspector shows `Main content › Section › Paragraph › Link` above "Link".
  2. Click "Section" in the breadcrumb: the outline moves to the whole section, the inspector says "Section", and the breadcrumb becomes `Main content › Section`.
  3. Click "Main content" in the breadcrumb: the whole main area is selected, and no breadcrumb shows, because only the page is above it.
  4. `pnpm e2e` passes. A new test selects the link, checks the breadcrumb text, clicks "Paragraph" and checks that the paragraph is now the selected element.

- [x] **S3 – Hover outline with a type label**

  Hovering the preview shows a faint outline around the innermost element under the pointer and a small chip above it with its type ("Link", "Image"). It's one overlay box positioned over the hovered element, so it works for images and table rows too. It's visibly lighter than the selection outline, and leaving the preview hides it.

  **Verify:**
  1. Click "Try a sample" and hover the "Customer growth" chart: a faint outline and an "Image" chip appear. Nothing moves or shifts.
  2. Move onto "terms of service": the box jumps to the link with "Link", and the paragraph around it is not outlined.
  3. Click the link, then keep hovering it: the solid selection outline is clearly stronger than the hover outline.
  4. Scroll the preview while hovering, then move the mouse out of the preview: the box follows its element while scrolling and disappears when the mouse leaves.
  5. `pnpm e2e` passes. A new test hovers the link and checks that the hover chip says "Link", then hovers the heading and checks that it says "Heading".

**Done when:** on the demo page, Esc and a click on empty space clear the selection, the breadcrumb selects any container around the selected element, and hovering shows a light outline with the element's type. `pnpm test`, `typecheck` and `e2e` pass.

- Breadcrumb receives the path along with the node → plan.md §Breadcrumb
- Hover state lives in `HoverLayer`, not `Preview` → plan.md §Hover

---

## Follow-ups

- The theme's primary color is near-black, so the selection outline, hover outline and breadcrumb links are black/grey rather than a distinct accent color. Consider one accent token for selection, hover and clickable steps.
