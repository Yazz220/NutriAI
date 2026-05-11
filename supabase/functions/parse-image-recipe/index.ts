/**
 * parse-image-recipe Edge Function
 *
 * Accepts a base64-encoded image of a recipe (cookbook page, recipe card,
 * screenshot) and uses Google Gemini 2.5 Flash vision to extract structured
 * recipe data as JSON.
 *
 * Required Supabase Function secret:
 *   GEMINI_API_KEY – Google AI Studio API key
 *
 * Request body:
 *   { image: string }   // base64-encoded image data (no data-URI prefix needed)
 *
 * Response body (success):
 *   { recipe: ParsedRecipe }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { normalizeBase64Payload } from '../_shared/base64.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_API_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const MAX_IMAGE_BASE64_BYTES = 8_000_000;

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Recipe extraction prompt
// ---------------------------------------------------------------------------
const RECIPE_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Analyze the image and extract the recipe information.

Return ONLY valid JSON with this exact structure (no markdown, no extra text):
{
  "title": "Recipe name",
  "description": "Brief description of the dish",
  "servings": 4,
  "prep_time": 15,
  "cook_time": 30,
  "ingredients": [
    { "name": "ingredient name", "quantity": "1", "unit": "cup" }
  ],
  "steps": [
    "Step 1 instructions",
    "Step 2 instructions"
  ],
  "tags": ["tag1", "tag2"],
  "category": "dinner"
}

Rules:
- "servings" must be a number (integer)
- "prep_time" and "cook_time" are in minutes (integers); use 0 if not specified
- "quantity" should be a string (e.g. "1", "1/2", "2-3")
- "unit" can be empty string if not applicable (e.g. for "2 eggs")
- "category" must be exactly one of: breakfast, lunch, dinner, snacks, appetizers, desserts, drinks, sides
- "tags" should be 2-5 relevant tags (cuisine type, dietary info, cooking method, etc.)
- If a field cannot be determined from the image, use sensible defaults
- If this is not a recipe image, return { "error": "No recipe found in image" }`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GeminiPart {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  error?: { message: string; code: number };
}

interface RawRecipe {
  title?: string;
  description?: string;
  servings?: number;
  prep_time?: number;
  cook_time?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients?: Array<{ name?: string; quantity?: string; unit?: string }>;
  steps?: string[];
  instructions?: string[];
  tags?: string[];
  category?: string;
  error?: string;
}

interface ParsedRecipe {
  title: string;
  description: string;
  servings: number;
  prepTime: number;
  cookTime: number;
  ingredients: Array<{ name: string; quantity: string; unit: string }>;
  steps: string[];
  tags: string[];
  category: string;
}

// ---------------------------------------------------------------------------
// Normalize snake_case → camelCase and fill defaults
// ---------------------------------------------------------------------------
function normalizeRecipe(raw: RawRecipe): ParsedRecipe {
  return {
    title: raw.title || 'Untitled Recipe',
    description: raw.description || '',
    servings: Number(raw.servings) || 1,
    prepTime: Number(raw.prep_time ?? raw.prepTime) || 0,
    cookTime: Number(raw.cook_time ?? raw.cookTime) || 0,
    ingredients: (raw.ingredients || []).map((ing) => ({
      name: ing.name || '',
      quantity: String(ing.quantity || ''),
      unit: ing.unit || '',
    })),
    steps: raw.steps || raw.instructions || [],
    tags: raw.tags || [],
    category: raw.category || 'dinner',
  };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT auth
    const { user, error: authError } = await verifyAuth(req);
    if (authError) return authError;
    console.log('[parse-image-recipe] user:', user?.id);

    // 2. Check GEMINI_API_KEY is configured
    if (!GEMINI_API_KEY) {
      return jsonError('Gemini API not configured (missing GEMINI_API_KEY secret)', 503);
    }

    // 3. Parse request body
    let body: { image?: string };
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const { image } = body;
    if (!image || typeof image !== 'string' || image.trim() === '') {
      return jsonError('Missing required field: image (base64-encoded string)', 400);
    }

    let base64Data: string;
    try {
      base64Data = normalizeBase64Payload(image, MAX_IMAGE_BASE64_BYTES, 'image');
    } catch (validationErr) {
      const message = validationErr instanceof Error ? validationErr.message : 'Invalid image';
      return jsonError(message, 400);
    }

    // 4. Build Gemini request
    const parts: GeminiPart[] = [
      { text: RECIPE_EXTRACTION_PROMPT },
      { inline_data: { mime_type: 'image/jpeg', data: base64Data } },
    ];

    const geminiBody = {
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    };

    // 5. Call Gemini API
    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      console.error('[parse-image-recipe] Gemini error', geminiRes.status, errText.slice(0, 500));
      return jsonError(`Gemini API error (${geminiRes.status})`, 502);
    }

    const geminiJson = (await geminiRes.json()) as GeminiResponse;

    // 6. Handle Gemini-level errors
    if (geminiJson.error) {
      console.error('[parse-image-recipe] Gemini response error', geminiJson.error);
      return jsonError(`Gemini error: ${geminiJson.error.message}`, 502);
    }

    // 7. Extract text from response
    const candidate = geminiJson.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;

    if (!rawText) {
      console.error('[parse-image-recipe] No text in Gemini response', JSON.stringify(geminiJson));
      return jsonError('Gemini returned no content', 502);
    }

    // 8. Parse JSON from Gemini output
    let parsedRaw: RawRecipe;
    try {
      parsedRaw = JSON.parse(rawText) as RawRecipe;
    } catch (parseErr) {
      console.error('[parse-image-recipe] Failed to parse Gemini JSON', parseErr, rawText.slice(0, 500));
      return jsonError('Failed to parse recipe data from image', 422);
    }

    // 9. Handle "no recipe found" signal from model
    if (parsedRaw.error) {
      return jsonError(parsedRaw.error, 422);
    }

    // 10. Normalize and return
    const recipe = normalizeRecipe(parsedRaw);

    return new Response(JSON.stringify({ recipe }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[parse-image-recipe] unexpected error', err);
    return jsonError('Internal error', 500);
  }
});
