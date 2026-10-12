# AX Editor – Spec

This document is the product overview: **what** we are building and **why**. Each key feature has its own detailed spec with full behavior, acceptance criteria and edge cases. Technology, architecture and implementation choices live in `plan.md`.

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
- The tool must make the abstract ("what an agent reads") concrete and visible.

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
2. User enters a URL (or picks the demo page or a saved page) and opens it.
3. The editor shows the **preview** (left) and the **inspector** (right). If a configuration was saved for this URL, it's restored.
4. User hovers elements to see what they are, clicks one to select it.
5. The inspector shows the element and its controls. User hides it, adds context, or forwards it (links only).
6. The change appears in the preview immediately. User repeats across the page.
7. User reviews all changes in the changes list and removes any they don't want.
8. User saves. Reopening the URL later restores everything.
9. User clicks **View as agent** to open, in a new tab, exactly what an agent will read.
10. A downstream consumer (Agent View) can now serve the modified page to agents.

---

## 6. Key features

Each feature below is described in full (behavior, acceptance criteria, edge cases) in its own feature spec. Features are listed in build order.

### 6.1 Open a page

A focused start screen whose only job is to get a page on screen: enter a URL or pick the demo page. The page is fetched server-side exactly as an agent would fetch it (no JavaScript), cleaned, and shown in the editor. Every failure is explained in plain language.

### 6.2 See, select & inspect

A two-panel editor. The left panel shows the page **as an agent receives it**, as a clean, readable layout (like a browser's Reader Mode) with every modification visibly marked. The right panel is the inspector: hover an element to see what it is in plain words, click to select it with a clear highlight, see its type, text and current modifications, and climb to containers with a breadcrumb.

### 6.3 Hide & add context

The two in-place modifications. **Hide from AI** removes an element and everything inside it from the agent output (it stays visible but ghosted in the preview, so it can be undone). **Add context** attaches a short plain-text note for AI agents to any element, such as what a chart shows or what a button does, inserted as labeled text right where the agent will read it.

### 6.4 Save & load configs

A Save button stores the page's configuration; saving again replaces it. One list shows every modification on the page, where each can be removed. The start screen lists saved pages, and opening a page restores its configuration. A modification whose element can no longer be found with confidence is never applied to a different element; it's flagged for the user instead.

### 6.5 Agent View

A public endpoint returns the **live** page with its saved configuration applied, as Markdown: exactly what an agent should receive. It's the downstream consumer, proving the configuration works without the editor. A **View as agent** button in the editor opens it in a new tab.

### 6.6 Forward a link

For a selected link, the server fetches the page it points to and inserts its main content right after the link, so an agent gets the answer instead of a pointer. Forwarding is one level deep, always fetched live, and capped in size per link so one long page can't drown the main content.

---

## 7. Agent output

**Decision: Markdown is the primary output. Semantic HTML is secondary. No front matter.**

**Why Markdown**

- Language models read Markdown and HTML about equally well. The difference is what happens **before** the model sees anything: agents run HTML through extractors that guess the "main content" and discard the rest, including attributes and blocks that look like sidebars. Our annotations could be thrown away.
- Markdown we produce ourselves has nothing left to guess. The publisher controls exactly what the model reads.
- It's compact (fewer tokens), and it's an emerging convention for serving pages to agents.

**Why also semantic HTML:** agents that request the normal page URL expect HTML. Same content, same placement rules.

**Why no front matter:** it adds a format convention agents may not interpret, and nothing currently needs it. Page-level summary is future work (section 11).

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

**Selector format**

`target.selector` is a path through the **clean page** (not the raw HTML), so changes to the site's wrapper markup (`div`s, classes) don't break it. Each step is `kind:n`, where `kind` is the element type and `n` is its 1-based position among siblings of that same kind. Steps are joined with `>`. Example: `main:1>section:2>paragraph:3` is the 3rd paragraph in the 2nd section of the main content. A consumer finds the element by walking the clean page step by step.

**Rules**

- At most one modification of each type per element.
- Forward only on links. Context notes are plain text, max 300 characters.
- Modifications inside a hidden element are kept but not applied.

**Deliberately not stored:** rendered output (derivable), fetched forward content (would go stale), anything about the editor UI (colors, selection, panel state). A consumer should be able to implement the transform from this document and this spec alone.

**Example**

```json
{
  "version": 1,
  "url": "https://acme.com/pricing",
  "updatedAt": "2026-10-05T10:00:00Z",
  "modifications": [
    { "id": "m1", "type": "hide",    "target": { "selector": "aside:1",                  "text": "We use cookies to" } },
    { "id": "m2", "type": "context", "target": { "selector": "main:1>figure:1>image:1",  "text": "Customer growth" }, "note": "Customer growth from 1,200 to 8,500, Jan to Sep 2026." },
    { "id": "m3", "type": "forward", "target": { "selector": "main:1>paragraph:3>link:1", "text": "terms of service" }, "href": "https://acme.com/terms" }
  ]
}
```

## 9. Trust & safety

- **No page code runs.** Scripts, event handlers and embedded objects are removed before anything is shown. Page text is always displayed as text.
- **The server only fetches public web pages.** Private, local and internal addresses are refused (on the original URL and after redirects). Fetches have a time limit and a size limit, and only HTML is accepted. This applies to page loads, forwards and Agent View alike.
- **User input is treated as plain text.** Context notes can't inject markup into the agent output. Length is limited.
- **Configurations are validated on save:** known types only, required fields present, notes at most 300 characters, and a forward's link must be a full web address (`https://…`). The editor only offers Forward on links.
- **Cloaking risk.** Showing agents different content than humans is a recognized concern for search engines. Context and forward only **add** information; hide removes it and could be misused to misrepresent a page. This is noted for publishers in the README.

## 10. Decisions log

The reasoning behind each product decision, with the alternatives rejected, lives in [`spec-decisions.md`](spec-decisions.md). It is the single source for the WHY.

## 11. Out of scope / Future

- **Page summary:** a page-level context note placed at the top of the output.
- **Multi-select:** apply one modification to several elements at once.
- **Structured data (JSON-LD)** for exact facts like prices and plans.
- **Agent detection and serving** in production (described in `spec-decisions.md` D14).
- **More robust targeting** that survives larger page redesigns.
- **Show changes inside a hidden element as inactive** in the editor.
- **"Open original"** link to compare with the real page.
- **Semantic HTML from Agent View**, and a report of skipped modifications in its response.
- Undo/redo history, mobile layout, accounts and teams, publishing workflow, rendering JavaScript-built pages.
