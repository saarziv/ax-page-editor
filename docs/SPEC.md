# AX Editor – Spec

This document describes **what** we are building and **why**. Technology, architecture and implementation choices live in `plan.md`.

---

## 1. Problem

More and more visits to publishers' sites come from AI agents, not humans. Agents read pages differently:

- They fetch the raw page and **do not run JavaScript**. Content loaded by scripts is invisible to them.
- They **ignore design**. Layout, color, and CSS-hidden elements mean nothing; everything in the page source is "visible".
- They usually **convert the page to plain text or Markdown** before reading it. Attributes, metadata and anything that isn't real text tend to get dropped along the way.
- They **don't follow links**. "See our terms" stays a pointer, not an answer.
- They **summarize**. Noise (cookie banners, nav, promos) dilutes the summary; things that only make sense visually (charts, icons, buttons) get lost.

A publisher has no way today to see their page the way an agent does, or to shape it. The result is agents that misunderstand, under-represent, or misquote their content.

## 2. End users

The end users are publishers and website owners. **Not developers.**

Implications:

- No HTML, CSS or selector knowledge required. Elements are described in plain words ("Heading", "Link", "Image", "Form field"), with the technical tag shown secondarily.
- Every change is visible immediately, where it happens.
- Errors are explained in plain language with a reason, not codes.
- The tool must make the abstract ("what an agent reads") concrete and visible.Show exactly what agents get



## 3. Goals / Non-goals

**Goals**

- Let a publisher load any page, see it the way an agent receives it, and change that.
- Support three modifications: **Hide**, **Add context**, **Forward a link**.
- Produce a saved configuration that is **minimal, stable, and usable without the editor**, by a downstream service that serves agents.
- Prove that last point with a working endpoint that applies a saved configuration to the live page.

**Non-goals**

- Editing how the page looks to humans.
- Rewriting page text, or adding arbitrary new elements.
- Running page JavaScript or rendering single-page apps.
- Detecting agents and serving them in production (described, not built).
- Multi-user accounts, permissions, publishing workflows.



## 4. Core concepts


| Term                    | Meaning                                                                                                                                                                                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Page**                | The web page at a given URL, as fetched raw (no JavaScript executed).                                                                                                                                                                                                   |
| **Clean page**          | The page reduced to its meaningful content structure: headings, text, links, lists, tables, images (with their descriptions), forms, and landmark sections. Scripts, styles, tracking and empty wrappers removed. This is what both the editor and the agent work from. |
| **Element**             | One selectable node of the clean page.                                                                                                                                                                                                                                  |
| **Modification**        | One change a user applies to one element: hide, context, or forward.                                                                                                                                                                                                    |
| **Target**              | How a modification remembers its element: the element's position in the clean page plus a short snippet of its text, so we can find it again and confirm it's still the same element.                                                                                   |
| **Configuration**       | All modifications for one page URL. The only thing that is saved.                                                                                                                                                                                                       |
| **Preview**             | The editor's left panel: the clean page with all modifications applied and visibly marked.                                                                                                                                                                              |
| **Agent output**        | What an agent actually receives: the clean page with modifications applied, as Markdown (primary) or semantic HTML.                                                                                                                                                     |
| **Downstream consumer** | Any service that takes a page + its configuration and produces the agent output. In production: the publisher's server or CDN. In this project: the Agent View endpoint.                                                                                                |




## 5. User flow

1. User opens the editor and lands on the **start screen**.
2. User enters a URL (or picks a sample page / a recent page) and opens it.
3. The editor shows the **preview** (left) and the **inspector** (right). If a configuration was saved for this URL, it's restored.
4. User hovers elements to see what they are, clicks one to select it.
5. The inspector shows the element and its controls. User hides it, adds context, or forwards it (links only).
6. The change appears in the preview immediately. User repeats across the page.
7. User switches to the **Markdown** view at any time to see exactly what an agent will read.
8. User reviews all changes in the changes list and removes any they don't want.
9. User saves. Reopening the URL later restores everything.
10. A downstream consumer (Agent View) can now serve the modified page to agents.

