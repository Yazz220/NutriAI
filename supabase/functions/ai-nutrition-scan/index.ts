/**
 * AI Nutrition Scan Edge Function v1.1
 * 
 * Analyzes food images using prithivMLmods/Food-101-93M and returns nutrition data.
 * 
 * Flow:
 * 1. Validate & process image (resize, compress)
 * 2. Classify food using Food-101-93M (Hugging Face Inference API)
 * 3. Canonicalize label using food_synonyms table
 * 4. Lookup nutrition from food_usda_mapping
 * 5. Compute macros based on portion estimate
 * 6. Return structured response with caching
 * 
 * @see https://huggingface.co/prithivMLmods/Food-101-93M
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// Configuration
// =============================================================================
// Using nateraw/food model which is confirmed to work with Inference API
// Alternative: 'prithivMLmods/Food-101-93M' (if it becomes available)
const FOOD_CLASSIFIER_URL = Deno.env.get('FOOD_CLASSIFIER_URL') || 
  'https://api-inference.huggingface.co/models/nateraw/food';
const HUGGINGFACE_API_KEY = Deno.env.get('HUGGINGFACE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const MODEL_VERSION = 'food-101-93m@v1';
const MAPPING_VERSION = 'usda-map@2025-01';

// Constants
const MAX_IMAGE_SIZE = 1.5 * 1024 * 1024; // 1.5 MB
const MAX_DIMENSION = 1024;
const CACHE_TTL = 86400; // 24 hours in seconds
const MIN_CONFIDENCE_THRESHOLD = 0.03; // 3% - allow low confidence results
const TOP_K_RESULTS = 3;

// =============================================================================
// Types
// =============================================================================
interface ScanRequest {
  image_b64: string;
  notes?: string;
  user_id?: string;
}

interface ClassificationResult {
  label: string;
  score: number;
}

interface USDAMapping {
  label: string;
  fdc_id: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  default_grams: number;
  default_portion_text?: string;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  portion_text: string;
  grams_total: number;
}

interface ScanResponse {
  items: Array<{
    label: string;
    score: number;
    canonical_label: string;
  }>;
  totals: NutritionTotals;
  model_version: string;
  mapping_version: string;
  cached: boolean;
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: string;
}

// =============================================================================
// Error Classes
// =============================================================================
class ScanError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: string
  ) {
    super(message);
    this.name = 'ScanError';
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Validates and processes base64 image
 */
function validateImage(imageB64: string): void {
  if (!imageB64 || typeof imageB64 !== 'string') {
    throw new ScanError('INVALID_IMAGE', 'Image data is required', 400);
  }

  // Remove data URL prefix if present
  const base64Data = imageB64.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Validate base64 format
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(base64Data)) {
    throw new ScanError('INVALID_IMAGE', 'Invalid base64 format', 400);
  }

  // Check size (approximate)
  const sizeInBytes = (base64Data.length * 3) / 4;
  if (sizeInBytes > MAX_IMAGE_SIZE) {
    throw new ScanError(
      'IMAGE_TOO_LARGE',
      `Image must be less than ${MAX_IMAGE_SIZE / 1024 / 1024}MB`,
      400,
      `Actual size: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB`
    );
  }
}

/**
 * Generates cache key from image data
 * Uses a simple hash function since crypto module is not available
 */
function generateCacheKey(imageB64: string): string {
  const base64Data = imageB64.replace(/^data:image\/[a-z]+;base64,/, '');
  
  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < Math.min(base64Data.length, 1000); i++) {
    hash = ((hash << 5) + hash) + base64Data.charCodeAt(i);
  }
  
  return `food-scan:${Math.abs(hash).toString(36)}`;
}

/**
 * Classifies food image using Food-101-93M
 */
