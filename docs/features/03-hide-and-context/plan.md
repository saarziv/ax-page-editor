# Hide & Add Context – Plan

How we build the Hide & add context spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- The modification flow (global plan §6.1).
- From 02: `resolve` and `targetSnippet` (§3.3), the `modificationsDraft` list in the store, `useNodeModifications`, and the overlay that draws boxes over elements (02 plan → Modification markers).
- First built here: `markModificationsInTree` steps 1, 2 and 3 (§3.4), `useMarkedPage()` (§5.1), and the `toggleHide` and `setContext` store actions (§5.1).
- Not built here: `prune`, which removes hidden parts from what the agent reads. It comes with 06.

## How hiding works

Hiding an element takes four steps. Each section below explains one of them.

1. **The publisher turns the switch on.** The inspector shows a "Hide from AI" switch for the selected element (Hide switch).
2. **The store records it.** The switch adds one `hide` entry to `modificationsDraft`. Turning it off removes that entry (Store: `toggleHide`).
3. **Core works out what's hidden.** `markModificationsInTree` reads `modificationsDraft` and returns a copy of the page in which the hidden element has `hidden: true`. We call this copy the marked page (`markModificationsInTree`, steps 1 and 2).
4. **The preview draws it.** The preview draws the marked page. A hidden element stays in place, but looks faded and grey, with a "⊘ Hidden from AI" label (Rendering the preview).

Example: the publisher selects the "Customer growth" chart and turns the switch on.
- `modificationsDraft` becomes `[{ id: 'a1', type: 'hide', target: { selector: 'main:1>figure:1>image:1', text: 'Customer growth' } }]`.
- In the marked page, the chart's node has `hidden: true`.
- The preview shows the chart faded and grey, with the label in its corner.

Turning the switch off empties `modificationsDraft`. The marked page is then the same as the original page, and the chart looks normal again.

## How adding context works

Adding a note takes the same four steps as hiding.

1. **The publisher types a note.** The inspector shows a "Context for AI" box for the selected element (Context box).
2. **The store records it.** Each keystroke calls `setContext`. The first one adds one `context` entry to `modificationsDraft`, later ones replace its note, and clearing the box removes it (Store: `setContext`).
3. **Core places the note.** `markModificationsInTree` inserts an `annotation` node into the marked page, at the spot where the agent will read it (`markModificationsInTree`, step 3).
4. **The preview draws it.** The annotation is drawn as a "Context for AI" callout. Clicking it selects the element it belongs to (Drawing the callout).

Example: the publisher selects the "Customer growth" chart and types a note.
- `modificationsDraft` becomes `[{ id: 'b2', type: 'context', target: { selector: 'main:1>figure:1>image:1', text: 'Customer growth' }, note: 'Customer growth from 1,200 to 8,500, Jan to Sep 2026.' }]`.
- In the marked page, the figure's children become `[image, annotation]`.
- The preview shows the callout right under the chart.

## Core

### `targetFor(node)`

A modification remembers its element by a target: the element's id plus the start of its text (global plan §3.3). `targetFor(node)` builds that target: `{ selector: node.id, text: targetSnippet(node) }`.

It lives in core, next to `resolve`. That way, the code that creates a target and the code that later finds the element again use the same rules. Example: the demo's cookie banner gives `{ selector: 'aside:1', text: 'We use cookies to improve your experience. By continuing you' }`.

### `markModificationsInTree`, steps 1 and 2

`markModificationsInTree(root, modifications)` takes the page and the list of modifications. It returns the marked page, plus a status for each modification (contract in global plan §3.4). This feature builds its first three steps. 04 adds step 4 and the `forwards` argument.

1. **Find each element.** `markModificationsInTree` looks up each modification's element with `resolve`. If the element can't be found, the modification gets the status `unmatched`, and nothing is applied. Otherwise its status is `active`.
2. **Hide.** For each hide that was found, `markModificationsInTree` sets `hidden: true` on that element's node. The node and everything inside it stay in the tree. This lets the preview still draw it, so the publisher can click it and turn Hide off. A modification whose element sits inside a hidden element gets the status `inactive` and isn't applied, because the agent never reads that part. Example: with the section hidden, a hide on the image inside it is `inactive`, and only the section is flagged.

