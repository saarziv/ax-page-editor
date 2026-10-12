# Hide & Add Context – Tasks

Workflow, step format and deviation rules: see `CLAUDE.md` (SDD guidelines).

## Roadmap

- [x] T01 – Show the Hide from AI switch · Covers: the UI part of K1 and K3
- [x] T02 – Hide an element from AI, and see it in the preview · Covers: K1, K2, K3, K4 (agent output checked on the marked page; the text in 05)
- [x] T03 – Add context for AI, and see it in the preview · Covers: K5, K6, K7, K8, K9, K10, K11 (agent output checked on the marked page; the text in 05)

---

## T01 – Show the Hide from AI switch

**Goal:** the publisher sees the real Hide control instead of a disabled button.

When an element is selected, the inspector shows a "Hide from AI" row with an on/off switch. The switch already shows the right state: it's on when the element has a hide in `modificationsDraft`, and off otherwise. On the demo, the cookie banner's switch is on, because 02's mock hides it.

The switch can't be clicked yet. T02 makes it work. This task is UI only, with no new logic.

**Implements:** `plan.md` → Hide switch.

- [x] **S1 – Replace the Hide button with a switch**

  Add the shadcn `Switch` component and use it in the selected element's controls, in place of the disabled "Hide from AI" button. Its state comes from the element's own modifications, so nothing new is stored. "Context for AI" and "Forward this link" stay disabled buttons.

  **Verify:**
  1. Click "Try a sample", then click "terms of service": below the divider there's a "Hide from AI" row with a switch that is off and disabled, followed by the two disabled buttons.
  2. Click the cookie banner's text, then "Sidebar" in the breadcrumb: the switch shows on, because the demo mock hides the banner.
  3. `pnpm e2e` passes. The two tests that expected a disabled "Hide from AI" button now expect a disabled, unchecked switch named "Hide from AI". A new check selects the banner through the breadcrumb and expects the switch to be checked.

**Done when:** a selected element shows the Hide from AI switch reflecting the draft, and `pnpm test`, `typecheck` and `e2e` pass.

---

## T02 – Hide an element from AI, and see it in the preview

**Goal:** the publisher can hide any element from AI agents, and undo it.

The flow (`plan.md` → How hiding works):
1. The publisher selects an element and turns on the "Hide from AI" switch.
2. The store adds one `hide` entry to `modificationsDraft`. Turning the switch off removes it.
3. Core's `markModificationsInTree` reads `modificationsDraft` and returns the marked page: a copy of the page where the hidden element has `hidden: true`.
4. The preview draws the marked page. The hidden element stays in place, faded and grey, with a "⊘ Hidden from AI" label. It's still clickable, so the publisher can turn Hide off.

S1 builds steps 1 and 2. S2 builds steps 3 and 4.

Not in this task: the Markdown view and removing hidden parts from what the agent reads (05), and saving (04). Until then, core tests check the marked page instead.

**Implements:** `plan.md` → `targetFor(node)`, `markModificationsInTree` steps 1 and 2, Hide switch, Store: `toggleHide(target)`, and Rendering the preview.

- [x] **S1 – The switch adds and removes the hide in the draft**

  The switch becomes clickable. Turning it on adds a `hide` entry for the selected element to `modificationsDraft`, and turning it off removes it. Core gets `targetFor(node)`, which builds the entry's target.

  The demo mock from 02 is deleted, so the demo now opens with no changes. The preview doesn't have the faded look yet: a hidden element still shows 02's amber marker until S2.

  **Verify:**
  1. Click "Try a sample". "Changes on this page" says "No changes yet."
  2. Click the "Customer growth" chart and turn on Hide from AI. "Changes on this element" shows "Hidden from AI", and the chart gets the amber "Hidden from AI" marker.
  3. Press Esc. "Changes on this page" shows one line: "Hidden from AI · Customer growth".
  4. Hide "terms of service" too. The page list shows two lines.
  5. Select the chart again and turn the switch off. Only the "terms of service" line is left, and the chart has no marker.
  6. `pnpm test` passes. New core tests check `targetFor`:
     - For the cookie banner, it returns `{ selector: 'aside:1', text: <the first 60 characters of the banner> }`.
     - For an image, the text is the image's description (alt).
  7. `pnpm e2e` passes. 02's demo-mock tests are rewritten:
     - The demo now opens with "No changes yet."
     - A new test hides the chart, checks both changes lists, turns it off, and checks both lists are empty again.
     - The marker test only checks the chart's amber marker. S2 removes it.

