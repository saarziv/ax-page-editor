# AX Editor – Development Rules

## What we're building

A visual editor that lets publishers (non-developers) load a webpage, click elements, and change how the page is served to AI agents: hide elements, add context, forward links. Saves a per-page configuration that a downstream consumer (Agent View) applies to the live page.

## SDD guidelines

Docs are the source of truth. If code and docs disagree, the docs win. If a doc seems wrong, stop and say so. Don't improvise around it.

Every fact lives in exactly one place: what and why in the specs and `spec-decisions.md`, how in the plans, coding details (versions, config, file locations) in the code, progress in `tasks.md`. Never write the same fact in two places.

- Global: `docs/spec.md` (what), `docs/spec-decisions.md` (why), `docs/plan.md` (shared how: architecture, core contracts, conventions).
- Per feature (`docs/features/NN-<feature>/`, in build order): `spec.md` (what + acceptance criteria), `plan.md` (how; builds on the global plan, never restates it), `tasks.md` (ordered tasks and progress).
- **Writing plan.md:** keep the template, but make each section clear to a reader who hasn't seen the code. Explain the idea in plain words, name the tricky parts and why each choice was made, and give one short example (this input becomes this output). Plain sentences, not dense tables or keyword lists. Stay compact: a short paragraph or a few bullets per point.

**Tasks & steps**

- Aim to build each task in one Claude session. The dev commits and pushes, not Claude: commits optionally after each step, and pushes once the task is done.
- Split a task into steps. Define and build each step as one prompt or a short prompt loop.
- Define every step together with its **Verify** action (something the dev runs or sees). A step is done only when it passes.
- Order tasks outside-in: what the user sees first gets built first.
- Detail a task's steps only right before it starts.
- Keep a `## Roadmap` at the top of `tasks.md`: one line per task with the spec ACs it covers (`Covers: AC1, AC3`). Every AC must appear in at least one line.
- A task points to the plan section it implements; it never restates the plan.
- Each task must be clear on its own: its title, goal and steps together should explain the idea. If a concept needs more words or a short example to land, add them.
- Write steps for a human reading cold: plain sentences, never comma-separated keyword lists. Point to the plan for exact rules.
- Step = a short title saying what it does, then 1–3 sentences on what it builds and why.
- Verify = a numbered list of what the dev runs or sees, with the expected result.
- If Verify runs `pnpm test`, add a few bullets on what the tests check, with key examples only.

**Workflow**

1. **Plan:** first compact the previous task (it's pushed, so git keeps the full text): keep its Goal, each ticked step with a 1–2 line summary of what it built, "Done when" and deviation one-liners, and drop the rest of the step details. Then detail the next task's steps, Verify actions and "Done when" in `tasks.md`. No code.
2. **Wait for review** and approval.
3. **Implement** only that task, step by step, tests first.
4. **Finish:** run `pnpm test` and `pnpm typecheck`, handle deviations (below), tick the task, and hand off to the dev to commit and push.

**Deviations** (the code ended up different from the docs or the step): sort each one, never leave a paragraph under the task.

- **Makes a doc wrong:** fix that sentence in the doc in place (edit, don't append). Under the task, add one line: `- <what changed> → <doc> §<section>`.
- **Coding detail** (a version pin, a config file location, how a library is set up): don't write it down; the code shows it. Add a code comment only if the WHY isn't obvious.
- **Work for later:** a one-liner in the `## Follow-ups` list at the bottom of `tasks.md`.
- **Temporary** (a stub the next task replaces): skip it.

Changes outside the task's scope become follow-ups.

## Architecture (details in plan.md)

```
apps/web        React + Vite + TS · Tailwind + shadcn/ui · TanStack Query (server data) · Zustand (draft + UI)
apps/api        NestJS · SafeFetch · snapshot / forward / configs / agentView · SQLite (better-sqlite3)
packages/core   pure, shared: types, zod schemas, clean, selectors, resolve, transform, renderMarkdown, renderHtml
```

Everything is a function of `(page tree, config)`. The editor and Agent View use the **same** core functions.

## Commands

- Dev (web + api): `pnpm dev`
- Test: `pnpm test` · E2E: `pnpm e2e`
- Typecheck: `pnpm typecheck` · Lint: `pnpm lint`
- Build: `pnpm build`

**Running the app:** the dev runs `pnpm dev` in their own terminal, so they can see the logs and stop it.

- Claude never leaves `pnpm dev`, a watcher or a server running in the background.
- Before starting anything on ports 3001 or 5173, check `lsof -nP -iTCP:3001 -iTCP:5173 -sTCP:LISTEN` and say if something is already there.
- If a one-off check needs a server (e.g. `curl` against the api), say where it runs and stop it in the same command.

## Hard rules

- `packages/core` stays pure: no I/O, no Nest, no React, no fetch.
- The editor and Agent View use the same `clean` and `transform`, so the preview and the agent output can never diverge.
- Page content is never rendered as HTML in the web app: no `dangerouslySetInnerHTML`, no iframe. Render the tree with React.
- Every server-side fetch goes through `SafeFetchService`, with no exceptions.
- Preview, Markdown, the dirty flag and statuses are **derived**, never stored in state.
- User notes are plain strings, escaped in every renderer.
- A modification whose target can't be confidently resolved is never applied. Mark it unmatched.
- Types come from the zod schemas in core (`z.infer`). Don't hand-duplicate them.

## Engineering standards

- TypeScript strict, no `any`. Use `unknown` and narrow.
- Validate at boundaries (API input, stored config, fetched HTML), then trust types inside.

## Coding guidelines

- Readability over cleverness. Code should explain itself.
- Comments explain WHY, not WHAT.
- Functions: small and focused, but don't over-fragment.
- Naming:
  - descriptive (`resolvedTarget`, `forwardBudgetLeft`), never generic (`data`, `result`, `item`)
  - camelCase for variables and functions, PascalCase for types, classes and components
- Errors:
  - Catch where you can handle or translate them (e.g. a fetch failure becomes a `FetchError` code with a user-facing message); otherwise let them propagate.
  - No empty catches. Error messages say what failed and with what input.
- Request bodies that need validation use the `@ZodBody(schema)` decorator, typed with `z.infer<typeof schema>`. Never a raw `@Body()`.
- File size: consider splitting above ~300 lines, but only if it improves clarity.
- Tests: only test code where our logic can be wrong. Core logic and safety checks get thorough tests. Don't test that a library or the DB works.

## Collaboration

- Disagree freely when the user shares a plan, and suggest better alternatives with reasons.
- Act as a mentor: if a plan is weak, explain why and offer an improvement.
- Keep explanations short, concrete and simple, never a deep dive.
- When explaining a plan or a task in chat, use this flow:
  1. **The problem:** one sentence on what has to happen.
  2. **Where we start from:** what already exists and does the hard part, so it's clear what's left.
  3. **The idea:** the approach in plain words, with one small concrete example.
  4. **Decisions:** the straightforward parts first, then each deliberate choice with a one-sentence why.
  5. **What changes:** the files and what changes in each.
  6. **How you'll know it's right:** what the dev checks.

