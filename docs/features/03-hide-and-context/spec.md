# Hide & Add Context – Spec

The two in-place modifications: remove an element from what agents read, or explain it to them. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, agent output format and trust & safety rules.

Both are applied from the inspector on the selected element (02), and both show up in the preview immediately, in the same spot where the agent output has them. This feature replaces the Hide and Context stubs with real controls and removes the demo page's mock modifications from 02. Forward stays a stub until 04.

All ACs are **Key** (must ship). Error handling is basic: no control fails silently or crashes the editor.

---

## 1. Layout

The inspector for a selected element keeps its details from 02. Below them, the stubs become two real controls: a **Hide from AI** switch and a **Context for AI** text box.

```
┌────────────────────────────────────────┬─────────────────────────┐
│  PREVIEW                               │  INSPECTOR              │
│                                        │  Image                  │
│  ┌──────────────────────┐              │  Tag: <img>             │
│  │ ⊘ Hidden from AI     │              │  Main › Figure › Image  │
│  │ We use cookies…      │ ← faded      │                         │
│  └──────────────────────┘              │  Description            │
│                                        │  "Customer growth"      │
│  ┏━━━━━━━━━━━━━━━━━━━━━━┓              │                         │
│  ┃ [ growth chart ]     ┃ ← selected   │  Changes on this        │
│  ┗━━━━━━━━━━━━━━━━━━━━━━┛              │  Context: Customer…     │
│  ┃ Context for AI       ┃              │  ─────────────────────  │
│  ┃ Customer growth from ┃ ← note       │  Hide from AI   [ off ] │
│  ┃ 1,200 to 8,500, Jan  ┃              │                         │
│  ┃ to Sep 2026.         ┃              │  Context for AI         │
│                                        │  ┌───────────────────┐  │
│                                        │  │ Customer growth…  │  │
│                                        │  └───────────────────┘  │
│                                        │                         │
│                                        │  [Forward]   (stub)     │
└────────────────────────────────────────┴─────────────────────────┘
```

## 2. Hide from AI (Key)

**What:** Mark an element so agents never see it.

**Why:** Agents treat everything on the page as content. Cookie banners, promos, repeated navigation and stale content dilute or distort what they read.

**Behavior**

- A **Hide from AI** switch in the inspector. Turning it on hides the selected element; turning it off restores it.
- In the **agent output**, the element and everything inside it are **removed entirely**: its text, links, image addresses and descriptions. It isn't marked as hidden or hidden with CSS. It's just not there, because an agent reads the source and would still see anything that's only hidden visually.
- In the **preview**, the element stays in place so it can be undone, but it's clearly "switched off":
  - its content is **faded and greyed out** (low opacity, no color),
  - a small **"⊘ Hidden from AI"** label sits at its top-left corner,
  - no colored border or stripes, so a page with several hidden parts still reads calmly.
- A hidden element stays hoverable and clickable, so the user can select it and turn the switch off.

**Key acceptance criteria**

- **K1.** Given an element is selected, when the user turns on Hide from AI, then in the preview it fades to grey with a "Hidden from AI" label, and nothing on the page shifts.
- **K2.** Given an element is hidden, then neither its text nor anything inside it (links, images, nested elements) appears in the agent output.
- **K3.** Given a hidden element, when the user clicks it, then it's selected and the switch shows as on.
- **K4.** Given a hidden element, when the user turns the switch off, then it looks normal again in the preview and reappears in the agent output exactly as before.

## 3. Add context (Key)

**What:** Attach a short plain-text note to any element, written for AI agents: what a chart shows, what a button or form field does, what a section is about.

**Why:** It's the only modification that adds information the page doesn't have. An agent can't read a chart's pixels or guess what happens after a click.

**Where the note lives in the output.** Agents read a page as one stream of text, top to bottom. So the note is **real text, inline, next to the element**, labeled so the agent knows it's the publisher explaining, not page content (why: global `spec-decisions.md` D7). Where exactly depends on the element:

- **Containers** (section, article, navigation, header, footer, sidebar, main, list, table, form, figure): the note comes **first**, before the content, so it frames what follows.
- **Everything else** (image, link, button, field, heading, paragraph, quote, code): the note comes **right after** the element, explaining what was just read.
- **Inside a sentence or table:** a note can't sit right after a link in the middle of a sentence, or after a single table cell, without breaking it. Then it goes right after the enclosing paragraph or table, and names the element it's about.

Examples in Markdown:

```markdown
![Customer growth chart](growth.png)

> **Context:** Customer growth from 1,200 to 8,500, Jan to Sep 2026.
```

```markdown
> **Context:** Books a sales demo. Only the email is required.

- Email
- Company
- [Book demo]
```

```markdown
Read our [terms](https://acme.com/terms) before signing up.

> **Context** (on "terms"): Monthly plans, cancel anytime.
```

Semantic HTML gets the same note in the same position, as a labeled block of real text.

**Behavior**

- A **Context for AI** text box in the inspector, with a placeholder suited to the element type ("What does this chart show?", "What happens when someone clicks this?", "What is this section about?").
- The box **grows with the text**: it starts at 3 lines and grows to about 10, then scrolls inside itself. It never gets wider than the inspector, and the inspector scrolls as a whole, so the controls below it stay reachable.
- The note appears in the **preview** as a callout in the same spot as in the output: a light box with a "Context for AI" label, clearly different from page content. Clicking it selects the element it belongs to.
- One note per element. Editing replaces it, and clearing the text removes it.
- **Plain text only, at most 300 characters.** A counter appears once the note gets close to the limit, and input beyond 300 isn't accepted. Anything that looks like HTML or Markdown appears as literal text, never as markup.

**Key acceptance criteria**

- **K5.** Given an element is selected, when the user types a note, then the preview shows it as a labeled callout, placed as in the agent output (K6, K7).
- **K6.** Given a note on an image, link, button or other non-container, then in the agent output it appears as a labeled block directly after that element.
- **K7.** Given a note on a section, list, table, form or other container, then in the agent output it appears as a labeled block before that container's content.
- **K8.** Given a note on a link inside a sentence, then in the agent output the sentence stays whole and the note follows the paragraph, naming the link.
- **K9.** Given a note containing `<script>`, `# heading` or `[x](y)`, then it appears in the preview and the agent output as those literal characters.
- **K10.** Given an element with a note, when the user edits it, then the element still has exactly one note, with the new text. When the user clears it, then the note is gone from the preview and the agent output.
- **K11.** Given the user types a long note, then the text box grows up to about 10 lines and then scrolls, nothing in the inspector overlaps or is pushed out of reach, and input beyond 300 characters is not accepted.

## Out of scope

- **Markdown view** (Page | Markdown toggle) and turning the output into Markdown text: 06. Until then, the agent output ACs are checked on the editor's marked page, which holds every decision about the output: hidden parts flagged, notes in place, note text unchanged. 06 checks that hidden parts are actually gone from the text.
- Saving, and the full changes list with statuses and remove buttons: 05.
- **Inside a hidden element:** the "Hidden because a parent is hidden from AI" message, and showing context or forward inside a hidden element as inactive (D18): later.
- **Page summary:** a page-level note at the top of the output.
- Rich text, links or formatting in notes. More than one note per element.
- Hiding only part of an element's text.