- [x] **S2 – The preview shows hidden elements faded (K1–K4)**

  Core gets `markModificationsInTree`, which returns the marked page. The preview now draws the marked page instead of the page as loaded.

  Each hidden element gets a grey veil on top of it, with a "⊘ Hidden from AI" label in the corner. This replaces 02's amber marker. The veil is drawn on top of the element rather than on the element itself, so the selection outline stays sharp and nothing moves (`plan.md` → Rendering the preview).

  **Verify:**
  1. Click "Try a sample" and hide the chart. It turns faded and grey, with "⊘ Hidden from AI" in its top-left corner and no border. The caption and the text below it don't move (K1).
  2. Click somewhere else, then hover the faded chart: the hover outline shows. Click it: it's selected with a sharp outline, and the switch is on (K3).
  3. Turn the switch off. The chart looks normal again (K4).
  4. Select the cookie banner's text, click "Sidebar" in the breadcrumb, and turn the switch on. The whole banner is faded, with one label.
  5. Click the banner's text. This selects the paragraph inside the banner, and its switch is off, because the hide is on the banner, not on the paragraph. A message saying "a parent is hidden" comes in a later task.
  6. `pnpm test` passes. New core tests check `markModificationsInTree`:
     - Hiding an element sets `hidden: true` on that element and gives the hide the status `active`.
     - A hide whose element text has changed gets the status `unmatched`, and nothing is hidden.
     - The page passed to `markModificationsInTree` is not changed, and the parts that weren't hidden are reused as they are.
     - K2: hiding a section sets `hidden: true` on the section, so all its text, links, images and nested elements are inside the hidden part.
     - K4: with no modifications, `markModificationsInTree` returns a page equal to the original.
     - A hide inside a hidden section gets the status `inactive`, and only the section is flagged.
  7. `pnpm e2e` passes. A new test hides the chart and checks that it has `data-hidden="true"`, the label is visible, and the chart hasn't moved. It then turns the switch off and checks the attribute and the label are gone. 02's marker test is deleted.

**Deviations:**
- The `inactive` rule for modifications inside a hidden element (global plan §3.4, step 2) was built here → feature `plan.md` §`markModificationsInTree`, steps 1 and 2

**Done when:** on the demo page, the publisher can hide and un-hide any element from the inspector. A hidden element looks faded in the preview, and nothing moves. The changes lists match `modificationsDraft`. Core tests show that `markModificationsInTree` marks the right element as hidden. `pnpm test`, `typecheck` and `e2e` pass.

---

## T03 – Add context for AI, and see it in the preview

**Goal:** the publisher can attach a short note to any element, explaining it to AI agents, and see it in the preview where the agent will read it.

The flow (`plan.md` → How adding context works):
1. The publisher selects an element and types in the "Context for AI" box.
2. The store adds one `context` entry to `modificationsDraft`, replaces its note as they keep typing, and removes it when the box is cleared.
3. Core's `markModificationsInTree` inserts an `annotation` node into the marked page: first inside a container, right after anything else, and after the whole paragraph or table when the element sits inside one.
4. The preview draws the annotation as a "Context for AI" callout. Clicking it selects its element.

S1 builds steps 1 and 2. S2 builds steps 3 and 4.

Not in this task: the note as Markdown text (05), saving (04).

