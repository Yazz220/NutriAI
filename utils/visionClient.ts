// Vision AI client for extracting inventory items from images via OpenRouter
// Uses OpenAI-compatible /chat/completions with image input.
// For local images, pass a base64 data URL to avoid hosting.
import { APP_NAME, APP_WEBSITE } from '@/constants/brand';
import * as FileSystem from 'expo-file-system';

const AI_API_BASE = process.env.EXPO_PUBLIC_AI_API_BASE || 'https://openrouter.ai/api/v1';
const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;
const AI_PROXY_BASE = process.env.EXPO_PUBLIC_AI_PROXY_BASE; // Optional proxy
const VISION_MODEL = process.env.EXPO_PUBLIC_AI_VISION_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const FATSECRET_IMAGE_URL = process.env.EXPO_PUBLIC_FATSECRET_IMAGE_URL || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/fatsecret-image` : undefined);

// Prompt used by the generic VLM fallback
const defaultPrompt = [
  'Extract a list of grocery items you can identify in this image. If it is a receipt, read line items; if it is a table/fridge, identify visible items.',
  'Return ONLY JSON of the form: {"items": [{"name":"tomatoes","quantity":3,"unit":"pcs","category":"Produce"}, ...]}',
  'Avoid duplicates; group same items with summed quantity when obvious.'
].join('\n');

export type DetectedItem = {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
};

export async function detectItemsFromImage(params: {
  imageDataUrl: string; // data:image/<type>;base64,<...>
  prompt?: string;
  maxRetries?: number;
}): Promise<DetectedItem[]> {
  const { imageDataUrl, prompt = defaultPrompt, maxRetries = 1 } = params;
  const base = AI_PROXY_BASE || AI_API_BASE;
  const url = `${base.replace(/\/$/, '')}/chat/completions`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!AI_PROXY_BASE && AI_API_KEY) {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    headers['HTTP-Referer'] = APP_WEBSITE;
    headers['X-Title'] = APP_NAME;
  }

  const messages = [
    {
      role: 'system' as const,
      content: [
        'You extract grocery/inventory items from a user-provided image (receipt, fridge table, pantry).',
        'Output ONLY compact JSON with an array named "items". No extra text.',
        'Each item: { name, quantity (number if obvious), unit (e.g., pcs, kg, g, ml, L, can, bottle, bunch, cup), category (Produce, Dairy, Meat, Seafood, Frozen, Pantry, Bakery, Beverages, Other) }.',
        'Guess reasonable category; omit fields you cannot infer. Keep names simple (e.g., "tomatoes", "milk").'
      ].join('\n'),
    },
    {
      role: 'user' as const,
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ],
    },
  ];

  const body = {
    model: VISION_MODEL,
    messages,
    temperature: 0.2,
  } as const;

  let lastErr: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Vision request failed (${res.status}): ${text}`);
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Vision response missing content');
      return safeParseItems(content);
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries) break;
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
// Analyze a local image and return a best-guess food label.
export async function analyzeFoodImageToLabel(imageUri: string): Promise<string | null> {
  let base64: string | null = null;
  try {
    base64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' as any });
  } catch (e) {
    console.warn('[visionClient] readAsStringAsync failed', e);
  }

  if (FATSECRET_IMAGE_URL && base64) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (SUPABASE_ANON_KEY) {
        headers['apikey'] = SUPABASE_ANON_KEY;
        headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
      }
      const res = await fetch(FATSECRET_IMAGE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ image_b64: base64, region: 'US', language: 'en', include_food_data: true }),
      });
      if (res.ok) {
        const json: any = await res.json();
        const candidates: any[] = [];
        if (Array.isArray(json?.foods?.food)) candidates.push(...json.foods.food);
        if (json?.food) candidates.push(json.food);
        const first = candidates.find(Boolean);
        if (first) {
          const label = String(first.food_name || first.name || first.label || first.title || '').trim();
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

  try {
    if (AI_PROXY_BASE || AI_API_KEY) {
      const dataUrl = `data:image/jpeg;base64,${base64 ?? ''}`;
      const items = await detectItemsFromImage({ imageDataUrl: dataUrl, maxRetries: 1, prompt: defaultPrompt });
      if (items?.length && items[0].name) return items[0].name;
    }
  } catch (e) {
    console.warn('[visionClient] VLM fallback failed', e);
  }

  return null;
}

function safeParseItems(text: string): DetectedItem[] {
  try {
    // Attempt to find JSON block
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
    // Fallback: attempt to split lines as names only
    return text
      .split(/\n|,|\u2022|-/)
      .map(s => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  }
}
