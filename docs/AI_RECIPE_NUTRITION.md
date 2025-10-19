# AI-Enhanced Recipe Nutrition System

## Overview

NutriAI uses an AI-powered pipeline to calculate accurate nutrition data for recipes by normalizing ingredient names and looking them up in the USDA database.

## Architecture

### Flow
1. **Recipe ingredients** → `["2 cups spaghetti", "500g ground beef", "1 cup tomato sauce"]`
2. **AI normalization** → `["pasta", "beef", "tomato"]` (via OpenRouter GPT)
3. **USDA lookup** → Gets per-100g nutrition data
4. **Unit conversion** → Converts cups/tbsp/pieces to grams
5. **Calculation** → Multiplies by grams, divides by servings
6. **Display** → Shows accurate macros on recipe cards

### Components

#### 1. Edge Function: `calculate-recipe-nutrition`
**Location:** `supabase/functions/calculate-recipe-nutrition/index.ts`

**Purpose:** Server-side nutrition calculation with AI normalization

**Environment Variables:**
- `AI_API_KEY` - OpenRouter API key
- `AI_API_BASE` - `https://openrouter.ai/api/v1`
- `AI_MODEL` - `openai/gpt-oss-20b:free`

**Key Functions:**
- `normalizeIngredientsWithAI()` - Uses GPT to map ingredients to USDA names
- `canonicalizeIngredient()` - Falls back to food_synonyms table
- `getUSDANutrition()` - Looks up nutrition in food_usda_mapping
- `convertToGrams()` - Converts various units to grams
- `calculateIngredientNutrition()` - Combines all steps for one ingredient

#### 2. Client Hook: `useRecipeNutritionEnrichment`
**Location:** `hooks/useRecipeNutritionEnrichment.ts`

**Purpose:** Automatically enriches recipes with nutrition data

**Usage:**
```typescript
// For local recipes
const enrichedRecipes = useRecipeNutritionEnrichment(recipes);

// For external recipes (TheMealDB)
const enrichedRecipes = useExternalRecipeNutritionEnrichment(recipes);
```

#### 3. Client Utility: `recipeNutrition.ts`
**Location:** `utils/recipeNutrition.ts`

**Purpose:** Calls the edge function from the client

**Functions:**
- `calculateRecipeNutrition()` - Single recipe calculation
- `calculateRecipeNutritionBatch()` - Batch processing
- `estimateRecipeNutrition()` - Fallback estimation

#### 4. Ingredient Parser: `mealdb.ts`
**Location:** `utils/providers/mealdb.ts`

**Purpose:** Parses TheMealDB ingredient strings into structured data

**Improvements:**
- Extracts quantities from measure strings (e.g., "2 cups" → `amount: 2, unit: "cups"`)
- Handles fractions (e.g., "1/2 tsp" → `amount: 0.5`)
- Preserves original text for AI processing

## Database Tables

### `food_usda_mapping`
Stores per-100g nutrition data for canonical foods.

**Columns:**
- `canonical_food` (primary key)
- `calories_per_100g`
- `protein_g_per_100g`
- `carbs_g_per_100g`
- `fat_g_per_100g`
- `fiber_g_per_100g`

### `food_synonyms`
Maps alternative names to canonical foods.

**Columns:**
- `synonym` (primary key)
- `canonical_name` (foreign key to food_usda_mapping)

## Unit Conversions

The system handles various units:

**Volume:**
- cup → 240g
- tablespoon/tbsp → 15g
- teaspoon/tsp → 5g
- ml → 1g
- liter → 1000g

**Weight:**
- oz/ounce → 28.35g
- lb/pound → 453.592g
- kg → 1000g

**Pieces:**
- Common items have predefined weights (e.g., egg → 50g, banana → 120g)
- Unknown items default to 100g per piece

## AI Normalization

**Model:** `openai/gpt-oss-20b:free` (via OpenRouter)

**Prompt Strategy:**
```
You are a food database expert. Normalize these recipe ingredients 
into standard USDA food names.

For each ingredient, output ONLY the canonical food name 
(e.g., "chicken" not "chicken breast", "pasta" not "spaghetti").
```

**Example Mappings:**
- "2 cups diced tomatoes" → "tomato"
- "500g ground beef" → "beef"
- "1 tbsp olive oil" → "olive_oil"
- "spaghetti" → "pasta"
- "mozzarella cheese" → "cheese"

## Integration Points

### Recipes Tab (Discovery Page)
**File:** `components/InventoryAwareRecipeDiscovery.tsx`

Enriches external recipes from TheMealDB with nutrition data.

### Recipes Tab (My Recipes)
**File:** `app/(tabs)/recipes.tsx`

Enriches local/saved recipes with nutrition data.

### Recipe Cards
**File:** `components/recipes/RecipeCard.tsx`

Displays nutrition data (calories, protein, carbs, fats).

## Performance

- **Batching:** Processes 5 recipes at a time to avoid overwhelming the API
- **Caching:** Results are cached in the recipe object
- **Progressive Updates:** UI updates as batches complete
- **Non-blocking:** Runs in background, doesn't freeze UI

## Error Handling

- **AI unavailable:** Falls back to food_synonyms table
- **USDA not found:** Skips ingredient (contributes 0 to totals)
- **Network errors:** Gracefully degrades, shows partial results
- **Invalid units:** Defaults to reasonable estimates

## Deployment

### Set Secrets
```powershell
npx supabase secrets set AI_API_KEY="sk-or-v1-..." --project-ref wckohtwftlwhyldnfpbz
npx supabase secrets set AI_API_BASE="https://openrouter.ai/api/v1" --project-ref wckohtwftlwhyldnfpbz
npx supabase secrets set AI_MODEL="openai/gpt-oss-20b:free" --project-ref wckohtwftlwhyldnfpbz
```

### Deploy Function
```powershell
npx supabase functions deploy calculate-recipe-nutrition --project-ref wckohtwftlwhyldnfpbz
```

### Update Client
```powershell
npx expo start --clear
```

## Troubleshooting

### 503 Boot Error
- Check that AI secrets are set: `npx supabase secrets list`
- Verify API key is valid on OpenRouter dashboard
- Check Supabase logs for detailed error messages

### Low Match Rate
- Add more entries to `food_synonyms` table
- Improve AI prompt for better normalization
- Check USDA database coverage

### Incorrect Macros
- Verify unit conversions are accurate
- Check USDA data for specific foods
- Review AI normalization mappings in logs

## Future Improvements

1. **Expand USDA Database:** Add more common foods
2. **Improve Synonyms:** Crowdsource ingredient mappings
3. **Better Unit Detection:** Handle more complex measurements
4. **Caching:** Cache AI normalizations to reduce API calls
5. **User Feedback:** Allow users to correct nutrition data
