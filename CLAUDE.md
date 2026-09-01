# CLAUDE.md

Read [AGENTS.md](./AGENTS.md) before changing this repository. It is the canonical operating manual for coding agents. Read [CONTEXT.md](./CONTEXT.md) for product terms and [docs/README.md](./docs/README.md) for the documentation map.

## Product constraints

- Folio is a book-first personal cookbook. The bookshelf and reader are the product.
- There is one recipe-capture pipeline. Share to Folio, Cookbook Add, the shelf, and Folio handoffs all enter `capture-recipe`.
- `capture-recipe` owns extraction, destination resolution, page creation, retry, and publication. Do not build a direct extraction-to-page path in chat or another screen.
- `generate-page-art` is a compatibility route name. It generates the complete recipe page, including visible text. Do not add an artwork-only generator for new pages.
- The Recipe Graph is Folio's canonical reasoning data. The selected generated page image is what the user reads.
- A cookbook owns its page style. New pages inherit the persisted cookbook style, revision, and visual references. Users do not style individual recipes.
- New captures do not require review or approval. The only pauses are `needs_destination` and `needs_attention`.
- The table of contents is retired. New reader work starts with the cover, bookplate, and recipe pages.
- The legacy typesetter remains only so old pages stay readable. Do not route new captures through it.

## Before changing the pipeline

Read [docs/PRODUCT_FLOW.md](./docs/PRODUCT_FLOW.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [ADR 0002](./docs/adr/0002-single-capture-and-complete-page-generation.md). Dated files under `docs/superpowers/` are historical records and cannot override those documents.

## Verification

```bash
npm run typecheck
npm run lint
npm test -- --runInBand
```

Do not commit unless the user asks. Never put provider or service-role keys in `EXPO_PUBLIC_*` variables.
