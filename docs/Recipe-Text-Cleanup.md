# Recipe Text Cleanup

Goal: Keep the recipe detail page clear and non-duplicative by:

- Stripping HTML from descriptions.
- Detecting when a "summary" is actually instruction-like and hiding it.
- Normalizing steps from various shapes (analyzed instructions, plain text, or summary fallback).
- Building a concise, true summary (1-2 sentences) that avoids repeating steps.

## Implementation

- `utils/text/recipeCleanup.ts` contains:
  - `stripHtml(text)` – remove HTML and simple entities
  - `isStepLikeLine(line)` – heuristic detector for instruction-style lines
  - `normalizeSteps(analyzedSteps, plainInstructions, summary)` – robust steps array
  - `buildConciseSummary(description, steps)` – short, non-duplicative summary
  - `cleanupRecipeText({ description, analyzedSteps, plainInstructions })`

- `EnhancedRecipeDetailModal.tsx` uses the cleanup to set the canonical `description` and `steps` before rendering.
- `RecipeDetail.tsx` collapses long summaries with a Read more/less toggle and hides the Summary section if it looks like instructions.

## Future: AI-Assisted Cleanup

We can add an optional AI layer to:

- Rewrite overly long descriptions into a single, friendly sentence.
- Merge/condense redundant steps and ensure consistent style.

Approach: Call an on-device or remote model with a structured prompt using the canonicalized ingredients and raw instructions, then validate and fall back to the deterministic utilities if AI output is missing or low quality.
