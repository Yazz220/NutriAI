/**
 * Calculate Recipe Nutrition Edge Function
 * 
 * Takes a recipe's ingredient list and returns accurate nutrition data
 * by looking up each ingredient in the USDA database.
 * 
 * Reuses the existing food_usda_mapping and food_synonyms infrastructure
 * from the AI nutrition scan pipeline.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Configuration
// =============================================================================
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// AI configuration (optional - falls back to database-only lookup)
const AI_API_KEY =
  Deno.env.get('OPENROUTER_API_KEY') ||
  Deno.env.get('AI_API_KEY') ||
  Deno.env.get('EXPO_PUBLIC_AI_API_KEY') ||
  '';

const AI_API_BASE =
  Deno.env.get('OPENROUTER_API_BASE') ||
  Deno.env.get('AI_API_BASE') ||
  Deno.env.get('EXPO_PUBLIC_AI_API_BASE') ||
  'https://openrouter.ai/api/v1';

const AI_MODEL =
  Deno.env.get('OPENROUTER_MODEL') ||
  Deno.env.get('AI_MODEL') ||
  Deno.env.get('EXPO_PUBLIC_AI_MODEL') ||
  'openai/gpt-oss-20b:free';

console.log('[Config] AI_API_KEY configured:', !!AI_API_KEY);
console.log('[Config] AI_MODEL:', AI_MODEL);

// =============================================================================
// Types
// =============================================================================
interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  optional?: boolean;
}

interface NutritionRequest {
  ingredients: RecipeIngredient[];
  servings: number;
}

interface NutritionResponse {
  perServing: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  total: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  ingredientBreakdown: Array<{
    name: string;
    canonical: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    matched: boolean;
  }>;
}

// =============================================================================
// CORS Headers
// =============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Use AI to normalize ingredient names to USDA-compatible food names
 */
async function normalizeIngredientsWithAI(
  ingredients: RecipeIngredient[]
): Promise<Map<string, string>> {
  if (!AI_API_KEY) {
    console.warn('[AI] API key not configured, skipping AI normalization');
    return new Map();
  }

  try {
    const ingredientList = ingredients
      .map(ing => `${ing.quantity} ${ing.unit} ${ing.name}`)
      .join('\n');

    const prompt = `You are a food database expert. Normalize these recipe ingredients into standard USDA food names.

For each ingredient, output ONLY the canonical food name (e.g., "chicken" not "chicken breast", "pasta" not "spaghetti", "tomato" not "diced tomatoes").

Ingredients:
${ingredientList}

Output format (one per line):
original ingredient -> canonical food name

Example:
2 cups diced tomatoes -> tomato
500g ground beef -> beef
1 tbsp olive oil -> olive_oil`;

    const response = await fetch(`${AI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_API_KEY}`,
        // OpenRouter recommends passing Referer / Title for attribution
        'HTTP-Referer': 'https://nutriai.app/recipes',
        'X-Title': 'NutriAI Recipe Normalizer',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a food database expert that normalizes ingredient names to standard USDA food categories.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI] OpenAI error:', response.status, error);
      return new Map();
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';
    
    console.log('[AI] Normalization response:', aiResponse);

    // Parse AI response into a map
    const normalizations = new Map<string, string>();
    const lines = aiResponse.split('\n');
    
    for (const line of lines) {
      if (!line.trim()) continue;
      const match = line.match(/^(.+?)\s*->\s*(.+)$/);
      if (!match) continue;

      const original = match[1].trim();
      const canonical = match[2].trim().toLowerCase().replace(/\s+/g, '_');

      // Find matching ingredient by best similarity (case-insensitive)
      const ingredient = ingredients.find(ing => {
        const ingName = ing.name.toLowerCase();
        const originalLower = original.toLowerCase();
        return ingName === originalLower || originalLower.includes(ingName) || ingName.includes(originalLower);
      });

      if (ingredient) {
        normalizations.set(ingredient.name, canonical);
        console.log(`[AI] Mapped: "${ingredient.name}" → "${canonical}"`);
      } else {
        console.log(`[AI] Unable to map line: ${line}`);
      }
    }

    return normalizations;
    
  } catch (error) {
    console.error('[AI] Normalization error:', error);
    return new Map();
  }
}