async function classifyFood(imageB64: string): Promise<ClassificationResult[]> {
  if (!HUGGINGFACE_API_KEY) {
    throw new ScanError(
      'CONFIG_ERROR',
      'Hugging Face API key not configured',
      500
    );
  }

  const base64Data = imageB64.replace(/^data:image\/[a-z]+;base64,/, '');

  try {
    console.log('[AI Scan] Calling Hugging Face API:', FOOD_CLASSIFIER_URL);
    
    // Convert base64 to binary for Hugging Face API
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    const response = await fetch(FOOD_CLASSIFIER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/octet-stream',
      },
      body: bytes,
    });

    console.log('[AI Scan] HF API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[AI Scan] HF API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      
      throw new ScanError(
        'CLASSIFICATION_FAILED',
        'Failed to classify image',
        response.status,
        errorText
      );
    }

    const results: ClassificationResult[] = await response.json();

    console.log('[AI Scan] Raw results:', results.slice(0, 5).map(r => 
      `${r.label}: ${(r.score * 100).toFixed(1)}%`
    ));

    // Filter by confidence threshold and return top-k
    const filtered = results
      .filter(r => r.score >= MIN_CONFIDENCE_THRESHOLD)
      .slice(0, TOP_K_RESULTS);

    // If no results pass threshold, return best match anyway with warning
    if (filtered.length === 0 && results.length > 0) {
      console.warn('[AI Scan] Low confidence, returning best match:', 
        results[0].label, 
        `${(results[0].score * 100).toFixed(1)}%`
      );
      return [results[0]]; // Return best match even if confidence is very low
    }

    if (filtered.length === 0) {
      throw new ScanError(
        'NO_MATCH',
        'Could not identify food',
        422,
        'No classification results returned'
      );
    }

    return filtered;
  } catch (error) {
    if (error instanceof ScanError) throw error;
    
    throw new ScanError(
      'CLASSIFICATION_ERROR',
      'Classification service error',
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Canonicalizes food label using synonyms table
 */
async function canonicalizeLabel(
  supabase: ReturnType<typeof createClient>,
  label: string
): Promise<string> {
  // Normalize label: lowercase, replace spaces with underscores
  const normalized = label.toLowerCase().replace(/\s+/g, '_');

  // Check synonyms table
  const { data: synonym } = await supabase
    .from('food_synonyms')
    .select('canonical_label')
    .eq('alias', normalized)
    .single();

  if (synonym) {
    return synonym.canonical_label;
  }

  // Check if label exists directly in mapping
  const { data: mapping } = await supabase
    .from('food_usda_mapping')
    .select('label')
    .eq('label', normalized)
    .single();

  if (mapping) {
    return normalized;
  }

  // No match found - return normalized label
  // (Will fail in USDA lookup, triggering fallback)
  return normalized;
}

/**
 * Looks up nutrition data from USDA mapping
 */
async function lookupNutrition(
  supabase: ReturnType<typeof createClient>,
  canonicalLabel: string
): Promise<USDAMapping> {
  const { data, error } = await supabase
    .from('food_usda_mapping')
    .select('*')
    .eq('label', canonicalLabel)
    .single();

  if (error || !data) {
    throw new ScanError(
      'USDA_LOOKUP_FAILED',
      `No nutrition data found for: ${canonicalLabel}`,
      404,
      'Try using the Search tab for this food'
    );
  }

  return data as USDAMapping;
}

/**
 * Computes nutrition totals from per-100g data
 */
function computeNutritionTotals(
  usda: USDAMapping,
  gramsOverride?: number
): NutritionTotals {
  const grams = gramsOverride || usda.default_grams;
  const multiplier = grams / 100;

  return {
    calories: Math.round(usda.calories * multiplier),
    protein: Math.round(usda.protein * multiplier * 10) / 10,
    carbohydrates: Math.round(usda.carbohydrates * multiplier * 10) / 10,
    fat: Math.round(usda.fat * multiplier * 10) / 10,
    fiber: usda.fiber ? Math.round(usda.fiber * multiplier * 10) / 10 : undefined,
    sugar: usda.sugar ? Math.round(usda.sugar * multiplier * 10) / 10 : undefined,
    portion_text: usda.default_portion_text || `${grams}g`,
    grams_total: grams,
  };
}

/**
 * Main scan handler
 */
async function handleScan(request: ScanRequest): Promise<ScanResponse> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Step 1: Validate image
  validateImage(request.image_b64);

  // Step 2: Check cache
  const cacheKey = generateCacheKey(request.image_b64);
  const { data: cached, error: cacheError } = await supabase
    .from('_cache')
    .select('value')
    .eq('key', cacheKey)
    .single();

  if (cached?.value && !cacheError) {
    console.log('[AI Scan] Cache hit:', cacheKey);
    return { ...cached.value, cached: true };
  }

  // Step 3: Classify food
  const classifications = await classifyFood(request.image_b64);
  const topResult = classifications[0];

  // Step 4: Canonicalize labels
  const canonicalizedItems = await Promise.all(
    classifications.map(async (item) => ({
      label: item.label,
      score: item.score,
      canonical_label: await canonicalizeLabel(supabase, item.label),
    }))
  );

  // Step 5: Lookup nutrition for top result
  const nutrition = await lookupNutrition(
    supabase,
    canonicalizedItems[0].canonical_label
  );

  // Step 6: Compute totals
  const totals = computeNutritionTotals(nutrition);

  // Step 7: Build response
  const response: ScanResponse = {
    items: canonicalizedItems,
    totals,
    model_version: MODEL_VERSION,
    mapping_version: MAPPING_VERSION,
    cached: false,
  };

  // Step 8: Cache result (best effort - don't fail if cache fails)
  const { error: cacheWriteError } = await supabase
    .from('_cache')
    .upsert({
      key: cacheKey,
      value: response,
      expires_at: new Date(Date.now() + CACHE_TTL * 1000).toISOString(),
    });
  
  if (cacheWriteError) {
    console.error('[AI Scan] Cache write failed:', cacheWriteError);
  }

  // Step 9: Log scan (if user_id provided - best effort)
  if (request.user_id) {
    const { error: logError } = await supabase
      .from('food_logs')
      .insert({
        user_id: request.user_id,
        source: 'ai_scan',
        label: canonicalizedItems[0].canonical_label,
        confidence: topResult.score,
        grams_total: totals.grams_total,
        portion_text: totals.portion_text,
        totals: {
          calories: totals.calories,
          protein: totals.protein,
          carbohydrates: totals.carbohydrates,
          fat: totals.fat,
          fiber: totals.fiber,
          sugar: totals.sugar,
        },
        model_version: MODEL_VERSION,
        mapping_version: MAPPING_VERSION,
      });
    
    if (logError) {
      console.error('[AI Scan] Log insert failed:', logError);
    }
  }

  return response;
}

// =============================================================================
// CORS Headers
// =============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// Main Handler
// =============================================================================
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body: ScanRequest = await req.json();

    // Process scan
    const result = await handleScan(body);

    // Return success response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[AI Scan] Error:', error);

    // Handle ScanError
    if (error instanceof ScanError) {
      const errorResponse: ErrorResponse = {
        error: error.message,
        code: error.code,
        details: error.details,
      };

      return new Response(JSON.stringify(errorResponse), {
        status: error.statusCode,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    // Handle unexpected errors
    const errorResponse: ErrorResponse = {
      error: 'Internal server error',
      code: 'UNKNOWN_ERROR',
      details: error instanceof Error ? error.message : String(error),
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
});
