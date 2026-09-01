# Folio documentation

Start here when the code, a plan, and an old screenshot seem to disagree.

## Current sources of truth

Read these in order:

| Document | Answers |
|---|---|
| [../CONTEXT.md](../CONTEXT.md) | What Folio terms mean |
| [PRODUCT_FLOW.md](./PRODUCT_FLOW.md) | What the user does and how a recipe reaches a book |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | How the current app implements that flow |
| [DATABASE.md](./DATABASE.md) | Which tables, states, RPCs, and ownership rules support it |
| [MONETIZATION.md](./MONETIZATION.md) | How Free, Plus, App Store products, entitlements, and designed-page capacity work |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | How to run, test, build, and debug the app |
| [INGESTION_EVALS.md](./INGESTION_EVALS.md) | How recipe-import quality is measured before changing models, prompts, or adapters |
| [PHASE9_RELEASE_RUNBOOK.md](./PHASE9_RELEASE_RUNBOOK.md) | What must pass before staging or production |
| [BRAND_RENAME.md](./BRAND_RENAME.md) | Which Folio names are current and which legacy identifiers remain for compatibility |
| [FOLIO_ASSISTANT.md](./FOLIO_ASSISTANT.md) | How the in-app Folio assistant builds context and uses tools |
| [adr/](./adr/) | Accepted decisions and the reasons behind them |

`AGENTS.md` is the coding-agent operating manual. `CLAUDE.md` points agents back to the same sources so the repository has one set of rules.

## One pipeline

The active import and generation contract is fixed by [ADR 0002](./adr/0002-single-capture-and-complete-page-generation.md):

```text
recipe source
  -> capture-recipe
  -> extract-recipe
  -> destination resolution
  -> one processing cookbook page
  -> generate-page-art creates the complete page with text
  -> ready page in the reader
```

Do not introduce a direct chat import, blocking review flow, pending-page approval, artwork-only generator, or new typesetter production path.

## Historical records

Files under `superpowers/specs/` and `superpowers/plans/` record earlier decisions and implementation work. They can explain why code exists, but they are not current instructions. Several describe the retired approval flow or the superseded split typesetter and artwork architecture.

`UX_INVENTORY_CURRENT.md` is a pre-simplification UX snapshot. Its diagrams and flow descriptions are historical.

When historical material conflicts with the current sources above, follow the current sources and the code. Add a clear superseded note to the historical file if the conflict could mislead another agent.

## Documentation rules

- Update `PRODUCT_FLOW.md` when user behavior changes.
- Update `ARCHITECTURE.md` when routes, providers, pipeline ownership, or major components change.
- Update `DATABASE.md` with every schema or state-machine migration.
- Update `MONETIZATION.md` with every plan, product, entitlement, allowance, or purchase-flow change.
- Update `DEVELOPMENT.md` when commands, environment variables, deployment order, or debugging steps change.
- Add an ADR only for a costly, surprising decision with real alternatives.
- Keep dated plans as history. Do not quietly rewrite them into current architecture.
- Delete obsolete root-level guides instead of leaving contradictory instructions beside `README.md`.
- Never include credentials, recipe content, source URLs, or private user data in documentation examples.
