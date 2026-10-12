# AX Editor – Spec Decisions

Why the spec is the way it is. Each entry: the decision, why, and what was rejected.

---

### D1. Fetch the raw page, no JavaScript

- **Why:** That's what agents see. A JavaScript-built page that comes back empty is a real finding worth showing the publisher, not hiding.
- **Rejected:** Headless browser rendering. Inaccurate to agents and heavier.

### D2. Preview = clean semantic page with the editor's own styling; the literal output opens in Agent View

The preview is where the publisher works. The **View as agent** button opens Agent View in a new tab, showing the exact Markdown an agent receives for the saved configuration (D5). Both use the same `clean` and `markModificationsInTree`, so they can differ in looks but never in content.

- **Why a clean page, not the site's design:**
  - The assignment asks for the preview "as it would be served to an agent after modification", and agents don't see CSS.
  - Inserting notes, forwarded content and markers into an arbitrary site's layout breaks things: overlap, positioning, menus hidden by CSS.
  - A consistent reading layout is reliable and safe.
  - Publishers recognize their page by its content, and "Open original" covers comparison.
- **Why a rendered page to edit on, not just the Markdown:**
  - Every modification starts with clicking an element. In the preview each element is one clickable thing. In Markdown a click lands on a line of text, and mapping it back to its element is unreliable.
  - Hidden elements must stay visible to be undone (D4). In the Markdown they're gone, so there's nothing left to click.
  - Notes, forwards and hidden parts need visible markers where they sit. In Markdown they'd be just more text.
  - Publishers aren't developers (D3). A table and an image are easier to scan than `| Plan | Price |` and `![Customer growth](…)`.
- **Why still show the Markdown:** it's what the agent actually reads, so the publisher can check the literal result, copy it, and compare it with other tools.
- **Why a new tab on Agent View, not a Markdown view inside the editor:** the publisher sees the real output from the real endpoint, the way an agent gets it, and there's no second view to build. The cost: it shows only saved changes, so the button is disabled until the publisher saves.
- **Rejected:**
  - The original page in a frame with its CSS. It shows the human page, not the agent one, and modifications break layouts.
  - Markdown as the only view. It's the true output, but a poor surface for selecting, undoing and seeing modifications.
  - A Preview | Markdown toggle in the editor. It shows unsaved edits, but it's a second view to build and keep equal to Agent View.



### D3. "Non-developers" shapes the editor, not preview fidelity

- **Why:** Users need plain-language labels, visible feedback and clear errors. They don't need the site's design to make decisions about content.



### D4. Hidden elements are ghosted in the preview but removed in the output

- **Why:** Users must be able to click a hidden element to undo it. Agents must not see it at all. The preview is a readable, near-agent view with every modification visible; **View as agent** shows the literal agent output, so no extra "agent-exact" preview switch is needed.
- **Rejected:**
  - Removing hidden elements from the preview. They couldn't be undone.
  - CSS hiding or `aria-hidden` in the output. Agents read the source, so it's still visible.



### D5. Markdown is the primary output, semantic HTML secondary

- **Why:**
  - Models read HTML and Markdown about equally well. The difference is what happens before: agents run HTML through extractors that guess the main content and drop attributes and sidebar-like blocks, which can include our annotations.
  - Markdown we produce has nothing left to guess, and it's compact.
  - Semantic HTML serves agents that request the normal URL.
- **Rejected:**
  - HTML only (extraction risk)
  - plain text (loses headings and links)
  - JSON/YAML/XML (built for data, not documents)
  - llms.txt (site-level, wrong granularity)
  - NLWeb/MCP (a query API, a different paradigm)
  - JSON-LD (a complement for facts, future work)



### D6. No front matter in the output

- **Why:** It adds a format convention agents may not interpret, and nothing currently needs it. A page-level summary is future work.
- **Rejected:** YAML front matter.



### D7. Context is inline, labeled real text, placed by element type

- **Why:** Agents read linear text and summarize. Context must survive text conversion and sit next to what it describes.
  - The "Context:" label marks it as the publisher speaking, not page content.
  - On containers it goes first, so it frames what follows.
  - On leaf elements it goes after, explaining what was just read.
