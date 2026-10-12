# Hide & Add Context – Spec

The two in-place modifications: remove an element from what agents read, or explain it to them. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, agent output format, configuration format and trust & safety rules.

Both are applied from the inspector on the selected element (see the See, select & inspect spec), and both show up immediately in the preview and the Markdown view.

---

## 1. Hide from AI

**What:** Mark an element so agents never see it.

**Why:** Agents treat everything in the page as content. Cookie banners, promos, repeated nav, stale content and internal notes dilute or distort their summary.

**Behavior**

- A toggle in the inspector: "Hide from AI".
- In the **agent output**, the element and everything inside it are **removed entirely**. Not visually hidden, not marked as hidden: absent. (CSS hiding or accessibility attributes don't hide anything from an agent, which reads the source.)
- In the **preview**, the element is faded and striped with a badge, and stays clickable to undo.

**Acceptance criteria**

- Given an element is hidden, then neither its text nor anything inside it appears in the agent output.
- Given a hidden element, when clicked, then the inspector allows un-hiding it.
- Given an element is hidden, when it is un-hidden, then it reappears in the agent output exactly as before.
- Given an element inside a hidden element is selected, then the inspector says "Hidden because a parent is hidden from AI" and links to that parent.
- Given an element has context or forward (on itself or inside it), when it is hidden, then those modifications are kept, shown as inactive ("Not applied: element is hidden"), and absent from the agent output.
- Given such inactive modifications, when the element is un-hidden, then they become active again with no change to their content.

**Edge cases**

- **Element inside a hidden element:** the inspector says "Hidden because a parent is hidden from AI" and links to that parent.
- **Hiding an element that has context or forward (on itself or inside it):** allowed. Those modifications are kept but marked **inactive** ("Not applied: element is hidden"). Un-hiding restores them.

## 2. Add context

**What:** Attach a short explanation to any element, written for AI agents.

**Why:** This is the only modification that adds information that doesn't exist on the page: what a chart shows, what a button actually does, what a section is for. An agent cannot infer this any other way.

**Where context lives in the output (the key decision)**

Agents read pages as a linear stream of text and summarize it. So context only works if it **survives text conversion** and **sits next to what it describes**.

| Option                                                | Verdict                                                                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Attributes on the element (title, aria-label, data-*) | Rejected. Usually dropped when pages are converted to text.                                                                |
| Metadata in the page head / structured data           | Rejected. Survives, but far from the element; the agent has to connect a note to "the chart in section 3" and often won't. |
| **Inline, real text next to the element**             | **Chosen.** Survives every conversion, read in the right place.                                                            |

Rules:

1. **Inline real text**, not attributes.
2. **Labeled as an annotation**, so the agent knows it's the publisher explaining, not page content. In Markdown: `> **Context:** This chart shows monthly revenue, Jan to Sep 2026.` In semantic HTML: a clearly labeled block of real text adjacent to the element.
3. **Placed by element type:**
   - **Containers** (sections, articles, navigation, lists, tables, forms): **first thing inside**, so the agent reads the framing before the content.
   - **Leaf elements** (images, charts, links, buttons, form fields, paragraphs, headings): **right after**, explaining what was just read.
4. **Plain text only.** No HTML or Markdown from the user; it's escaped. Length limit (500 characters) with a visible counter.

**Behavior (editor)**

- A text area "Context for AI" with placeholder examples tailored to the element type ("What does this chart show?", "What happens when someone clicks this?").
- The note appears in the preview exactly where the agent will read it.
- One context note per element; editing replaces it. Clearing the text removes the modification.

**Acceptance criteria**

- Given context on an image, then in the Markdown output it appears as a labeled block directly after the image.
- Given context on a section, then in the Markdown output it appears as the first block inside that section.
- Given context containing `<script>` or Markdown syntax, then it appears as literal text and never as markup.
- Given an empty note, when saved, then no modification is stored.
- Given a note being typed, then a counter shows the characters used out of 500, and input beyond 500 characters is not accepted.
- Given an element that already has a note, when the user edits it, then the element still has exactly one note, with the new text.
- Given context on any element, then the semantic HTML output contains it as a labeled block of real text in the same position as in Markdown.

## Out of scope

- **Page summary:** a page-level context note placed at the top of the output.