**Why `markModificationsInTree` must not change the page it's given:** the page comes from the TanStack Query cache, and the inspector reads the same object. So `markModificationsInTree` never edits it. Instead, it copies only the nodes it changes and the nodes above them, and reuses everything else. Example: hiding `aside:1` copies the root and the aside. The `main` part of the result is the same object as in the original page.

### `markModificationsInTree`, step 3

For each active context, step 3 inserts one `annotation` node. Where it goes depends on the element's `kind` (spec §3, why in D7):

- **Containers** (section, article, nav, header, footer, aside, main, list, table, form, figure): the note becomes the element's first child, so it frames what follows.
- **Everything else:** the note becomes the element's next sibling, right after it.
- **Inside a sentence or a table:** a note right after a link would split its sentence, and one after a cell would break the table. So a link inside a paragraph, heading, list item or quote gets its note right after that enclosing block. Anything inside a table (a row, a cell, a link in a cell) gets its note right after the whole table. In both cases the annotation also carries `about`, the element's target text, so the agent knows which element it explains.

Example: a note on "terms" in `paragraph[text "Read our ", link "terms", text " before signing up."]`. The paragraph stays whole, and `annotation { about: 'terms' }` comes right after it.

**The annotation node** is `{ id: 'context:<modification id>', kind: 'annotation', tag: 'aside', text: note, attrs: { forId: <element id>, about? } }`. `context` isn't a node kind, so this id never clashes with a selector. Inserting it doesn't renumber anything, because ids are fixed by `clean` and every target is resolved on the original page, before any insertion.

**Two notes at one spot:** a note on a paragraph and a note on a link inside it both go after the paragraph. They keep reading order, so the paragraph's own note comes first.

**A note on a hidden element is `inactive`.** Step 2 makes modifications inside a hidden element inactive. A note on the hidden element itself needs the same rule: it would be placed outside it, as its next sibling, and the agent would read a note about something that isn't there. So for context and forward, step 2's rule is "inside or on a hidden element". The hide itself stays active.

**Same copy rule as Hide:** only the nodes that get a new child, and their ancestors, are copied. Everything else is shared.

**The note is never parsed** (K9). It's stored as the annotation's `text`, and every renderer escapes it.

**How we check what the agent gets, before 06:** there's no Markdown view yet, so K2 and K4 are checked on the marked page (spec, Out of scope).
- K2: the hidden flag is set on the element itself, so everything inside it (text, links, images) is inside the hidden part.
- K4: with no modifications, `markModificationsInTree` returns a page equal to the original. So turning Hide off leaves nothing behind.
- K6–K8: the annotation sits at the right spot in the marked page, which is the order `renderMarkdown` will read it in.

## Web

### Hide switch

In the inspector, the disabled "Hide from AI" button becomes a row with the label on the left and a shadcn `Switch` on the right.

The switch's state is never stored. It's on when the selected element has a hide in `modificationsDraft`. The inspector already knows this from `useNodeModifications` (02). So when the publisher clicks an element that's already hidden, the switch shows on (K3) without extra code.

"Forward this link" stays a disabled button until 04.

### Store: `toggleHide(target)`

The switch calls `toggleHide(targetFor(node))`.
- If `modificationsDraft` already has a hide with exactly this target, the action removes it.
- Otherwise, it adds `{ id: crypto.randomUUID(), type: 'hide', target }`.

So an element can never have two hides, and no component needs to check for that. Example: turning the banner's switch on and then off leaves `modificationsDraft` exactly as it was.

**The demo mock is removed** (spec, intro). Now that the publisher can make real changes, every page opens with an empty `modificationsDraft`, the demo included. `DEMO_MODIFICATIONS` is deleted, and `DEMO_URL` stays. The changes lists from 02 keep working, because they read `modificationsDraft`, not the mock.

### Context box

The disabled "Context for AI" button becomes a labeled text box.

Like the Hide switch, its value is never stored locally. It reads the selected element's note from `modificationsDraft` through `useNodeModifications`. So selecting another element shows that element's note, with no extra code.