/**
 * Canonicalize ingredient name using AI mapping or food_synonyms table
 */
async function canonicalizeIngredient(
  supabase: any,
  ingredientName: string,
  aiMappings?: Map<string, string>
): Promise<string> {
  // Try AI mapping first (most accurate)
  if (aiMappings?.has(ingredientName)) {
    const aiCanonical = aiMappings.get(ingredientName)!;
    console.log(`[Canonicalize] AI mapping: "${ingredientName}" → "${aiCanonical}"`);
    return aiCanonical;
  }
  
  const normalized = ingredientName.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  
  // Try exact match in synonyms table
  let { data } = await supabase
    .from('food_synonyms')
    .select('canonical_name')
    .eq('synonym', normalized)
    .limit(1)
    .maybeSingle();
  
  if (data?.canonical_name) {
    console.log(`[Canonicalize] Exact match: "${ingredientName}" → "${data.canonical_name}"`);
    return data.canonical_name;
  }
  
  // Try partial match
  const result = await supabase
    .from('food_synonyms')
    .select('canonical_name')
    .or(`synonym.ilike.%${normalized}%,canonical_name.ilike.%${normalized}%`)
    .limit(1)
    .maybeSingle();
  
  if (result.data?.canonical_name) {
    console.log(`[Canonicalize] Partial match: "${ingredientName}" → "${result.data.canonical_name}"`);
    return result.data.canonical_name;
  }
  
  // Return normalized version if no match
  const fallback = normalized.replace(/\s+/g, '_');
  console.log(`[Canonicalize] No match: "${ingredientName}" → "${fallback}" (fallback)`);
  return fallback;
}

/**
 * Get USDA nutrition data for an ingredient
 */
async function getUSDANutrition(
  supabase: any,
  canonicalName: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('food_usda_mapping')
    .select('*')
    .eq('canonical_food', canonicalName)
    .maybeSingle();
  
  if (data) {
    console.log(`[USDA] Found: "${canonicalName}" → ${data.calories_per_100g} cal/100g`);
  } else {
    console.log(`[USDA] Not found: "${canonicalName}"`, error?.message || '');
  }
  
  return data;
}

/**
 * Convert ingredient quantity to grams based on unit
 */
function convertToGrams(quantity: number, unit: string, ingredientName: string): number {
  const unitLower = unit.toLowerCase().trim();
  
  // Volume to weight conversions (approximate)
  const volumeToGrams: Record<string, number> = {
    'cup': 240,
    'cups': 240,
    'tablespoon': 15,
    'tablespoons': 15,
    'tbsp': 15,
    'teaspoon': 5,
    'teaspoons': 5,
    'tsp': 5,
    'oz': 28.35,
    'ounce': 28.35,
    'ounces': 28.35,
    'lb': 453.592,
    'lbs': 453.592,
    'pound': 453.592,
    'pounds': 453.592,
    'ml': 1,
    'l': 1000,
    'liter': 1000,
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
  };
  
  // Direct conversion
  if (volumeToGrams[unitLower]) {
    return quantity * volumeToGrams[unitLower];
  }
  
  // Handle "piece" or "whole" - estimate based on ingredient
  if (unitLower === 'piece' || unitLower === 'pieces' || unitLower === 'whole' || unitLower === '') {
    // Common food weights
    const itemWeights: Record<string, number> = {
      'egg': 50,
      'eggs': 50,
      'banana': 120,
      'apple': 182,
      'orange': 131,
      'potato': 150,
      'onion': 110,
      'tomato': 123,
      'chicken breast': 174,
      'lemon': 58,
      'lime': 67,
    };
    
    for (const [key, weight] of Object.entries(itemWeights)) {
      if (ingredientName.toLowerCase().includes(key)) {
        return quantity * weight;
      }
    }
    
    // Default estimate: 100g per piece
    return quantity * 100;
  }
  
  // Unknown unit - assume grams
  return quantity;
}

/**
 * Calculate nutrition for a single ingredient
 */
