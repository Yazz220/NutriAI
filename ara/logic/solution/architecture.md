# Architecture

## A01: Separate physical cover, page language, and adaptive layout
- **Statement**: A cookbook owns two independent user-selected identities—a physical cover finish and a versioned recipe-page visual language—while each recipe's concrete page layout remains automatically selected for content density and legibility.
- **Provenance**: user-revised
- **Crystallized via**: verbal-affirmation
- **Boundaries**: Cover changes must not alter generated page identity; page-language changes must not select a fixed layout; callers must not override the book-owned canonical page language per recipe.
- **Evidence**: [N10, N11, N12, N13, N14, N15]
- **Code ref**: [`components/create/CreationStudio.tsx`, `constants/cookbookCustomization.ts`, `utils/cookbook/api.ts`, `supabase/functions/_shared/recipeLayout.ts`, `supabase/functions/_shared/artGeneration.ts`]
- **From staging**: O03

## A02: Onboard through the real first-book path
- **Statement**: First run uses one optional welcome threshold, then teaches Nosh inside the production creation studio, real empty-book reader, canonical capture pipeline, and finished recipe page; later capabilities remain contextual.
- **Provenance**: user-revised
- **Crystallized via**: verbal-affirmation
- **Boundaries**: Onboarding must not become a parallel cookbook, import, or reader implementation; native share work takes precedence; skip and resume paths remain available.
- **Evidence**: [N16, N17, N18]
- **Code ref**: [`app/(book)/index.tsx`, `components/onboarding/FirstRunWelcome.tsx`, `app/(book)/library.tsx`, `components/create/CreationStudio.tsx`, `components/cookbook/BookReader.tsx`]
- **From staging**: O07
