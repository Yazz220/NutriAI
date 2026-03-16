/**
 * Vision AI Client
 *
 * Provides multiple AI-powered image analysis capabilities:
 * 1. Food nutrition scanning (Food-101-93M + USDA nutrition data) via Edge Function
 * 2. Inventory item extraction (receipt/fridge scanning) via ai-chat Edge Function
 * 3. Food label detection (FatSecret Edge Function fallback)
 *
 * All AI calls route through Supabase Edge Functions — no provider keys in the client.
 */

import { createVisionChatCompletion, type ChatMessage } from '@/utils/aiClient';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const FATSECRET_IMAGE_URL =
  process.env.EXPO_PUBLIC_FATSECRET_IMAGE_URL ||
  (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/fatsecret-image` : undefined);
const AI_NUTRITION_SCAN_URL = SUPABASE_URL
  ? `${SUPABASE_URL}/functions/v1/ai-nutrition-scan`
  : undefined;

const defaultPrompt = [
  'Extract a list of grocery items you can identify in this image. If it is a receipt, read line items; if it is a table/fridge, identify visible items.',
  'Return ONLY JSON of the form: {"items": [{"name":"tomatoes","quantity":3,"unit":"pcs","category":"Produce"}, ...]}',
  'Avoid duplicates; group same items with summed quantity when obvious.',
].join('\n');

export type DetectedItem = {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
};

// ---------------------------------------------------------------------------
// Inventory item detection (via ai-chat Edge Function with vision model)
// ---------------------------------------------------------------------------

export async function detectItemsFromImage(params: {
  imageDataUrl: string;
  prompt?: string;
  maxRetries?: number;
}): Promise<DetectedItem[]> {
  const { imageDataUrl, prompt = defaultPrompt } = params;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        'You extract grocery/inventory items from a user-provided image (receipt, fridge table, pantry).',
        'Output ONLY compact JSON with an array named "items". No extra text.',
        'Each item: { name, quantity (number if obvious), unit (e.g., pcs, kg, g, ml, L, can, bottle, bunch, cup), category (Produce, Dairy, Meat, Seafood, Frozen, Pantry, Bakery, Beverages, Other) }.',
        'Guess reasonable category; omit fields you cannot infer. Keep names simple (e.g., "tomatoes", "milk").',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    },
  ];

  const content = await createVisionChatCompletion(messages);
  return safeParseItems(content);
}

// ---------------------------------------------------------------------------
// Food label detection (FatSecret → VLM fallback)
// ---------------------------------------------------------------------------

async function imageUriToBase64(imageUri: string): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function supabaseHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (SUPABASE_ANON_KEY) {
    headers['apikey'] = SUPABASE_ANON_KEY;
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }
  return headers;
}

export async function analyzeFoodImageToLabel(imageUri: string): Promise<string | null> {
  let base64: string | null = null;
  try {
    base64 = await imageUriToBase64(imageUri);
  } catch (e) {
    console.warn('[visionClient] imageUriToBase64 failed', e);
  }

  // Try FatSecret image recognition first
  if (FATSECRET_IMAGE_URL && base64) {
    try {
      const res = await fetch(FATSECRET_IMAGE_URL, {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify({
          image_b64: base64,
          region: 'US',
          language: 'en',
          include_food_data: true,
        }),
      });
      if (res.ok) {
        const json: any = await res.json();
        const candidates: any[] = [];
        if (Array.isArray(json?.foods?.food)) candidates.push(...json.foods.food);
        if (json?.food) candidates.push(json.food);
        const first = candidates.find(Boolean);
        if (first) {
          const label = String(
            first.food_name || first.name || first.label || first.title || '',
          ).trim();
          if (label) return label;
        }
        if (typeof json?.predicted_food === 'string' && json.predicted_food.trim()) {
          return json.predicted_food.trim();
        }
      } else {
        const txt = await res.text();
        console.warn('[visionClient] fatsecret-image error', res.status, txt.slice(0, 200));
      }
    } catch (e) {
      console.warn('[visionClient] fatsecret-image call failed', e);
    }
  }

  // Fallback: VLM via ai-chat Edge Function
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && base64) {
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      const items = await detectItemsFromImage({
        imageDataUrl: dataUrl,
        maxRetries: 1,
        prompt: defaultPrompt,
      });
      if (items?.length && items[0].name) return items[0].name;
    }
  } catch (e) {
    console.warn('[visionClient] VLM fallback failed', e);
  }

  return null;
}

// ---------------------------------------------------------------------------
// AI Nutrition Scan (Food-101-93M + USDA via Edge Function)
// ---------------------------------------------------------------------------

export interface AINutritionResult {
  items: Array<{
    label: string;
    score: number;
    canonical_label: string;
  }>;
  totals: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    portion_text: string;
    grams_total: number;
  };
  model_version: string;
  mapping_version: string;
  cached: boolean;
}

export async function analyzeFoodImageForNutrition(
  imageUri: string,
): Promise<AINutritionResult | null> {
  if (!AI_NUTRITION_SCAN_URL) {
    console.warn('[visionClient] AI nutrition scan endpoint not configured');
    return null;
  }

  try {
    const base64 = await imageUriToBase64(imageUri);
    if (!base64) {
      console.warn('[visionClient] Failed to read image as base64');
      return null;
    }

    const response = await fetch(AI_NUTRITION_SCAN_URL, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ image_b64: base64 }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[visionClient] AI scan failed:', response.status, errorText.slice(0, 200));
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[visionClient] AI nutrition scan error:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeParseItems(text: string): DetectedItem[] {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const toParse = match ? match[0] : text;
    const parsed = JSON.parse(toParse);
    const arr = Array.isArray(parsed?.items) ? parsed.items : [];
    return arr
      .map((x: any) => ({
        name: String(x?.name || '').trim(),
        quantity: typeof x?.quantity === 'number' ? x.quantity : undefined,
        unit: x?.unit ? String(x.unit) : undefined,
        category: x?.category ? String(x.category) : undefined,
      }))
      .filter((x: DetectedItem) => x.name.length > 0);
  } catch {
    return text
      .split(/\n|,|\u2022|-/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
}
