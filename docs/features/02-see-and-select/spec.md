# See & Select the Page – Spec

See the page the way an agent receives it, and pick elements to change. Part of AX Editor: see the global `spec.md` for the problem, users, core concepts, agent output format and trust & safety rules.

This feature has four parts: the editor layout, the preview, selecting & inspecting, and the Markdown view.

---

## 1. Editor layout

```
┌──────────────────────────────────────────────────────────────────┐
│ [ example.com/pricing        ] [Open]  [ Page | Markdown ]  ● Save │
├────────────────────────────────────────┬─────────────────────────┤
│  PREVIEW                               │  INSPECTOR              │
│                                        │                         │
│  Pricing that scales with you          │  Link  <a>              │
│                                        │  "Read our terms"       │
│  ┌──────────────────────────────────┐  │  → acme.com/terms       │
│  │░░ Hidden from AI ░ cookie banner ░│  │  Main › Section › Link  │
│  └──────────────────────────────────┘  │                         │
│                                        │  [ ] Hide from AI       │
│  ┃ Context: Monthly revenue Jan–Sep    │                         │
│  [ chart image ]                       │  Context for AI         │
│                                        │  [ ................ ]   │
│  ┌ Read our terms ┐ ← selected         │                         │
│  └────────────────┘                    │  [ Forward this link ]  │
│  ▾ Forwarded: acme.com/terms (~2k)     │                         │
│     1. Subscriptions renew monthly...  │  Changes on this: 1  ✕  │
└────────────────────────────────────────┴─────────────────────────┘
```

**What:** Two panels. Left: the preview. Right: the inspector. A top bar with URL, view toggle, change count and Save.

**Why:** Matches the familiar inspector pattern (Webflow, Elementor) the target users already know, and satisfies the required two-panel layout.

**Behavior**

- **Top bar:** URL field, **Page | Markdown** toggle, change count, Save button with an "unsaved" dot.
- **Left panel** switches between two views of the same result:
  - **Page:** the preview (section 2).
  - **Markdown:** the exact agent output (section 4).
- **Right panel** is always the inspector, so editing works from either view.

**Acceptance criteria**

- Given an element is selected, when the user switches between Page and Markdown, then the selection and the inspector stay as they were.
- Given the Markdown view is shown, when the user changes a modification in the inspector, then the Markdown updates immediately.

## 2. Preview

**What:** The page as an agent receives it after modification, shown in a way a human can read and click.

**Why, and the key decision:** The assignment asks for the preview "as it would be served to an agent after modification". Agents don't see CSS, so the preview is the **clean page rendered as semantic HTML with the editor's own readable styling** (like a browser's Reader Mode), **not** the original site's design.

- It's honest: what you see is what the agent gets, structurally.
- It's reliable: inserting notes, forwarded content and hidden markers into an arbitrary site's layout breaks things (overlap, positioning, hidden menus). A consistent reading layout doesn't.
- It's safe: nothing from the original page runs.
- It's still recognizable: publishers recognize their page by its content (headings, text, images), not its colors. An **"Open original"** link is always available for comparison.

**Behavior**

- Rendered in a clean reading layout: proper heading sizes, paragraphs, lists, tables, images with descriptions, links styled as links, forms shown as labeled fields.
- Landmark sections (header, navigation, main, footer, aside) are shown as lightly labeled regions, so users understand page structure ("Navigation", "Footer").
- Modifications are always visible on the element (this is the **visual diff overlay**):
  - **Hidden:** element stays in place, faded and striped, with a "Hidden from AI" badge. It stays clickable so it can be un-hidden.
  - **Context:** a highlighted note shown where the agent will read it (see the Hide & add context spec).
  - **Forwarded:** a collapsible block under the link with the fetched content, its source, and its approximate size (see the Forward a link spec).
- The preview is a readable, near-agent view with every modification visible. The **literal** agent output is the Markdown view (section 4), reached via the **Page | Markdown** toggle. There is no separate "agent-exact" preview mode.

**Acceptance criteria**

- Given a loaded page, then no script from it runs and no element from it can trigger navigation.
- Given any modification, when applied, then the preview reflects it immediately, without saving.
- Given a hidden element, then the preview still shows it (ghosted) and the Markdown view does not contain it.
- Given a page with landmark sections, then each is shown as a labeled region ("Navigation", "Footer", ...).
- Given a loaded page, then an "Open original" link opens the original URL outside the editor.

## 3. Select & inspect

**What:** Hover to identify, click to select, inspect in the side panel.

**Why:** Selection is the entry point to every modification and must work for non-developers.

**Behavior**

- **Hover:** outline the element and show a small plain-language label ("Heading", "Paragraph", "Link", "Image", "List", "Table", "Form field", "Section", "Navigation").
- **Click:** select it. The selected element gets a strong, distinct highlight (different from hover and from modification markers).
- Clicking selects the **innermost** element. To reach a container, the inspector shows a **breadcrumb** (e.g. `Main › Section › Paragraph`) where each step is clickable, plus a "Select parent" action.
- **Esc** or clicking empty space deselects.
- **Single selection** only.
- Only meaningful elements of the clean page are selectable (no empty wrappers or decorative elements).

**Inspector, with an element selected**

- Element type in plain words, with its tag shown small (e.g. "Link `<a>`").
- Text content (truncated, expandable). For images: their description. For links: destination.
- Breadcrumb.
- Controls: Hide from AI, Context for AI, Forward this link (links only). Their behavior is defined in the Hide & add context and Forward a link specs.
- Modifications already on this element, each removable.

**Inspector, nothing selected**

- The **changes list** for the whole page (defined in the Save & review changes spec).

**Acceptance criteria**

- Given any element, when hovered, then it's outlined with its plain-language type.
- Given any element, when clicked, then it's highlighted and the inspector shows its type, tag, text and current modifications.
- Given a nested element is selected, when the user clicks a breadcrumb step, then that ancestor becomes selected.
- Given a nested element is selected, when the user clicks "Select parent", then its parent becomes selected.
- Given an element is selected, when the user presses Esc or clicks empty space, then nothing is selected and the inspector shows the changes list.
- Given an image is selected, then the inspector shows its description; given a link, its destination.

## 4. Markdown view (what the agent reads)

**What:** The left panel switched to the exact Markdown an agent receives.

**Why:** The strongest moment in the product: the publisher sees, literally, what the AI gets. It turns an abstract idea into something concrete.

**Behavior**

- Read-only, updates live as modifications change.
- Shows an approximate **token count**, so publishers see the cost of forwards.
- Copy and download buttons.
- Same output as Agent View for the same page and configuration.

**Acceptance criteria**

- Given any set of modifications, then the Markdown view matches what Agent View returns for the same page and saved configuration.
- Given the Markdown view, when the user clicks Copy, then the full Markdown is on the clipboard; when they click Download, then they get a `.md` file with the same content.
- Given a forward is added, then the token count increases accordingly.

## Out of scope

- **Multi-select:** apply one modification to several elements at once.
- **Linking Markdown lines to elements:** click a line in the Markdown view to select its element.
