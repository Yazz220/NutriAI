# Nutrition Accuracy Plan

This document outlines reliable, industry-standard ways to compute calories/macros per serving, compares common APIs and datasets, and proposes a pragmatic hybrid approach for NutriAI.

## TL;DR
- Most consumer apps rely on a large curated nutrition database behind an API (Edamam, Nutritionix), which returns per-ingredient nutrition and can compute per-recipe totals and per-serving breakdowns from free text.
- Open datasets (USDA FoodData Central, Open Food Facts) are robust but require your own ingredient parsing, canonicalization, density conversions, and matching logic to get solid coverage and accuracy.
- Recommended: Hybrid strategy
  - Primary: External Nutrition API (Edamam Nutrition Analysis or Nutritionix) for high-coverage, accurate parsing and nutrition totals.
  - Secondary: Local compute fallback using USDA/Open Food Facts + our improved converter when the API fails, is rate-limited, or for offline scenarios.
  - Persist results in a local cache keyed by normalized ingredient strings and recipe hashes to avoid repeated lookups/costs.

---

## Industry-standard approaches

### 1) Third-party Nutrition APIs (most common in apps)
- Edamam Nutrition Analysis API
  - Pros: High-coverage database, robust ingredient NLP/parsing, returns per-ingredient and recipe totals, per-serving values, diet/health labels.
  - Cons: Paid beyond free tier; rate limits; data can slightly differ vs USDA.
  - Workflow: Send array of ingredient strings and serving count (or yield). API returns detailed nutrition and per serving.
- Nutritionix API (Natural Language endpoint)
  - Pros: Good coverage, handles branded items well, supports free-text queries; straightforward.
  - Cons: Paid; brand-centric; may require disambiguation.
- Spoonacular Nutrition
  - Pros: Convenient for recipe data; returns nutrition per recipe.
  - Cons: Coverage and parsing less robust vs Edamam/Nutritionix; service stability varies.

Typical pattern: Client or backend sends the recipe’s ingredient list and servings to API → API returns totals + per serving. Apps then show per-serving numbers; optionally cache for later.

### 2) USDA FoodData Central (FDC) + Open Food Facts (open data)
- Pros: Open and free; authoritative; granular. OFF covers packaged foods worldwide.
- Cons: Requires building matching logic: text normalization, fuzzy matching, synonym/alias maps, density conversions, and typical household measures.
- Typical steps:
  1. Parse ingredient strings into {amount, unit, food name} (NLP). Handle fractions/mixed numbers, container units, ranges.
  2. Canonicalize name to a normalized token; expand synonyms/aliases.
  3. Match to FDC items (prefer SR Legacy/Reference or FNDDS for household measure coverage). For packaged foods, match to OFF barcodes/labels.
  4. Convert units to grams via densities and count weights; use FNDDS household measures when available.
  5. Sum per-100g nutrition scaled by weight → whole-recipe totals → divide by servings.
  6. Cache matches and allow manual correction.

This is what we currently implement in-house; it’s flexible but needs continuous expansion of facts, aliases, densities, and heuristics.

---

## Recommended hybrid for NutriAI

- Primary: Edamam Nutrition Analysis API (or Nutritionix)
  - Send recipe ingredients (original strings) and recipe yield (servings) whenever available.
  - Store the per-ingredient mappings and returned per-serving nutrition in our database/local cache.
- Fallback: In-app engine (current approach) using USDA/Open Food Facts + our aliases/densities when:
  - The API fails, the recipe is extremely custom, or quotas are hit.
  - The user is offline or has privacy preferences.
- Human-in-the-loop: Allow users to edit a few ingredient lines or serving yield to correct edge cases. Persist corrections.

### Why hybrid?
- Maximizes accuracy and coverage out of the box.
- Keeps cost manageable by caching and only calling API for new or changed recipes.
- Retains offline/low-connectivity capability via local compute.

---

## Implementation outline