**Implements:** `plan.md` → `markModificationsInTree` step 3, Context box, Store: `setContext(target, note)`, Drawing the callout.

- [x] **S1 – The Context box writes the note to the draft (K10, K11)**

  The disabled "Context for AI" button becomes a text box with a placeholder suited to the element. Typing adds or updates one `context` entry for the selected element, and clearing the box removes it. The schema's note limit is fixed from 500 to 300 to match the spec. The preview doesn't show the note yet; that's S2.

  **Verify:**
  1. Click "Try a sample", click the chart: the box shows "What does this chart show?". Click a section through the breadcrumb: "What is this section about?".
  2. Select the chart and type "Customer growth from 1,200 to 8,500". "Changes on this element" shows one line, "Context: Customer growth from 1,200 to 8,500". Keep typing: still one line, with the new text (K10).
  3. Click another element, then the chart again: the box shows the note.
  4. Clear the box: the line is gone from both changes lists (K10).
  5. Paste a long text: the box grows to about 10 lines, then scrolls; a counter shows near the end; it stops at 300 characters; the Hide switch and the Forward button stay reachable (K11).
  6. `pnpm test` passes. New tests check `setContext`:
     - A note on a new element adds one `context` entry.
     - A second note on the same element replaces the text and keeps the id.
     - An empty or whitespace-only note removes the entry.
     - The schema rejects a 301-character note.
  7. `pnpm e2e` passes. A new test types a note on the chart, checks the changes lists, clears it, and checks they're empty. The tests expecting a disabled "Context for AI" button are updated.

- [x] **S2 – Notes show in the preview, where the agent will read them (K5–K9)**

  Core's `markModificationsInTree` gets step 3, which inserts each note as an `annotation` node, placed by the element's kind. A note on a hidden element is `inactive` and isn't inserted. The preview draws each annotation as a light "Context for AI" callout that selects its element on click. `PreviewNode` gets `React.memo`, so a keystroke re-renders only the nodes on the path to the edited element.

  **Verify:**
  1. Note on the chart: a callout appears right under the chart (K5, K6).
  2. Note on a section (via breadcrumb): the callout is the first thing inside the section (K7). Same on a list: the callout sits above the bullets.
  3. Note on "terms of service": the sentence stays whole, and the callout comes after the paragraph, labeled `Context for AI (on "terms of service")` (K8).
  4. Note `<script>alert(1)</script> # heading [x](y)`: the callout shows exactly those characters (K9).
  5. Click a callout: its element is selected and the box shows the note.
  6. Hide the chart that has a note: the callout disappears. Un-hide: it's back.
  7. Type quickly in the chart's note: the callout keeps up with the typing, with no visible lag.
  8. `pnpm test` passes. New core tests check step 3:
     - A note on an image becomes the next sibling; on a section, the first child (K6, K7).
     - A note on a link inside a paragraph goes right after the paragraph, with `about` set; a note on a cell goes right after the table (K8).
     - A note on a paragraph and one on its link both land after the paragraph, the paragraph's first.
     - A note on a hidden element, or inside one, is `inactive` and not inserted.
     - The note text is kept exactly as typed (K9), and the input page is unchanged.
  9. `pnpm e2e` passes. Global flow 1 lands: hide the cookie banner and add a note to the chart; the banner is faded and the callout shows under the chart. Clearing the note removes the callout.

**Deviations:**
- A note on a list item sits inside the list after that item, drawn in its own `<li>`; hovering a callout shows no hover box → feature `plan.md` §Drawing the callout

**Done when:** on the demo page, the publisher can add, edit and clear a note on any element, and the preview shows it as a callout placed as the agent will read it. Core tests show every placement rule. `pnpm test`, `typecheck` and `e2e` pass.

---

## Follow-ups

- The e2e test "hovering an element outlines it and names its type" is flaky (about half of runs, already on `f039677`): the hover box is sometimes 512px wide instead of the link's width. Make it wait for the box to settle before measuring.
