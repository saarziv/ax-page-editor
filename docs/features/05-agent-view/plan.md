# Agent View – Plan

How we build the Agent View spec. Shared architecture, core contracts and conventions are in the global `plan.md`.

---

## Builds on

- `clean` and `normalizeUrl` (01), the marked page from `markModificationsInTree` (03), `ConfigRepository.findByUrl` (04).
- `PageTreeService.getPageTree` (01): fetches through `SafeFetchService`, cleans, and keys the tree by its normalized URL, the same key Save uses.
- First built here: `prune` (global plan §3.4) and `renderMarkdown` (§3.5).

## How Agent View works

Agent View is the editor's chain, run on the server, plus the last step the editor never needed: turning the marked page into text.

1. `GET /agentView?url=acme.com/pricing?utm_source=x` asks `PageTreeService` for the page. It fetches the live page, cleans it, and gives back a tree keyed by `https://acme.com/pricing`.
2. The saved configuration for that key is loaded. None saved means an empty list of modifications.
3. `markModificationsInTree(tree.root, modifications)` makes every decision, exactly as in the editor. A modification that can't be resolved is marked `unmatched` and simply not applied.
4. `prune` drops the hidden parts, and `renderMarkdown` writes what's left.

Example: the demo page with the cookie banner hidden and a note on the chart comes back as

```markdown
![Customer growth](https://…/growth.png)

> **Context:** Customer growth from 1,200 to 8,500, Jan to Sep 2026.
```

with no trace of the banner. Because steps 1 and 3 are the editor's own code, the Markdown always matches what the preview showed for the saved configuration.

## Core

### `prune(root)`

Returns the marked page without its `hidden` subtrees: the agent tree, the only tree the renderer sees. Like `markModificationsInTree`, it never changes its input and copies only the nodes on the path to a removed subtree. A container left empty stays, because it renders as nothing. Example: with the cookie banner hidden, `prune` drops `aside:1` and everything in it, and `prune(markModificationsInTree(page, []).tree)` equals the page. This is where 03's K2 and K4 are checked on the real output.

### `renderMarkdown(root)`

Our own walker over the agent tree. Every node is either **inline** (`text`, `link`, `image`) or a **block**. A node whose children are all inline is written as one line; otherwise each child is its own block, separated by a blank line. `clean` already wraps inline runs next to blocks in paragraphs (global plan §3.2), so the two never mix.

How each kind is written:

- **Containers** (`page`, `main`, `section`, `article`, `header`, `footer`, `nav`, `aside`, `figure`, `form`): just their children. Landmarks add no text, which keeps the output short.
- **heading:** `#` repeated `level` times. **paragraph:** its line.
- **link:** `[text](href)`. **image:** `![alt](src)`.
- **list:** one `- ` per item, or `1. ` when its `tag` is `ol`. A nested block inside an item is indented under it.
- **table:** a Markdown table, with the first row as the header row.
- **quote:** every line prefixed with `> `. **code:** a fenced block, its text written as is.
- **field:** `Field: <label>`. **button:** `Button: <text>`. An agent can't click, so naming them is enough for it to know they're there.
- **annotation:** a blockquote, `> **Context:** <note>`. With `attrs.about` set (a note moved after its paragraph or table, 03), the label names the element: `> **Context** (on "terms"): <note>`.
- **forwarded:** nothing yet; its format comes with 06.

**Escaping:** page text and notes are plain text, so the characters Markdown reads as syntax (`\`, `` ` ``, `*`, `_`, `[`, `]`, `<`, `>`, `#`, `|`) get a backslash. `# hi [x](y)` reaches the agent as those literal characters, never as a heading or a link (03 spec K9). Code blocks are the exception: they are written as is.

**The tricky parts:**
- **A note at the start of a list or table.** 03 places a container's note as its first child, but Markdown can't put a blockquote inside a list before the first item, or inside a table. So when a list's or table's first child is an annotation, the renderer writes it just before the list or table. The agent reads it in the same spot.
- **A note on a list item.** A list item isn't a container, so 03 places its note right after the item, as the list's next child. The renderer writes it inside that item, indented under its text (`1. Home` then `   > **Context:** …`), so the numbering isn't broken.
- **A note inside a table cell.** A cell is one line, so a note there (after a link in the cell) is written inline as `(Context: <note>)`.

## API

### `GET /agentView?url=`

Lives at the root, outside the `/api` prefix, because it's the public address a consumer calls, not part of the editor's API. It runs the four steps above in an `AgentViewService`.

- **Missing or invalid `url`:** 400 `{ code: 'INVALID_URL' }`, from `PageTreeService`.
- **Page fails to load:** the `FetchError` passes through, so the answer has its status and `{ code, message }` with the reason (global plan §4.3).
- **Content type:** `text/markdown; charset=utf-8` for agents. When the request's `Accept` asks for `text/html` (a browser tab), it's `text/plain; charset=utf-8` instead, because browsers download `text/markdown` rather than showing it (spec AC7). The body is identical either way. `Vary: Accept` tells caches the two differ.

## Web

### View as agent button

A `ViewAsAgentButton` in the top bar, right after Save. Clicking it opens Agent View for the page in a new tab. The editor adds nothing of its own: the tab shows the real endpoint's answer, so what the publisher sees is what an agent gets.

- **Which URL:** the page tree's `url`, the normalized one the page was loaded and saved under (the same one Save sends), not what the publisher typed. It's passed through `encodeURIComponent`, because a page URL with its own `?` or `&` would otherwise break the query string. Example: the demo opens `http://localhost:3001/agentView?url=sample%3Ademo`, and `https://acme.com/p?id=2&lang=en` opens `…/agentView?url=https%3A%2F%2Facme.com%2Fp%3Fid%3D2%26lang%3Den`.
- **When it's disabled:** while the derived `dirty` flag is set (global plan §5), the same flag that enables Save, so the two always agree: Save lights up exactly when View as agent goes grey. It's also disabled until the page has loaded, since there's no URL to open yet.
- **Tooltips:** shadcn's `Tooltip`, not a plain `title`. A native `title` shows only after a still hover, never on keyboard focus and not at all in an unfocused window, so publishers missed it; these two messages are the spec's explanation of the button, so they must show reliably. A disabled button gets no mouse or focus events, so the tooltip's trigger is a wrapper around the button, which also takes keyboard focus while the button is disabled; that's the only way the disabled tooltip ("Save to see your latest changes as an agent.") can show.
- **Opening the tab:** `window.open(agentViewUrl, '_blank', 'noopener')`, so the new tab can't reach back into the editor.

## README

A short "Agent View" section: what the endpoint returns, why it exists (the downstream consumer, D14), and a `curl` example against the demo page.

## Tests

- **`prune`:** a hidden element's text, links, images and nested elements are gone (03 K2), nothing else changes, the input is untouched, and with no hides the output equals the page (03 K4).
- **`renderMarkdown`:** one small tree per kind, checked against its exact Markdown. Plus a note after a leaf, a note first in a section, a note at the start of a list (written before it), a note in a cell (inline), the "on …" label, and escaping (`<script>`, `# heading`, `[x](y)` come out literal).
- **Agent View (api):** on the demo page with a saved configuration, the hidden text is gone and the note is in place; with none saved, the clean page comes back; a `utm_*` URL finds the saved configuration; an unmatched modification is skipped while the others apply; the content type follows `Accept`.
