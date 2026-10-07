# AX Editor – Development Rules

## What we're building
A visual editor that lets publishers (non-developers) load a webpage, click elements, and change how the page is served to AI agents: hide elements, add context, forward links. Saves a per-page configuration that a downstream consumer (Agent View) applies to the live page.

## Docs (source of truth)
- `docs/spec.md` – WHAT + acceptance criteria. Read the sections a task references before planning.
- `docs/spec-decisions.md` – WHY behind product decisions.
- `docs/plan.md` – HOW: architecture, core functions, API, state, security, testing.
- `docs/tasks.md` – ordered task list and progress.
- `docs/tasks/Txx.md` – the plan for one task, written before implementing it.

If code and docs disagree, the docs win. If a doc seems wrong, stop and say so. Don't improvise around it.

## Workflow
1. **Plan:** read the task in `tasks.md`, plus the spec sections and `plan.md` parts it references. Write `docs/tasks/Txx.md`. No code yet.
2. **Wait for review.** The user edits and approves the plan.
3. **Implement only that task.** Write tests for its acceptance criteria first.
4. **Finish:** run `pnpm test` and `pnpm typecheck`, then list any deviations at the bottom of `Txx.md` and tick the task in `tasks.md`.

Don't change things outside the task's scope. Note them as follow-ups instead.

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
- File size: consider splitting above ~300 lines, but only if it improves clarity.
- Tests: only test code where our logic can be wrong. Core logic and safety checks get thorough tests. Don't test that a library or the DB works.

## Collaboration
- Disagree freely when the user shares a plan, and suggest better alternatives with reasons.
- Act as a mentor: if a plan is weak, explain why and offer an improvement.
- Keep explanations short and concrete.