async function calculateIngredientNutrition(
  supabase: any,
  ingredient: RecipeIngredient,
  aiMappings?: Map<string, string>
): Promise<any> {
  console.log(`[Calculate] Processing: ${ingredient.quantity} ${ingredient.unit} ${ingredient.name}`);
  
  // Canonicalize ingredient name (using AI mapping if available)
  const canonical = await canonicalizeIngredient(supabase, ingredient.name, aiMappings);
  
  // Get USDA data
  const usdaData = await getUSDANutrition(supabase, canonical);
  
  if (!usdaData) {
    console.log(`[Calculate] Skipping "${ingredient.name}" - no USDA data`);
    return {
      name: ingredient.name,
      canonical,
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      fiber: 0,
      matched: false,
    };
  }
  
  // Convert quantity to grams
  const grams = convertToGrams(ingredient.quantity, ingredient.unit, ingredient.name);
  console.log(`[Calculate] Converted: ${ingredient.quantity} ${ingredient.unit} → ${grams}g`);
  
  // Calculate nutrition based on per-100g values
  const multiplier = grams / 100;
  
  const result = {
    name: ingredient.name,
    canonical,
    grams,
    calories: Math.round((usdaData.calories_per_100g || 0) * multiplier),
    protein: parseFloat(((usdaData.protein_g_per_100g || 0) * multiplier).toFixed(1)),
    carbs: parseFloat(((usdaData.carbs_g_per_100g || 0) * multiplier).toFixed(1)),
    fats: parseFloat(((usdaData.fat_g_per_100g || 0) * multiplier).toFixed(1)),
    fiber: parseFloat(((usdaData.fiber_g_per_100g || 0) * multiplier).toFixed(1)),
    matched: true,
  };
  
  console.log(`[Calculate] Result: ${result.calories} cal, ${result.protein}g protein, ${result.carbs}g carbs, ${result.fats}g fat`);
  
  return result;
}

/**
 * Main handler
 */
async function handleRequest(request: Request): Promise<Response> {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { ingredients, servings = 1 }: NutritionRequest = await request.json();
    
    if (!ingredients || !Array.isArray(ingredients)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: ingredients array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    // Step 1: Use AI to normalize ingredient names
    const filteredIngredients = ingredients.filter(ing => !ing.optional);
    console.log('[AI] Normalizing ingredients with AI...');
    const aiMappings = await normalizeIngredientsWithAI(filteredIngredients);
    
    // Step 2: Calculate nutrition for each ingredient using AI mappings
    const ingredientBreakdown = await Promise.all(
      filteredIngredients.map(ing => calculateIngredientNutrition(supabase, ing, aiMappings))
    );
    
    // Sum up totals
    const total = ingredientBreakdown.reduce(
      (acc, ing) => ({
        calories: acc.calories + ing.calories,
        protein: acc.protein + ing.protein,
        carbs: acc.carbs + ing.carbs,
        fats: acc.fats + ing.fats,
        fiber: acc.fiber + ing.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );
    
    // Calculate per serving
    const perServing = {
      calories: Math.round(total.calories / servings),
      protein: parseFloat((total.protein / servings).toFixed(1)),
      carbs: parseFloat((total.carbs / servings).toFixed(1)),
      fats: parseFloat((total.fats / servings).toFixed(1)),
      fiber: parseFloat((total.fiber / servings).toFixed(1)),
    };
    
    // Log summary
    const matchedCount = ingredientBreakdown.filter(i => i.matched).length;
    const totalCount = ingredientBreakdown.length;
    console.log(`\n[Summary] Recipe Nutrition Calculation:`);
    console.log(`  Ingredients matched: ${matchedCount}/${totalCount}`);
    console.log(`  Total: ${total.calories} cal, ${total.protein}g protein, ${total.carbs}g carbs, ${total.fats}g fat`);
    console.log(`  Per serving (÷${servings}): ${perServing.calories} cal, ${perServing.protein}g protein, ${perServing.carbs}g carbs, ${perServing.fats}g fat\n`);
    
    const response: NutritionResponse = {
      perServing,
      total,
      ingredientBreakdown,
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[Calculate Recipe Nutrition] Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// =============================================================================
// Main
// =============================================================================
serve(handleRequest);
