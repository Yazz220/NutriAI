/**
 * parse-video-recipe Edge Function
 *
 * Accepts a video URL (YouTube, TikTok, Instagram Reel, or other direct
 * video links) and uses Google Gemini 2.5 Flash to extract a structured
 * recipe from both narration and on-screen text overlays.
 *
 * Required Supabase Function secret:
 *   GEMINI_API_KEY – Google AI Studio API key
 *
 * Request body:
 *   { url: string }   // public video URL
 *
 * Response body (success):
 *   { recipe: ParsedRecipe }
 *
 * Strategy:
 *   1. YouTube URLs → pass directly via file_data (Gemini supports natively)
 *      Fallback: download bytes + upload to Files API
 *   2. TikTok / Instagram / other → fetch bytes + upload to Files API
 *      Fallback: text-only reasoning from URL context
 *   3. All-else failure → descriptive user-facing error
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
const GEMINI_GENERATE_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_FILES_UPLOAD_URL =
  `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_API_KEY}`;

// Max video bytes to download for non-YouTube sources (50 MB)
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

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

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// Recipe extraction prompt
// ---------------------------------------------------------------------------
const VIDEO_RECIPE_PROMPT = `Watch this cooking video carefully.
Read ALL text shown on screen (ingredients, measurements, steps, titles, captions, overlays).
Listen to ALL narration and spoken instructions.
Extract the complete recipe.

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
  "category": "dinner",
  "source_url": ""
}

Rules:
- "servings" must be a number (integer)
- "prep_time" and "cook_time" are in minutes (integers); use 0 if not specified
- "quantity" should be a string (e.g. "1", "1/2", "2-3")
- "unit" can be empty string if not applicable (e.g. for "2 eggs")
- "category" must be exactly one of: breakfast, lunch, dinner, snacks, appetizers, desserts, drinks, sides
- "tags" should be 2-5 relevant tags (cuisine type, dietary info, cooking method, etc.)
- If a field cannot be determined from the video, use sensible defaults
- If this is not a cooking/recipe video, return { "error": "No recipe found in video" }`;

const TEXT_FALLBACK_PROMPT = (url: string) =>
  `A user shared this video URL: ${url}

The video could not be downloaded directly. Based solely on the URL, platform, and any contextual clues you have, try to identify or infer what recipe might be in this video.

If you can make a reasonable guess, return a JSON recipe object:
{
  "title": "Recipe name",
  "description": "Brief description",
  "servings": 4,
  "prep_time": 0,
  "cook_time": 0,
  "ingredients": [],
  "steps": [],
  "tags": [],
  "category": "dinner",
  "source_url": "${url}"
}

If you cannot determine a recipe from the URL alone, return: { "error": "Could not identify recipe from URL" }

Return ONLY valid JSON.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface GeminiFilePart {
  file_data: { mime_type: string; file_uri: string };
}
interface GeminiTextPart {
  text: string;
}
type GeminiPart = GeminiFilePart | GeminiTextPart;

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { message: string; code: number };
}

interface GeminiUploadResponse {
  file?: { uri: string; mimeType: string; name: string };
  error?: { message: string };
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
  source_url?: string;
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
  sourceUrl: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isYouTubeUrl(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

function normalizeRecipe(raw: RawRecipe, fallbackSourceUrl = ''): ParsedRecipe {
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
    sourceUrl: raw.source_url || fallbackSourceUrl,
  };
}

// ---------------------------------------------------------------------------
// Gemini call helpers
// ---------------------------------------------------------------------------

/** Call generateContent with an arbitrary parts array. */
async function callGemini(parts: GeminiPart[]): Promise<GeminiResponse> {
  const res = await fetch(GEMINI_GENERATE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[parse-video-recipe] Gemini HTTP error', res.status, errText.slice(0, 500));
    throw new Error(`Gemini HTTP ${res.status}`);
  }

  return res.json() as Promise<GeminiResponse>;
}

/** Extract text from a Gemini response, or throw if missing. */
function extractText(geminiJson: GeminiResponse): string {
  if (geminiJson.error) throw new Error(`Gemini: ${geminiJson.error.message}`);
  const text = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini returned no content');
  return text;
}

/** Parse raw JSON text into RawRecipe; throw on failure. */
function parseRecipeJson(raw: string): RawRecipe {
  try {
    return JSON.parse(raw) as RawRecipe;
  } catch (e) {
    console.error('[parse-video-recipe] JSON parse error', e, raw.slice(0, 500));
    throw new Error('Failed to parse recipe JSON from Gemini');
  }
}

// ---------------------------------------------------------------------------
// Strategy A: YouTube native (file_data with YouTube URI)
// ---------------------------------------------------------------------------
async function extractViaYouTubeNative(url: string): Promise<RawRecipe> {
  console.log('[parse-video-recipe] Strategy: YouTube native file_data');
  const parts: GeminiPart[] = [
    { file_data: { mime_type: 'video/mp4', file_uri: url } },
    { text: VIDEO_RECIPE_PROMPT },
  ];
  const geminiJson = await callGemini(parts);
  return parseRecipeJson(extractText(geminiJson));
}

