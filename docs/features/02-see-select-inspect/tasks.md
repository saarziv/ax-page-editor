# See, Select & Inspect – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Select an element and inspect it · Covers: K1, K2, K3, K4, K5, K6, K7, K8 (no-changes case), S4
- Next tasks are defined after T01. Still to cover: S1, S2, S3, K8 (with changes), B1, B2, B3.

---

## T01 – Select an element and inspect it

**Goal:** the user clicks any element in the preview, sees it clearly highlighted, and sees what it is in the inspector: type, tag, text and its changes. With nothing selected, the inspector shows a hint and the (still empty) list of changes on the page. There are no modifications in the app yet, so both change lists say there are none. The bonus task adds mock changes to the demo later.

**Implements:** `plan.md` → Selection, and Inspector.

- [x] **S1 – Inspector: the "nothing selected" state (UI only)**

  The right panel changes from three disabled buttons to the spec's empty state: a hint at the top ("Click an element in the preview to inspect it.") and a "Changes on this page" section at the bottom that says "No changes yet." Nothing can be selected yet, so this is the only state, and the modification buttons are gone for now. They come back in S2, under a selected element's details.

  **Verify:**
  1. Click "Try a sample": the inspector shows the hint at the top and "Changes on this page · No changes yet." at the bottom, with no Hide / Context / Forward buttons.
  2. `pnpm e2e` passes. The 01 test that expected the disabled buttons now expects the empty state instead.

- [x] **S2 – Click to select, and show the element in the inspector**

  Clicking an element in the preview selects it: it gets a clear outline, and the inspector shows its details at the top, with the disabled modification buttons below them. A click picks the innermost element, so clicking "terms of service" selects the link, not the paragraph around it. Clicking another element moves the selection, and opening another page clears it. The rules for what's selectable, the highlight and what the inspector shows are in `plan.md` → Selection and Inspector.

  **Verify:**
  1. `pnpm test` passes. The new core tests check that:
     - `findNodePath` returns the chain from the root to a node: for the "terms of service" link in the demo it's `page › main › … › paragraph › link`, and it returns `null` for an id that's not in the tree
     - `nodeText` joins a node's text with its children's: `paragraph[text "Read our ", link "terms of service", text " and…"]` gives "Read our terms of service and…", with spaces tidied
  2. Click "Try a sample" and click "terms of service": only that link is outlined, and the page doesn't navigate. The inspector shows "Link", "Tag: `<a>`", the text "terms of service", the destination `iana.org/help/example-domains`, "No changes on this element.", and below them the three buttons, disabled.
  3. Click the "Customer growth" chart image: the outline moves to it, and the inspector shows "Image", "Tag: `<img>`" and its description "Customer growth".
  4. Open `https://en.wikipedia.org/wiki/Web_page` and click its first long paragraph: the inspector shows the text cut short with "Show more", which expands it. (The demo has no paragraph long enough.)
  5. Open another page from the top bar: nothing is selected, and the inspector is back to the hint.
  6. `pnpm e2e` passes. A new `select-inspect` test clicks the link, checks the highlight and the inspector details, then clicks the heading and checks that the highlight moved.

**Done when:** on the demo page, any element can be clicked and is clearly highlighted, the inspector shows its type, tag, text and "No changes on this element.", and with nothing selected it shows the hint and the empty page changes list. `pnpm test`, `typecheck` and `e2e` pass.

---

## Follow-ups