### Data flow
1. Normalize the ingredient list (keep the raw text and a normalized token).
2. Check cache by recipe hash (title + ingredient normalized list + servings).
3. If cache miss → call Edamam (preferred) with ingredient strings and servings.
4. Persist the returned nutrition (totals + per-serving) and per-ingredient mappings.
5. If the call fails or rate-limited → run local engine (our current compute) and persist with a flag `nutrition.source = 'local'`.

### Matching and caching
- Key cache by:
  - recipeHash = sha256(title + '\n' + normalizedIngredients.join('\n') + `|servings:${servings}`)
  - ingredientKey = normalized ingredient string (e.g., `"kidney beans|can|1"`)
- Persist:
  - nutrition per serving (calories, protein, carbs, fats, fiber, sugar, sodium) + total
  - per-ingredient matched item IDs (API foodId/FDC ID/OFF code)
  - source (edamam|nutritionix|local) + version

### UI/UX
- Show a small “Calculated by Edamam”/“Calculated locally” note in detail.
- Provide a debug expand/collapse showing per-ingredient conversions:
  - Original text → interpreted amount/unit → grams → matched food → per-100g → subtotal kcal/macros
- Allow editing servings and specific lines to correct outliers and re-calc.

### Error handling
- Unmatched ingredient → fallback to parent category (e.g., “beans” generic) + flag.
- Ambiguous unit → prompt user to choose typical container or use a safe default.
- API timeouts → switch to local compute with a soft warning.

---

## Option A: Edamam Nutrition Analysis (recommended primary)

- Endpoint: `POST https://api.edamam.com/api/nutrition-details?app_id=...&app_key=...`
- Body example:
  ```json
  {
    "title": "Vegetarian Chili",
    "ingr": [
      "400 g roasted vegetables",
      "1 can kidney beans (drained)",
      "1 can chopped tomatoes",
      "1 pouch mixed grains (250g)"
    ],
    "yield": 4
  }
  ```
- Returns per-ingredient parsed results, total and per-serving nutrients; diet/health labels.
- Pricing: pay-as-you-go; cache aggressively.

## Option B: Nutritionix (natural language)
- Endpoint: `POST /v2/natural/nutrients`
- Body example:
  ```json
  { "query": "400g roasted vegetables, 1 can kidney beans, 1 can chopped tomatoes, 1 pouch mixed grains" }
  ```
- Returns items with weights and macros; sum and divide by servings.

## Option C: Pure open-data (USDA FDC + OFF)
- Keep expanding our alias maps, densities, count weights.
- Use FDC search to get `foodNutrients` with portion data; prefer FNDDS for household measures.
- Heuristics for containers (can/jar/packet/pouch) like we added; allow manual correction.

---

## Standardization details

- Per-serving definition: per recipe serving (yield). If unknown, estimate or ask user; default to 600–700 kcal target for mains.
- Units & densities: use household measures from FNDDS when available; otherwise density tables.
- Cooking yields: calories are conserved; weight changes don’t change total kcal. We generally don’t apply cooking transforms unless modeling water loss is necessary.
- Rounding: Round calories to nearest integer, macros to 0.1 g.

---

## Roadmap for NutriAI

1. Add Edamam Nutrition Analysis provider (backend or client with secure proxy)
   - Env: APP_ID, APP_KEY
   - New module: `utils/providers/edamamNutrition.ts`
   - Cache by recipe hash in local storage/DB
2. Add a debug breakdown panel in `RecipeDetail` (hidden behind a dev/advanced toggle)
3. Continue improving local compute
   - Expand aliases and facts (especially canned vs drained weights)
   - More densities and count weights
   - Better unit parsing (ranges, “to taste”, multi-units)
4. Optional: Add Nutritionix as secondary provider for brand/package-heavy recipes

---

## Acceptance criteria
- Coverage: > 95% of external recipes return non-zero per-serving calories/macros without manual edits.
- Consistency: Per-serving numbers stable across Discover vs Saved.
- Latency: < 1.5s median for first-time nutrition fetch; ~0ms when cached.
- Cost: <$X/mo via caching (tunable by usage).

---

## References
- Edamam Nutrition Analysis API docs
- Nutritionix Natural Language Nutrients API
- USDA FoodData Central API
- Open Food Facts