---



## 6. Features



### 6.1 Start screen & loading a page

**What:** A focused entry screen whose only job is to get a page open.

```
┌──────────────────────────────────────────────────┐
│  AX Editor                                       │
│                                                  │
│    See your page the way AI agents read it.      │
│    [ https://your-site.com/page         ] [Open] │
│                                                  │
│    Try a sample:  Article · Product · Pricing    │
│    Recent:  example.com/blog/post  · 3 changes   │
└──────────────────────────────────────────────────┘
```

**Why:** The first thing a publisher needs is their own page on screen. Sample pages let anyone (including reviewers) try every feature with no network issues, using pages designed to exercise each modification (a chart, a form, links worth forwarding, a cookie banner). Recent pages make returning to work one click.

**Behavior**

- The URL bar stays visible in the editor's top bar, so a different page can be opened at any time.
- Opening a URL fetches the page server-side, exactly as an agent would (no JavaScript).
- The URL is normalized (lowercase host, no trailing slash, tracking parameters like `utm_*` removed) and redirects are followed. The final URL is the one shown and the one configurations are saved under.
- While loading, the preview shows a loading state.
- If there is a saved configuration for the URL, it's restored and the change count is shown.

**Acceptance criteria**

- Given a valid public URL, when the user opens it, then the clean page appears in the preview.
- Given a URL with a saved configuration, when opened, then all its modifications are shown in the preview and changes list.
- Given `example.com/page/?utm_source=x`, when opened, then it resolves to the same configuration as `example.com/page`.
- Given unsaved changes, when the user opens another URL or leaves, then they are warned first.

**Edge cases (each a clear, plain-language state, not a toast)**


| Case                                    | What the user sees                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid URL / not http(s)               | "That doesn't look like a web address."                                                                                                                             |
| Private or local address                | "This address can't be opened for security reasons."                                                                                                                |
| Not an HTML page (PDF, image, JSON)     | "This link isn't a web page."                                                                                                                                       |
| Too large                               | "This page is too large to load."                                                                                                                                   |
| Timeout / unreachable                   | "The site didn't respond." with Retry                                                                                                                               |
| Page is mostly empty (JavaScript-built) | The page opens, with a banner: "This page is built with JavaScript, so AI agents see almost nothing here. This is what they get." This is a finding, not a failure. |




### 6.2 Editor layout

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
  - **Page:** the preview (6.3).
  - **Markdown:** the exact agent output (6.9).
- **Right panel** is always the inspector, so editing works from either view.



### 6.3 Preview

**What:** The page as an agent receives it after modification, shown in a way a human can read and click.

