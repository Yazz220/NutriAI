---
status: accepted
---

# Use one capture pipeline and generate the complete recipe page

Every recipe source enters the durable `capture-recipe` lifecycle, whether it comes from native sharing, the bookshelf, an open cookbook, or Folio. The capture owns extraction, destination resolution, page creation, retry, and publication. Folio keeps the Recipe Graph as canonical reasoning data, while `generate-page-art` produces the complete user-facing page, including visible recipe text and imagery, using the persisted cookbook style. We rejected a separate conversational import path, a blocking review and approval pipeline, and new typesetter-plus-art pages because those alternatives duplicated state, produced inconsistent outcomes, and let individual pages drift away from their book's visual identity.

## Consequences

- New entry points hand sources to `capture-recipe`; they do not call extraction and page creation themselves.
- `processing`, `needs_destination`, `needs_attention`, and `ready` are the only capture states.
- `generate-page-art` remains the deployed function name, but "art" means the complete recipe page in the canonical geometry recorded by ADR 0005.
- Cookbook style, revision, and reference images come from the database. A caller cannot set a different per-recipe style.
- The legacy typesetter and compatibility routes may render old data, but they cannot become a second path for new recipes.
