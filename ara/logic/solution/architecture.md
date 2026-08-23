# Architecture

## A01: Separate physical cover, page language, and adaptive layout
- **Statement**: A cookbook owns two independent user-selected identities—a physical cover finish and a versioned recipe-page visual language—while each recipe's concrete page layout remains automatically selected for content density and legibility.
- **Provenance**: user-revised
- **Crystallized via**: verbal-affirmation
- **Boundaries**: Cover changes must not alter generated page identity; page-language changes must not select a fixed layout; callers must not override the book-owned canonical page language per recipe.
- **Evidence**: [N10, N11, N12, N13]
- **Code ref**: [`components/create/BookCreationPrototype.tsx`, `supabase/functions/_shared/recipeLayout.ts`]
- **From staging**: O03
