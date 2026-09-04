---
status: accepted
---

# Version recipe-page styles as immutable publishing contracts

## Decision

Folio uses one shared `RecipePageStyleRegistry` for the creation Studio and complete-page generation. A style definition owns art direction only: paper, typography, image medium, palette, graphic language, signature cues, density-aware composition, exclusions, and optional references. Canonical recipe data, 4:5 page geometry, capture orchestration, publication, and reader behavior remain style-independent.

Every cookbook stores an exact `(page_style_id, style_revision)` identity backed by `nutriai.recipe_page_style_versions`. Shipped versions are immutable. The active creation identities are Studio 1, Editorial 2, Illustrated 3, Watercolor 2, Heritage 2, Journal 1, and Artisan 1. Illustrated 3 requires a drawing beside each ingredient and each method step. Watercolor 2 preserves the original Illustrated 1 dish-portrait direction as a separate choice. Existing books keep their exact saved revision. Previous identities and revisions remain available for existing cookbooks.

`constants/cookbookCustomization.ts` attaches native preview assets but does not redefine style art direction. `_shared/artGeneration.ts` resolves the exact registry version and compiles a provider-neutral page brief before the OpenRouter request is built.

## Consequences

- Existing books do not change appearance when a style improves.
- A new style cannot alter extraction or introduce a second page pipeline.
- Unknown identity revisions fail explicitly instead of receiving a silent fallback.
- Studio samples and runtime prompts share the same names, revisions, and visual contracts.
- Adding a style requires one registry definition, a database catalog row, two preview assets, and tests.