// ---------------------------------------------------------------------------
// Strategy B: Download video bytes → upload to Files API → generateContent
// ---------------------------------------------------------------------------
async function uploadToGeminiFilesApi(
  videoBytes: Uint8Array,
  mimeType: string,
): Promise<string> {
  console.log(
    '[parse-video-recipe] Uploading',
    videoBytes.byteLength,
    'bytes to Gemini Files API',
  );

  const res = await fetch(GEMINI_FILES_UPLOAD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': mimeType,
      'X-Goog-Upload-Command': 'upload, finalize',
      'X-Goog-Upload-Header-Content-Length': String(videoBytes.byteLength),
      'X-Goog-Upload-Header-Content-Type': mimeType,
    },
    body: videoBytes,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    console.error('[parse-video-recipe] Files API upload error', res.status, errText.slice(0, 300));
    throw new Error(`Files API upload failed (${res.status})`);
  }

  const uploadJson = (await res.json()) as GeminiUploadResponse;
  if (uploadJson.error || !uploadJson.file?.uri) {
    throw new Error(uploadJson.error?.message || 'Files API returned no URI');
  }

  console.log('[parse-video-recipe] Uploaded file URI:', uploadJson.file.uri);
  return uploadJson.file.uri;
}

async function extractViaDownloadAndUpload(url: string): Promise<RawRecipe> {
  console.log('[parse-video-recipe] Strategy: download + Files API upload, url:', url);

  // Fetch video with a modest timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let videoRes: Response;
  try {
    videoRes = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; RecipeBot/1.0; +https://nutriai.app)',
      },
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!videoRes.ok) {
    throw new Error(`Video fetch failed (${videoRes.status})`);
  }

  const contentType =
    videoRes.headers.get('content-type') || 'video/mp4';
  const mimeType = contentType.split(';')[0].trim();

  // Stream up to MAX_VIDEO_BYTES
  const reader = videoRes.body?.getReader();
  if (!reader) throw new Error('No response body');

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      totalBytes += value.byteLength;
      if (totalBytes > MAX_VIDEO_BYTES) {
        reader.cancel();
        throw new Error(`Video exceeds ${MAX_VIDEO_BYTES / 1024 / 1024} MB limit`);
      }
      chunks.push(value);
    }
  }

  // Combine chunks
  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  const fileUri = await uploadToGeminiFilesApi(combined, mimeType);

  const parts: GeminiPart[] = [
    { file_data: { mime_type: mimeType, file_uri: fileUri } },
    { text: VIDEO_RECIPE_PROMPT },
  ];
  const geminiJson = await callGemini(parts);
  return parseRecipeJson(extractText(geminiJson));
}

// ---------------------------------------------------------------------------
// Strategy C: Text-only fallback (URL reasoning)
// ---------------------------------------------------------------------------
async function extractViaTextFallback(url: string): Promise<RawRecipe> {
  console.log('[parse-video-recipe] Strategy: text-only URL fallback');
  const parts: GeminiPart[] = [{ text: TEXT_FALLBACK_PROMPT(url) }];
  const geminiJson = await callGemini(parts);
  return parseRecipeJson(extractText(geminiJson));
}

// ---------------------------------------------------------------------------
// Main handler
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
    console.log('[parse-video-recipe] user:', user?.id);

    // 2. Check GEMINI_API_KEY
    if (!GEMINI_API_KEY) {
      return jsonError('Gemini API not configured (missing GEMINI_API_KEY secret)', 503);
    }

    // 3. Parse body
    let body: { url?: string };
    try {
      body = await req.json();
    } catch {
      return jsonError('Invalid JSON body', 400);
    }

    const { url } = body;
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return jsonError('Missing required field: url', 400);
    }

    const videoUrl = url.trim();
    console.log('[parse-video-recipe] processing url:', videoUrl);

    // 4. Attempt extraction with fallback chain
    let rawRecipe: RawRecipe | null = null;
    let lastError: string = '';

    if (isYouTubeUrl(videoUrl)) {
      // --- YouTube path ---
      try {
        rawRecipe = await extractViaYouTubeNative(videoUrl);
      } catch (e) {
        lastError = String(e);
        console.warn('[parse-video-recipe] YouTube native failed, trying download:', lastError);
        try {
          rawRecipe = await extractViaDownloadAndUpload(videoUrl);
        } catch (e2) {
          lastError = String(e2);
          console.warn('[parse-video-recipe] YouTube download failed:', lastError);
        }
      }
    } else {
      // --- TikTok / Instagram / other ---
      try {
        rawRecipe = await extractViaDownloadAndUpload(videoUrl);
      } catch (e) {
        lastError = String(e);
        console.warn('[parse-video-recipe] Download failed, trying text fallback:', lastError);
      }
    }

    // Text-only fallback (applies to all platforms when video access failed)
    if (!rawRecipe) {
      try {
        rawRecipe = await extractViaTextFallback(videoUrl);
      } catch (e) {
        lastError = String(e);
        console.warn('[parse-video-recipe] Text fallback failed:', lastError);
      }
    }

    // 5. Final failure
    if (!rawRecipe) {
      return jsonError(
        'Could not access video. Try pasting the recipe as text or sending a screenshot instead.',
        422,
      );
    }

    // 6. Handle model-signalled "no recipe"
    if (rawRecipe.error) {
      return jsonError(rawRecipe.error, 422);
    }

    // 7. Normalize and return
    const recipe = normalizeRecipe(rawRecipe, videoUrl);

    return jsonOk({ recipe });
  } catch (err) {
    console.error('[parse-video-recipe] unexpected error', err);
    return jsonError('Internal error', 500);
  }
});
