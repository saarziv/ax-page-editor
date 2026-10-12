# See, Select & Inspect – Spec

Click an element in the preview to select it, and see what it is in the inspector. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts and trust & safety rules.

Selection is the entry point to every modification (03, 05), so it must be obvious to a non-developer which element is selected and what it is.

ACs are in priority order: **Key** first (must ship), then **Secondary** (must ship, after the key ones), then **Bonus** (if time allows). Error handling is basic: nothing selectable fails silently or crashes the editor.

---

## 1. Layout

The two-panel editor from 01 stays: preview on the left, inspector on the right. What the inspector shows depends on whether an element is selected.

**An element is selected:** the element's details at the top, the modification buttons below them.

```
┌──────────────────────────────────────────────────────────────────┐
│ [ example.com/pricing        ] [Open]                            │
├────────────────────────────────────────┬─────────────────────────┤
│  PREVIEW                               │  INSPECTOR              │
│                                        │  Link                   │
│  Pricing that scales with you          │  Tag: <a>               │
│                                        │  Main › Section › Link  │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓      │                         │
│  ┃ Read our terms               ┃ ← selected                     │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛      │  Text                   │
│                                        │  "Read our terms"       │
│  ┌ Hidden from AI ┐                    │  → acme.com/terms       │
│  │ We use cookies │ ← modified (bonus) │                         │
│  └────────────────┘                    │  Changes on this        │
│                                        │  No changes on this     │
│                                        │  element.               │
│                                        │  ─────────────────────  │
│                                        │  [Hide] [Context]       │
│                                        │  [Forward]   (stubs)    │
└────────────────────────────────────────┴─────────────────────────┘
```

**Nothing selected:** a hint at the top, the page's changes list at the bottom.

```
┌────────────────────────────────────────┬─────────────────────────┐
│  PREVIEW                               │  INSPECTOR              │
│                                        │  Click an element in    │
│  ...                                   │  the preview to         │
│                                        │  inspect it.            │
│                                        │                         │
│                                        │  ─────────────────────  │
│                                        │  Changes on this page   │
│                                        │  No changes yet.        │
└────────────────────────────────────────┴─────────────────────────┘
```

The disabled Hide / Context / Forward stubs from 01 show only when an element is selected, below its details. 03 and 05 make them work.

## 2. Select an element (Key)

**What:** Click an element in the preview to select it. The selected element gets a clear, clean highlight.

**Behavior**

- Clicking an element selects it. A click selects the **innermost** meaningful element under the pointer, for example the link, not the paragraph around it.
- The selected element gets one strong, distinct highlight, such as a colored outline with a light tint. It's clearly visible but doesn't cover or shift the content.
- **Single selection:** selecting another element moves the highlight.
- Only meaningful elements of the clean page are selectable: the parts `clean` keeps, not wrappers.
- Clicking a link in the preview selects it and never navigates.

**Key acceptance criteria**

- **K1.** Given a loaded page, when the user clicks an element, then that element is highlighted as selected.
- **K2.** Given nested elements (a link inside a paragraph), when the user clicks the link, then the link is selected, not the paragraph.
- **K3.** Given an element is selected, when the user clicks a different element, then only the new one is highlighted.
- **K4.** Given a link in the preview, when the user clicks it, then it's selected and the page does not navigate.

## 3. Inspect the selection (Key)

**What:** The top of the inspector shows what the selected element is and what's been changed on it, in plain words. The modification stub buttons sit below these details (see Layout).

**Behavior**

- **Type and tag:** the type in plain words ("Link", "Heading", "Image"), with its HTML tag always shown under it ("Tag: `<a>`", "Tag: `<h2>`", "Tag: `<img>`").
- **Text content**, truncated with a "Show more" toggle when long. For images: their description (alt). For links: their destination too.
- **Current modifications** on this element, one line each in plain words ("Hidden from AI", "Context: …"). If there are none: "No changes on this element."
- Updates immediately when the selection changes.

**Key acceptance criteria**

- **K5.** Given an element is selected, then the top of the inspector shows its plain-language type and its HTML tag (e.g. "Link", "Tag: `<a>`"), with the modification stub buttons below the details.
- **K6.** Given an element is selected, then the inspector shows its text content. Long text is truncated and can be expanded.
- **K7.** Given an image is selected, then the inspector shows its description. Given a link is selected, then it also shows its destination.
- **K8.** Given a selected element with modifications, then the inspector lists each one. Given one without, then it says "No changes on this element."

## 4. Secondary: hover, deselect, reach containers, empty state

**Behavior**

- **Hover:** a light outline (lighter than the selection) and a small plain-language label ("Heading", "Link", "Image", "List", "Section", "Navigation").
- **Deselect:** Esc or a click on empty preview space clears the selection.
- **Reach a container:** because a click picks the innermost element, the inspector shows a breadcrumb (`Main › Section › Paragraph`) where each step is clickable.
- **Nothing selected:** the inspector shows a hint at the top ("Click an element in the preview to inspect it.") and a simple **changes list** of all modifications on the page at the bottom. Until 03 it's empty ("No changes yet."), except on the demo page, where it shows the mock modifications (section 5). The full grouped list with statuses comes in 04.

**Secondary acceptance criteria**

- **S1.** Given any selectable element, when hovered, then it's outlined with its plain-language type, visibly lighter than the selection highlight.
- **S2.** Given an element is selected, when the user presses Esc or clicks empty preview space, then nothing is selected.
- **S3.** Given a nested element is selected, then the inspector shows its breadcrumb. When the user clicks a step, then that ancestor becomes selected.
- **S4.** Given nothing is selected, then the inspector shows the hint at the top and the page's changes list at the bottom ("No changes yet." when empty), with no modification buttons.

## 5. Bonus: visual diff overlay

**What:** Every element that has a modification is marked in the preview, so the user sees at a glance what's been changed, even when nothing is selected.

**Behavior**

- A modified element gets a subtle marker, such as a soft outline or tint, plus a small badge naming the change: "Hidden from AI", "Context", "Forwarded". The marker looks different from the hover and selection styles, and an element can be both modified and selected.
- Keep it simple: no ghosting, no inline notes. 03 and 05 refine how each type looks.
- **Mock for testing:** until 03 adds real controls, the demo page opens with a few sample modifications (e.g. the cookie banner hidden, context on the chart image). Real URLs open with none. The mock goes away when 03 lands.

**Bonus acceptance criteria**

- **B1.** Given the demo page, then each element with a mock modification shows a marker and a badge naming its type.
- **B2.** Given a modified element is selected, then it shows both the selection highlight and its modification badge, and the inspector lists its modifications (K8).
- **B3.** Given the demo page, when nothing is selected, then the changes list shows the mock modifications.

## Out of scope

- **Markdown view** (Page | Markdown toggle, token count, copy/download): moved to a later feature.
- **Select parent button:** the breadcrumb covers it.
- Landmark region labels and the "Open original" link in the preview.
- Multi-select. Linking Markdown lines to elements.
- Advanced edge cases: keyboard navigation between elements, very large pages.