**Why, and the key decision:** The spec asks for the preview "as it would be served to an agent after modification". Agents don't see CSS, so the preview is the **clean page rendered as semantic HTML with the editor's own readable styling** (like a browser's Reader Mode), **not** the original site's design.

- It's honest: what you see is what the agent gets, structurally.
- It's reliable: inserting notes, forwarded content and hidden markers into an arbitrary site's layout breaks things (overlap, positioning, hidden menus). A consistent reading layout doesn't.
- It's safe: nothing from the original page runs.
- It's still recognizable: publishers recognize their page by its content (headings, text, images), not its colors. An **"Open original"** link is always available for comparison.

**Behavior**

- Rendered in a clean reading layout: proper heading sizes, paragraphs, lists, tables, images with descriptions, links styled as links, forms shown as labeled fields.
- Landmark sections (header, navigation, main, footer, aside) are shown as lightly labeled regions, so users understand page structure ("Navigation", "Footer").
- Modifications are always visible on the element (this is the **visual diff overlay**):
  - **Hidden:** element stays in place, faded and striped, with a "Hidden from AI" badge. It stays clickable so it can be un-hidden.
  - **Context:** a highlighted note shown where the agent will read it (6.6).
  - **Forwarded:** a collapsible block under the link with the fetched content, its source, and its approximate size.
- A **"Show exactly what agents get"** switch removes hidden elements entirely, so the preview is the literal output.

**Acceptance criteria**

- Given a loaded page, then no script from it runs and no element from it can trigger navigation.
- Given any modification, when applied, then the preview reflects it immediately, without saving.
- Given "Show exactly what agents get" is on, then hidden elements are not rendered at all.



### 6.4 Select & inspect

**What:** Hover to identify, click to select, inspect in the side panel.

**Why:** Selection is the entry point to every modification and must work for non-developers.

**Behavior**

- **Hover:** outline the element and show a small plain-language label ("Heading", "Paragraph", "Link", "Image", "List", "Table", "Form field", "Section", "Navigation").
- **Click:** select it. The selected element gets a strong, distinct highlight (different from hover and from modification markers).
- Clicking selects the **innermost** element. To reach a container, the inspector shows a **breadcrumb** (e.g. `Main › Section › Paragraph`) where each step is clickable, plus a "Select parent" action.
- **Esc** or clicking empty space deselects.
- **Single selection** in v1 (see Out of scope).

**Inspector, with an element selected**

- Element type in plain words, with its tag shown small (e.g. "Link `<a>`").
- Text content (truncated, expandable). For images: their description. For links: destination.
- Breadcrumb.
- Controls: Hide from AI, Context for AI, Forward this link (links only).
- Modifications already on this element, each removable.

**Inspector, nothing selected**

- The **changes list** (6.8) for the whole page.

**Acceptance criteria**

- Given any element, when hovered, then it's outlined with its plain-language type.
- Given any element, when clicked, then it's highlighted and the inspector shows its type, tag, text and current modifications.
- Given a nested element is selected, when the user clicks a breadcrumb step, then that ancestor becomes selected.



### 6.5 Hide from AI

**What:** Mark an element so agents never see it.

**Why:** Agents treat everything in the page as content. Cookie banners, promos, repeated nav, stale content and internal notes dilute or distort their summary.

**Behavior**

- A toggle in the inspector: "Hide from AI".
- In the **agent output**, the element and everything inside it are **removed entirely**. Not visually hidden, not marked as hidden: absent. (CSS hiding or accessibility attributes don't hide anything from an agent, which reads the source.)
- In the **preview**, the element is faded and striped with a badge, and stays clickable to undo.

**Acceptance criteria**

- Given an element is hidden, then neither its text nor anything inside it appears in the agent output.
- Given a hidden element, when clicked, then the inspector allows un-hiding it.

**Edge cases**

- **Element inside a hidden element:** the inspector says "Hidden because a parent is hidden from AI" and links to that parent.
- **Hiding an element that has context or forward (on itself or inside it):** allowed. Those modifications are kept but marked **inactive** ("Not applied: element is hidden"). Un-hiding restores them.



### 6.6 Add context

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



### 6.7 Forward a link

**What:** For a selected link, fetch the page it points to (server-side) and include its main content inline, right after the link.

**Why:** Agents don't follow links. "See our refund policy" is a dead end to them. Forwarding turns the pointer into the actual answer.

**Behavior**

- "Forward this link" appears **only for links**.
- On forward, the editor fetches the linked page (same rules as loading a page: no JavaScript, same safety checks), extracts its **main content** (no nav, footer, ads), cleans it, and shows it under the link in the preview as a collapsible block with its source URL and approximate size.
- In the **agent output**, the content is inserted right after the link, as a labeled section: `Forwarded content from <url>:`, then the content. The link itself is kept.
- Forwarding goes **one level deep only**: links inside forwarded content are never forwarded.
- The configuration stores **only the link destination**, never the fetched content, so agents always get current content.
- The approximate size is shown because every forward adds to what the agent must read; forwarding many long pages dilutes the main content.

**Acceptance criteria**

- Given a link to a public HTML page, when forwarded, then its main content appears under the link in both preview and agent output, labeled with its source.
- Given a non-link element is selected, then the forward control is not shown.
- Given forwarded content contains links, then none of them are forwarded.

**Edge cases**


| Case                                                                          | Behavior                                                                                                                            |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Link is not forwardable (`#anchor`, `mailto:`, `tel:`, `javascript:`)         | Control disabled with reason: "This link doesn't lead to a page."                                                                   |
| Link points to the page itself                                                | Disabled: "This link points to the current page."                                                                                   |
| Target fails (timeout, not HTML, too large, blocked address, JavaScript-only) | Shown in the forward block with the reason. In agent output the link is left as is. The modification is kept, so it can work later. |
| Relative link                                                                 | Resolved to a full URL before fetching.                                                                                             |




### 6.8 Review & remove changes

**What:** One list of every modification on the page.

**Why:** Users apply changes across a long page; they need one place to see, verify and undo them. Required by the spec.

**Behavior**

- Shown in the inspector when nothing is selected, and reachable from the change count in the top bar.
- Each item: modification type (icon + word), the element in plain words with a text snippet, and for context the note, for forward the destination.
- Clicking an item selects its element and scrolls the preview to it.
- Each item has a remove button. Removal is immediate and visible in the preview.
- Inactive modifications (inside hidden elements) are shown as inactive with the reason.
- Modifications that **no longer match** the page (see 6.10) are shown in a separate "Needs attention" group, removable.

**Acceptance criteria**

- Given N modifications, then the list shows N items, grouped by status.
- Given an item is removed, then it disappears from the preview, the list and the agent output.



### 6.9 Markdown view (what the agent reads)

**What:** The left panel switched to the exact Markdown an agent receives.

**Why:** The strongest moment in the product: the publisher sees, literally, what the AI gets. It turns an abstract idea into something concrete.

**Behavior**

- Read-only, updates live as modifications change.
- Shows an approximate **token count**, so publishers see the cost of forwards.
- Copy and download buttons.
- Same output as Agent View (6.11) for the same page and configuration.

**Acceptance criteria**

- Given any set of modifications, then the Markdown view matches what Agent View returns for the same page and saved configuration.



### 6.10 Save & restore

**What:** Save stores the configuration for the current URL. Reopening restores it.

**Why:** The configuration is the product's real output. Everything else (preview, Markdown) is derived from page + configuration.

**Behavior**

- Save button with an "unsaved changes" indicator; confirmation on success; plain-language error on failure (changes stay in the editor).
- One configuration per normalized URL; saving replaces the previous one.
- On reopening, each modification is matched back to its element. If a modification **no longer matches** (the page changed, the element moved or its text changed), it is **not applied to anything** and is listed under "Needs attention". It is never applied to a different element.

**Acceptance criteria**

- Given changes are saved, when the page is reopened, then the same modifications appear on the same elements.
- Given the page changed so a target's text no longer matches, when reopened, then that modification is listed as not matching and is not applied.



### 6.11 Agent View (the downstream consumer)

**What:** A public address, `agentView?url=<page>`, that returns the page as an agent should receive it: the **live** page with its saved configuration applied.

**Why:** The spec asks for a configuration "meaningful to a downstream consumer" but doesn't say who that is. We define it: in production, the publisher's server or CDN detects AI agents and serves them the modified page. Agent View is that consumer, minus agent detection. It proves the configuration works **without the editor**, and anyone can test it directly.

**Behavior**

1. Fetch the live page, the same way the editor does, and clean it **identically** (otherwise saved targets won't match).
2. Load the configuration for the URL. If none exists, return the clean page unmodified.
3. Match each modification to its element (position + text snippet). Unmatched ones are skipped.
4. Apply: remove hidden elements, insert context notes, fetch and insert forwarded content (fresh, briefly cached, one level deep, failures leave the link as is).
5. Return **Markdown** by default, or **semantic HTML** on request.
6. Report which modifications could not be applied, so a stale configuration is detectable.

**Acceptance criteria**

- Given a saved configuration, when Agent View is requested for that URL, then hidden content is absent, context notes appear in place, and forwarded content appears after its link.
- Given no configuration, then the clean page is returned.
- Given the same page and configuration, then Agent View's Markdown equals the editor's Markdown view.
- Given a modification whose target no longer matches, then it is skipped and reported, and the rest still apply.

---



## 7. Agent output

**Decision: Markdown is the primary output. Semantic HTML is secondary. No front matter.**

**Why Markdown**

- Language models read Markdown and HTML about equally well. The difference is what happens **before** the model sees anything: agents run HTML through extractors that guess the "main content" and discard the rest, including attributes and blocks that look like sidebars. Our annotations could be thrown away.
- Markdown we produce ourselves has nothing left to guess. The publisher controls exactly what the model reads.
- It's compact (fewer tokens), and it's an emerging convention for serving pages to agents.

**Why also semantic HTML:** agents that request the normal page URL expect HTML. Same content, same placement rules.

**Why no front matter:** it adds a format convention agents may not interpret, and nothing currently needs it. Page-level summary is future work (section 12).

**Example**

```markdown
# Pricing that scales with you

![Customer growth chart](https://acme.com/growth.png)

> **Context:** Customer growth from 1,200 to 8,500, Jan to Sep 2026.

## Pro
$49/mo

[Start now](https://acme.com/signup?plan=pro)

> **Context:** Starts a 14-day free trial of Pro, no credit card required.

Full details in our [terms of service](https://acme.com/terms).

> **Forwarded content from https://acme.com/terms:**
>
> 1. Subscriptions renew monthly...
> 2. Refunds are available within 30 days...
```

(The cookie banner was hidden, so it's simply absent.)

**Alternatives considered:** plain text (loses headings and links), JSON/YAML/XML (built for data, not documents, and not how agents read pages), structured data / JSON-LD (good for exact facts, a complement, future work), llms.txt (a site-level index, wrong granularity), query endpoints like NLWeb/MCP (a different paradigm).

## 8. Configuration

**Decision:** one versioned document per page URL, containing only what a consumer needs to transform the page.


| Field           | Meaning               | Why                                                                          |
| --------------- | --------------------- | ---------------------------------------------------------------------------- |
| `version`       | Schema version        | Lets the format evolve without breaking saved configurations.                |
| `url`           | Normalized page URL   | The lookup key. Normalization makes equivalent URLs share one configuration. |
| `updatedAt`     | Last save time        | Lets consumers and users judge staleness.                                    |
| `modifications` | List of modifications | The content of the configuration.                                            |


Each modification:


| Field             | Meaning                                   | Why                                                                          |
| ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| `id`              | Unique id                                 | Lets the editor edit or remove one modification.                             |
| `type`            | `hide`, `context` or `forward`            | Explicit, so a consumer knows exactly what to do without guessing.           |
| `target.selector` | Element's position in the clean page      | Finds the element again on a fresh fetch.                                    |
| `target.text`     | Short snippet of the element's text       | Confirms it's still the same element. A mismatch means skip, never misapply. |
| `note`            | (context only) The plain-text explanation | The content to insert.                                                       |
| `href`            | (forward only) The link destination       | What to fetch. Content itself is never stored, so it's always fresh.         |


**Rules**

- At most one modification of each type per element.
- Forward only on links. Context notes are plain text, max 500 characters.
- Modifications inside a hidden element are kept but not applied.

**Deliberately not stored:** rendered output (derivable), fetched forward content (would go stale), anything about the editor UI (colors, selection, panel state). A consumer should be able to implement the transform from this document and this spec alone.

**Example**

```json
{
  "version": 1,
  "url": "https://acme.com/pricing",
  "updatedAt": "2026-10-05T10:00:00Z",
  "modifications": [
    { "id": "m1", "type": "hide",    "target": { "selector": "body > div:nth-of-type(1)", "text": "We use cookies to" } },
    { "id": "m2", "type": "context", "target": { "selector": "main > figure > img",       "text": "Customer growth" }, "note": "Customer growth from 1,200 to 8,500, Jan to Sep 2026." },
    { "id": "m3", "type": "forward", "target": { "selector": "main > p:nth-of-type(3) > a", "text": "terms of service" }, "href": "https://acme.com/terms" }
  ]
}
```



## 9. Downstream consumer (production path)

In production, a small layer in front of the publisher's site (server middleware or a CDN edge function):

1. Detects AI agents: by an explicit request for Markdown (`Accept: text/markdown`), falling back to known agent user-agents (e.g. GPTBot, ClaudeBot).
2. Loads the configuration for the requested URL and applies it, exactly like Agent View.
3. Serves Markdown or semantic HTML to agents; humans get the normal page.
4. Can also advertise the Markdown version from the normal page so agents can find it.

Realistically, a publisher only configures their **own** site. Opening any URL in the editor is supported for exploration and demo.

## 10. Trust & safety

- **No page code runs.** Scripts, event handlers and embedded objects are removed before anything is shown. Page text is always displayed as text.
- **The server only fetches public web pages.** Private, local and internal addresses are refused (on the original URL and after redirects). Fetches have a time limit and a size limit, and only HTML is accepted. This applies to page loads, forwards and Agent View alike.
- **User input is treated as plain text.** Context notes can't inject markup into the agent output. Length is limited.
- **Configurations are validated on save:** known types only, required fields present, forward only on links.
- **Cloaking risk.** Showing agents different content than humans is a recognized concern for search engines. Context and forward only **add** information; hide removes it and could be misused to misrepresent a page. This is noted for publishers in the README.



## 11. Decisions log


| Decision                                                            | Why                                                                              | Alternatives rejected                                                                     |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Fetch raw page, no JavaScript                                       | It's what agents see; JavaScript-only pages are a real finding to show, not hide | Headless browser rendering (inaccurate to agents, heavier)                                |
| Preview = clean semantic page with our own styling                  | Honest to "as served to an agent"; reliable for inserting notes/markers; safe    | Original page in a frame with its CSS (shows the human page; modifications break layouts) |
| Hidden elements ghosted in preview, removed in output               | User must be able to click to undo; agent must not see it                        | Removing from preview (can't undo); CSS hiding in output (agents still read it)           |
| Markdown primary output, semantic HTML secondary                    | Survives agent extraction intact; compact                                        | HTML only, JSON, plain text, llms.txt, JSON-LD                                            |
| No front matter                                                     | No current need; not reliably interpreted                                        | YAML front matter                                                                         |
| Context = inline, labeled real text, placed by element type         | Survives text conversion; read in the right place                                | Attributes, head metadata, separate JSON                                                  |
| Forward stores only the link; content fetched fresh, one level deep | Always current; bounded size and cost                                            | Snapshot at save time (stale); recursive forwarding (unbounded)                           |
| Target = position + text snippet                                    | Find again on refetch, detect drift, never misapply                              | Editor-only ids (don't exist on live page); position only (silently wrong)                |
| One configuration per normalized URL                                | Matches the consumer's access pattern: "give me the config for this URL"         | Per-element or relational records                                                         |
| Agent View endpoint                                                 | Proves the configuration works without the editor; defines the consumer          | Leaving the consumer implicit                                                             |
| Single selection                                                    | Covers every required flow; much simpler                                         | Multi-select (future)                                                                     |




## 12. Out of scope / Future

- **Page summary:** a page-level context note placed at the top of the output.
- **Multi-select:** apply one modification to several elements at once.
- **Structured data (JSON-LD)** for exact facts like prices and plans.
- **Agent detection and serving** in production (section 9).
- **More robust targeting** that survives larger page redesigns.
- **Linking Markdown lines to elements:** click a line in the Markdown view to select its element.
- Undo/redo history, mobile layout, accounts and teams, publishing workflow, rendering JavaScript-built pages.