- **Placeholder by kind:** image or figure → "What does this chart show?". Link, button or field → "What happens when someone clicks this?". Containers → "What is this section about?". Anything else → "What should an AI know about this?".
- **Size (K11):** the box starts at 3 lines, grows with the text up to about 10, then scrolls inside itself. It never gets wider than the inspector.
- **Limit (K11):** `maxLength` stops input at 300 characters. A counter ("280 / 300") appears from 250.

### Store: `setContext(target, note)`

The box calls `setContext(targetFor(node), text)` on every change.
- If the note is empty or only whitespace, the action removes the element's context.
- If the element already has a context with exactly this target, the action replaces its `note` and keeps its `id`.
- Otherwise, it adds `{ id: crypto.randomUUID(), type: 'context', target, note }`.

So an element can never have two notes (K10), and no component needs to check for that. The note is stored as typed, not trimmed, so spaces aren't eaten while the publisher types.

There's no debounce: it would need the box to keep its own copy of the note, and the preview would lag behind the typing. Instead, `PreviewNode` is wrapped in `React.memo`. On each keystroke, `markModificationsInTree` copies only the nodes on the path to the edited element, and every other node is the same object as before. So React skips them and re-renders only that path.

### Rendering the preview

**The preview draws the marked page.** Until now it drew the page as loaded. Now it draws the result of `useMarkedPage(url)`, a hook in `state/derived.ts`. The hook runs `markModificationsInTree` on the page and `modificationsDraft` inside a `useMemo`. So it only runs again when the page or `modificationsDraft` changes, not when the publisher hovers or selects.

When `PreviewNode` draws a node with `hidden: true`, it adds `data-hidden="true"` to the element. Nothing else about the element changes.

**The faded look is drawn on top of the element, not on it.** There are two reasons:
- If we faded the element itself with `opacity`, its selection outline would fade too. A selected hidden element would hardly look selected.
- The label can't be placed inside an `<img>` or a `<tr>`. 02's markers had the same problem.

So we turn 02's `ModificationLayer` into `HiddenLayer`. It measures element positions the same way, but it now finds its elements by `[data-hidden="true"]` instead of reading `modificationsDraft`. Over each hidden element it draws:
- a veil: a half-transparent background with `backdrop-filter: grayscale(1)`, which makes what's underneath look faded and grey,
- a small grey "⊘ Hidden from AI" label in the top-left corner,
- no border and no stripes.

What this gives us:
- **Still clickable (K3):** the veil lets clicks and hovers through to the element.
- **Clear selection:** the veil covers only the element's box. The selection outline is drawn 2px outside the box, so it stays sharp.
- **Nothing moves (K1):** the veil floats on top and takes no space.
- **No double fading:** a hidden element inside another hidden element gets no veil of its own.

### Drawing the callout

`PreviewNode` draws an `annotation` node as a light box with a small "Context for AI" label, and the note under it as plain React text. React escapes it, so `<script>` shows as those characters (K9). With `about`, the label reads `Context for AI (on "terms")`.

**Clicking the callout selects its element.** The callout carries `data-context-for={forId}`, and `Preview`'s click handler looks for it as well as `data-node-id`. It deliberately doesn't reuse `data-node-id`: the hover and hidden layers find elements by that attribute, and two elements with one id would confuse them.

**Lists and tables need care.** A note on a list or table is its first child, but a `<div>` can't sit inside `<ul>` or `<tbody>`. So for those two kinds, `PreviewNode` draws the annotation children just above the `<ul>` or `<table>`, and the rest inside it.

**02's amber markers go away.** Hidden elements now have their real look. Context and forward get their own look in their own tasks. The two changes lists still show every modification.

## Tests

- **Core unit tests** for `targetFor` and `markModificationsInTree` (steps 1, 2 and 3), and store tests for `setContext`. The cases are listed in `tasks.md`.
- **E2E:** T01 updates the two tests that expect a disabled "Hide from AI" button. T02 replaces 02's demo-mock tests (the three markers, and the demo opening with changes) with tests that hide and un-hide an element. T03 adds a note on the chart and checks the callout, which lands global flow 1 (§8) for the preview.
