# Heuristics

## H01: Normalize model IDs and render legacy data defensively
- **Rationale**: AI structured output can satisfy a string schema while repeating identifiers. Normalizing IDs prevents new invalid graphs, and collision-safe render keys keep existing saved recipes usable without destructive data rewrites.
- **Provenance**: ai-suggested
- **Crystallized via**: artifact-commitment
- **Sensitivity**: low
- **Code ref**: [`supabase/functions/_shared/recipeGraphNormalization.ts`, `components/cookbook/typesetter/TextLayer.tsx`]
- **From staging**: O01

## H02: Keep first-release cookbook customization curated
- **Rationale**: One live book preview, one title field, a few combined cover finishes, and at most three pinned page-look previews make the experience personal without turning creation into a design tool or spending model calls on previews.
- **Provenance**: user-revised
- **Crystallized via**: verbal-affirmation
- **Sensitivity**: medium
- **Code ref**: [`components/create/BookCreationPrototype.tsx`]
- **From staging**: O05
