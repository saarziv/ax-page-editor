# AX Editor

AI agents read web pages differently from people. They don't run JavaScript, they ignore design, they don't follow links, and they boil a page down to plain text before reading it. A publisher has no way to see what an agent actually gets, or to change it.

**AX Editor** is a visual editor for publishers (not developers). You load a page, click elements and change how the page is served to AI agents:

- **Hide from AI:** remove noise such as cookie banners, menus and promos.
- **Add context:** attach a short note for agents, such as what a chart shows or what a button does.
- **Forward a link:** pull the main content of a linked page (for example, "our terms") right into the page, so the agent gets the answer instead of a pointer.

Changes are saved as a small per-page **configuration**. A separate endpoint, **Agent View**, applies that configuration to the live page and returns exactly what an agent should read.



Loom Link : [https://www.loom.com/share/a2d915e0d432467f91818f2365b17fa4](https://www.loom.com/share/a2d915e0d432467f91818f2365b17fa4)  
Includes a 5 min of end to end explanation and walkthrough of the product by me.

---



## Run it locally



### Requirements

- **Node.js 20.12 or newer** (`.nvmrc` pins 20, so `nvm use` works)
- **pnpm 10** (`corepack enable` gives you the version pinned in `package.json`)



### Install and start

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts both apps together:


| App          | URL                                            |
| ------------ | ---------------------------------------------- |
| Editor (web) | [http://localhost:5173](http://localhost:5173) |
| API          | [http://localhost:3001](http://localhost:3001) |


Open [http://localhost:5173](http://localhost:5173) and either enter any public URL or click **Try a sample** to open the bundled demo page. The demo works offline.

### Environment configuration (optional)

Everything has working defaults, so a fresh clone runs without any setup. To change them, copy `apps/api/.env.example` to `apps/api/.env`:


| Variable     | Default                 | What it does                                                |
| ------------ | ----------------------- | ----------------------------------------------------------- |
| `API_PORT`   | `3001`                  | Port the API listens on                                     |
| `WEB_ORIGIN` | `http://localhost:5173` | The only origin allowed to call the API (CORS)              |
| `DB_PATH`    | `./data/ax.db`          | SQLite file for saved configurations (created on first run) |


The web app currently expects the API on port `3001`, so see Limitations before you change `API_PORT`.

### Tests and checks

```bash
pnpm test        # unit tests (core, api, web)
pnpm typecheck   # TypeScript, all packages
pnpm lint        # ESLint
pnpm e2e         # Playwright end-to-end tests
```

On a fresh clone, run `pnpm exec playwright install chromium` once before `pnpm e2e`. The e2e tests reuse your running `pnpm dev`, or start the servers themselves if nothing is running.

---



## Using the editor

1. **Open a page:** enter a URL or pick the demo. The page is fetched the way an agent fetches it (no JavaScript) and cleaned down to its meaningful content.
2. **Select:** the left panel shows the page as an agent receives it. Hover an element to see what it is ("Heading", "Link", "Image"), and click it to select it.
3. **Change:** the right panel (inspector) offers **Hide from AI**, a **Context for AI** note and, for links, **Forward to AI**. Every change shows up in the preview right away.
4. **Review and save:** the changes list shows every modification, and each one can be removed. **Save** stores the configuration. Reopening the URL later restores it, and saved pages are listed on the start screen.
5. **View as agent:** opens, in a new tab, exactly what an agent receives for this page.

---



## Architecture overview

The project is a pnpm monorepo with three parts:

```
apps/web        The editor. React + Vite, Tailwind + shadcn/ui, TanStack Query, Zustand
apps/api        The server. NestJS, SQLite. Fetches pages, stores configs, serves Agent View
packages/core   Shared, pure logic used by both: clean, selectors, apply modifications, render Markdown
```



### The one idea

**Everything is a function of (page, configuration).** The page is turned into a clean tree once, the configuration is a short list of changes, and one shared function applies the changes to the tree. The editor and Agent View both call **the same core code**, so the preview and what the agent receives can never disagree.

### The flow

```
            ┌───────────────────────────── API ─────────────────────────────┐
 URL ─────► │ SafeFetch (no JS, size/time limits, HTML only) ──► clean      │ ──► page tree
            └───────────────────────────────────────────────────────────────┘
                                                                                │
 Editor:    page tree + your changes ──► markModificationsInTree ──► Preview ◄──┘
                                           (hidden = faded, notes shown in place)
                  │
                  │ Save
                  ▼
            SQLite: one configuration per page URL
                  │
                  ▼
 Agent View: live page ──► clean ──► markModificationsInTree ──► prune ──► Markdown
                                     (same code as the editor)   (hidden parts removed)
```

Step by step:

1. **Open.** The API fetches the raw HTML and `clean` turns it into a **page tree**: headings, paragraphs, links, images, lists, tables, forms and sections. Scripts, styles, tracking and empty wrappers are dropped.
2. **Edit.** Each click in the inspector adds, changes or removes one entry in a list of **modifications** held in the editor's state. Nothing else is stored. The preview, the "unsaved changes" flag and statuses are all computed from that list.
3. **Preview.** `markModificationsInTree` applies the list to the tree: hidden elements are flagged, and notes and forwarded content are inserted where the agent will read them. The preview simply draws that tree with React. Page content is never injected as HTML and no iframe is used.
4. **Save.** The list is validated (zod schemas from `core`) and stored as one configuration per normalized URL. Each modification remembers its element by a path through the clean tree plus a short text snippet. If the snippet doesn't match anymore, the change is skipped, never applied to the wrong element.
5. **Serve.** Agent View fetches the **live** page, runs the same chain, removes the hidden parts and renders Markdown.

**Safety, in short:** no page code ever runs. Every server-side fetch goes through one `SafeFetchService` with a 10 s timeout, a 3 MB cap and HTML only. User notes are treated as plain text everywhere.

For the full architecture (the page tree, the selector format, endpoints, state and testing strategy), see `[docs/plan.md](docs/plan.md)`.

---



## Agent View

**What it is:** a public endpoint that returns a page the way an AI agent should get it. It takes the live page, applies its saved configuration (hidden parts removed, notes added), and returns the result as Markdown.

```bash
curl 'localhost:3001/agentView?url=sample:demo'
```

In the editor, **View as agent ↗** (next to Save) opens the same thing in a new tab.

**Why I added it:** the assignment didn't ask for it. I added it for two reasons.

- **It shows the result the way the agent sees it.** Agents don't read HTML as it is. They first run it through tools that strip tags, drop attributes and guess which parts matter, and those tools could throw away the very notes the publisher added. Markdown has nothing left to strip or guess, so what you see here is exactly what the agent reads.
- **It proves the saved configuration works on its own.** Nothing here uses the editor: the endpoint reads the live page and the saved configuration. In production, the publisher's server would do the same for agent requests.

More detail: `docs/spec-decisions.md` D5 (why Markdown) and D14 (the downstream consumer).

---



## How it was built: Spec-Driven Development (SDD)

The project was built spec-first. **The docs are the source of truth:** every feature was specified with acceptance criteria and planned before any code was written, then built task by task, and each step had a check the developer runs. If code and docs disagree, the docs win.

Every fact lives in exactly one place:


| Document                                           | What it holds                                                                                                                                                        |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[docs/spec.md](docs/spec.md)`                     | **Global spec (what).** The problem, the users, goals and non-goals, core concepts, the user flow, the agent output format and the configuration format. Start here. |
| `[docs/spec-decisions.md](docs/spec-decisions.md)` | **Decisions log (why).** Each product decision with the alternatives that were rejected (D1–D20).                                                                    |
| `[docs/plan.md](docs/plan.md)`                     | **Global plan (how).** Architecture, stack, shared core contracts, security, testing strategy and technical decisions (P1–P12). The reference for architecture.      |
| `docs/features/NN-<feature>/spec.md`               | **Feature spec.** Behavior, **acceptance criteria (ACs)** and edge cases for one feature.                                                                            |
| `docs/features/NN-<feature>/plan.md`               | **Feature plan.** How that feature is built, on top of the global plan.                                                                                              |
| `docs/features/NN-<feature>/tasks.md`              | **Tasks and progress.** A roadmap mapping each task to the ACs it covers, the steps with their checks, deviations and follow-ups.                                    |


Features, in build order:

1. `[01-open-page](docs/features/01-open-page)`: enter a URL or open the demo, fetched safely and cleaned
2. `[02-see-select-inspect](docs/features/02-see-select-inspect)`: the two-panel editor, hover, select and inspect
3. `[03-hide-and-context](docs/features/03-hide-and-context)`: Hide from AI and Add context
4. `[04-save-and-load-configs](docs/features/04-save-and-load-configs)`: save, the changes list, saved pages
5. `[05-agent-view](docs/features/05-agent-view)`: the Agent View endpoint and the View as agent button
6. `[06-forward-link](docs/features/06-forward-link)`: forward a link's content into the page

---



## Limitations and future improvements

**Current limitations**

- **Private addresses aren't blocked yet.** `SafeFetchService` enforces the timeout, size limit and HTML-only rule, but it doesn't yet refuse private, local and internal IP addresses (SSRF protection), and it doesn't re-check them after redirects. This must be done before deployment anywhere public.
- **Changes that no longer match aren't surfaced.** If the live page changes, a saved change that no longer matches its element is safely skipped, but the editor doesn't yet list it under "Needs attention".
- **No JavaScript rendering.** Pages built in the browser (single-page apps) show little or no content, which is also what most agents see.
- **The API address is hardcoded** in the web app (`localhost:3001`), so changing `API_PORT` requires a matching change in the web app.

**Future improvements**

- **Serve agents in production:** detect agent requests at the publisher's server or CDN and serve them the Agent View output.
- **Sturdier targeting:** match elements even after larger page redesigns. Today, a strict text check prefers skipping a change over risking a wrong one.
- **Page-level summary and structured data (JSON-LD)** for exact facts such as prices and plans.
- **Semantic HTML output** from Agent View for agents that request the normal page URL, plus a report of skipped changes.

The full lists live in `docs/spec.md` §11 and the Follow-ups at the bottom of each feature's `tasks.md`.

---



## A note for publishers: cloaking

Search engines treat showing agents different content than humans ("cloaking") as a risk. **Add context** and **Forward** only add information. **Hide** removes it, so use it for noise (banners, menus, promos), never to misrepresent what the page says. See `docs/spec-decisions.md` D20.