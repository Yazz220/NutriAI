# Heuristics

## H01: Normalize model IDs and render legacy data defensively
- **Rationale**: AI structured output can satisfy a string schema while repeating identifiers. Normalizing IDs prevents new invalid graphs, and collision-safe render keys keep existing saved recipes usable without destructive data rewrites.
- **Provenance**: ai-suggested
- **Crystallized via**: artifact-commitment
- **Sensitivity**: low
- **Code ref**: [`supabase/functions/_shared/recipeGraphNormalization.ts`, `components/cookbook/typesetter/TextLayer.tsx`]
- **From staging**: O01
