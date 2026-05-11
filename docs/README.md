# Nosh — Documentation

Welcome. The cookbook product moves fast; everything in here reflects the **current** state of the app, not earlier products. If something is stale, fix it in place rather than leaving notes that contradict the code.

## Index

| Doc | Purpose |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How the app is wired: navigation, state layers, AI pipeline, Edge Functions. |
| [DATABASE.md](./DATABASE.md) | Supabase schema (`nutriai`), RLS posture, migrations. |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Run / build / test / deploy commands and gotchas. |
| [superpowers/specs/](./superpowers/specs/) | Approved design specs. |
| [superpowers/plans/](./superpowers/plans/) | Implementation plans paired with each spec. |

## What lives where

- **Specs** describe *what* we're building and *why*. They're approved before any code.
- **Plans** describe *how* — file-level changes, order of operations, verification steps.
- **ARCHITECTURE / DATABASE / DEVELOPMENT** describe *what exists right now*.

If a spec/plan ships and the doc is no longer needed, it stays in `superpowers/` as a record. If the architecture changes meaningfully, update `ARCHITECTURE.md` in the same PR.

## House rules

- One source of truth per topic. Don't duplicate database details across multiple files.
- Code references use linkable paths (e.g. [hooks/useCookbook.ts](../hooks/useCookbook.ts)). Keep them current.
- Never write a "Session recap" doc that captures one chat. Recaps belong in commit messages and PRs.
- Never describe deprecated products (calorie tracker, food logging, inventory) in current docs.
