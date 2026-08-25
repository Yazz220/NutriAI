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
- **Code ref**: [`components/create/CreationStudio.tsx`, `constants/cookbookCustomization.ts`]
- **From staging**: O05

## H03: Use one continuous studio for a small customization set
- **Rationale**: Keeping the live book, title, cover finishes, page languages, and final action in one continuous flow makes cause and effect immediate without adding navigation overhead. Selecting a page language can open the same book to its pinned sample spread, preserving tactile feedback while the choice set remains small.
- **Provenance**: user-revised
- **Crystallized via**: verbal-affirmation
- **Sensitivity**: medium
- **Code ref**: [`components/create/CreationStudio.tsx`, `app/(book)/library.tsx`]
- **From staging**: O06

## H04: Start with matched looks, then disclose independent controls
- **Rationale**: Three coherent cover-and-page presets make the first meaningful choice quick and visual, while the existing detailed cover and page-language controls remain available without blocking first value.
- **Provenance**: user-revised
- **Crystallized via**: verbal-affirmation
- **Sensitivity**: medium
- **Code ref**: [`constants/cookbookCustomization.ts`, `components/create/CreationStudio.tsx`]
- **From staging**: O09

## H05: Defer contextual tips across visits
- **Rationale**: Completing the first-page moment before showing a small in-book Nosh callout prevents stacked prompts, preserves reading as the reward, and introduces the conversational chef only where its recipe context is immediately meaningful.
- **Provenance**: ai-suggested
- **Crystallized via**: artifact-commitment
- **Sensitivity**: medium
- **Code ref**: [`components/cookbook/BookReader.tsx`, `components/nosh/NoshLaunchers.tsx`, `utils/cookbook/firstRunOnboarding.ts`]
- **From staging**: O12

## H06: Isolate both sides of an accessibility modal boundary
- **Rationale**: A modal flag on the overlay does not reliably remove sibling React Native content from the iOS accessibility tree. Hiding the underlying navigation subtree while the overlay is visible prevents VoiceOver from reaching controls users cannot see or operate.
- **Provenance**: ai-suggested
- **Crystallized via**: artifact-commitment
- **Sensitivity**: low
- **Code ref**: [`app/(book)/index.tsx`, `app/_layout.tsx`, `components/ui/Sheet.tsx`]
- **From staging**: O13

## H07: Separate decorative book type from scalable interface type
- **Rationale**: Cover stamps, spines, and bookplates live in fixed physical geometry and must preserve their authored scale, while prompts, labels, composers, and toolbars need bounded Dynamic Type and reflow. Treating both categories alike causes either clipped books or inaccessible controls.
- **Provenance**: ai-suggested
- **Crystallized via**: artifact-commitment
- **Sensitivity**: medium
- **Code ref**: [`components/physical-book/FoilStampedTitle.tsx`, `components/physical-book/SpineFace.tsx`, `components/cookbook/CookbookLeafPage.tsx`, `components/cookbook/BookReader.tsx`, `components/ui/Text.tsx`]
- **From staging**: O14

## H08: Resume retries from the latest durable artifact
- **Rationale**: Multi-stage AI workflows should not repeat successful, costly, and failure-prone stages. Reusing a persisted RecipeGraph makes a downstream page retry cheaper, faster, and less likely to be masked by a new extraction failure.
- **Provenance**: ai-suggested
- **Crystallized via**: artifact-commitment
- **Sensitivity**: low
- **Code ref**: [`supabase/functions/capture-recipe/index.ts`, `supabase/functions/_shared/capturePolicy.ts`]
- **From staging**: O15