- **Rejected:**
  - Attributes (`title`, `aria-label`, `data-*`). Dropped by converters.
  - Head metadata or structured data. Survives, but it's far from the element, so the agent may not connect them.
  - A separate JSON blob.



### D8. Context notes are plain text, at most 300 characters, one per element

- **Why:** Notes are injected into what agents read, so no markup injection. Short notes keep the focus. One per element avoids stacked, conflicting notes.



### D9. Forward stores only the link, fetched live each time, no caching

- **Why:** Content is always current, the configuration stays minimal, and there's no cache to invalidate. Simplest to build and least bug-prone.
- **Note:** The editor may cache forwards for the length of an editing session so the preview isn't refetched on every edit. Agent View never caches.
- **Rejected:**
  - Snapshotting content at save time (goes stale, bloats the config).
  - Caching in Agent View (added complexity, staleness).



### D10. Forwarding is one level deep, with per-link and per-page size limits

- **Why:** Every forward adds to what the agent must read. Unbounded forwarding dilutes the main content and makes cost unpredictable.
  - **Per link: 3,000 tokens.** Longer content is truncated and marked "(truncated)", so one huge page can't dominate but the agent still gets most of the answer.
  - **Per page: 10,000 tokens.** Filled in page order. Forwards that don't fit are not added: they stay plain links and are flagged as over budget, in the editor and in Agent View's report.
  - Page order makes the result predictable: the publisher can see which forwards win.
- **Rejected:** Recursive forwarding, and unlimited size.



### D11. Target = position in the clean page + text snippet

- **Why:** Editor-only ids don't exist on a fresh fetch. Position alone can silently point at the wrong element after the page changes. The snippet detects that, so a mismatch is skipped and flagged, never misapplied.
- **Position format:** a path through the **clean** page (`main:1>section:2>paragraph:3`), not a CSS selector over the raw HTML. Wrapper churn on the live site (`div`s, classes) doesn't break it.
- **Rejected:** Raw-DOM CSS selectors (break when wrappers change).
- **Consequence:** The editor and Agent View must clean pages identically.



### D12. One configuration document per normalized URL

- **Why:** The consumer's only question is "what's the configuration for this URL?", so one read answers it. Normalization makes equivalent URLs share one configuration.
- **Rejected:** Per-element or relational records.



### D13. The configuration holds only what a consumer needs

- **Why:** "Meaningful to a downstream consumer" means someone could implement the transform from the document and the spec alone. Explicit types and no UI state support that.
- **Not stored:**
  - rendered output (derivable)
  - forwarded content (D9)
  - colors, selection, panel state
- **Versioned,** so the format can evolve.



### D14. Agent View defines the downstream consumer

- **Why:** The assignment asks for a configuration "meaningful to a downstream consumer" without saying who that is. We define it: in production, the publisher's server or CDN detects agents (by `Accept: text/markdown`, falling back to known agent user-agents) and serves them the modified page. Agent View is that logic minus detection. It proves the configuration works without the editor and can be tested directly.
- **Note:** Realistically, publishers configure their own site. Loading any URL is for exploration and demo.



### D15. Only meaningful elements are selectable

- **Why:** Empty wrappers and decorative elements would make selection noisy and confusing for non-developers, and modifying them adds nothing for agents.



### D16. Click selects the innermost element; breadcrumb and Select parent reach containers

- **Why:** Precise by default, and still able to target whole sections for hide or context.



### D17. Single selection

- **Why:** It covers every required flow and is much simpler. Multi-select is future work.



### D18. Hiding doesn't delete modifications inside it

- **Why:** Un-hiding should restore the user's work. Those modifications are shown as inactive, so nothing is hidden from the user.



### D19. Raw-fetch safety applies to every server fetch

- **Why:** The server fetches user-supplied URLs (pages, forwards, Agent View), which is a classic way to reach internal systems. Every fetch is checked: private addresses blocked, also after redirects; time and size limits; HTML only.



### D20. Cloaking is acknowledged

- **Why:** Serving agents different content than humans is a known search-engine concern. Context and forward are additive, and hide is the risky one. Stated openly for publishers rather than ignored.

