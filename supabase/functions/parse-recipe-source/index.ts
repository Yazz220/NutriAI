import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { verifyAuth } from '../_shared/auth.ts';
import { corsResponse, jsonError, jsonResponse } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const MAX_URL_BYTES = 1_000_000;
const MAX_IMAGE_BASE64_BYTES = 8_000_000;
const FETCH_TIMEOUT_MS = 10_000;
const ALLOWED_URL_HOST_SUFFIXES = [
  'allrecipes.com',
  'bonappetit.com',
  'delish.com',
  'eatingwell.com',
  'epicurious.com',
  'food.com',
  'food52.com',
  'foodnetwork.com',
  'kingarthurbaking.com',
  'nytimes.com',
  'recipetineats.com',
  'sallysbakingaddiction.com',
  'seriouseats.com',
  'simplyrecipes.com',
  'spendwithpennies.com',
  'tasteofhome.com',
  'thekitchn.com',
];

type SourceType = 'url' | 'text' | 'image';

interface RequestBody {
  type: SourceType;
  input?: string;
  imageBase64?: string;
}

interface ParsedRecipe {
  title: string;
  description?: string;
  servings: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: unknown[];
  steps: unknown[];
  sourceType: SourceType;
  sourceUrl?: string;
  tags?: unknown[];
  category?: string;
}

function basicTextRecipe(input: string, sourceType: SourceType, sourceUrl?: string): ParsedRecipe {
  const lines = input.split('\n').map((line) => line.trim()).filter(Boolean);
  const title = lines[0] || 'Imported Recipe';
  const ingredients = lines
    .filter((line) => /^[-*]?\s*\d|cup|tbsp|tsp|gram|g |oz|egg|salt|flour/i.test(line))
    .slice(0, 20)
    .map((line) => ({ name: line.replace(/^[-*]\s*/, '') }));
  const steps = lines
    .filter((line) => /bake|cook|mix|stir|boil|chop|serve|heat|add/i.test(line))
    .slice(0, 12);

  return {
    title,
    ingredients,
    steps,
    servings: 4,
    sourceType,
    sourceUrl,
  };
}

function confidenceFor(recipe: { title: string; ingredients: unknown[]; steps: unknown[] }) {
  const reasons: string[] = [];
  let confidence = 0.2;
  if (recipe.title) confidence += 0.2;
  if (recipe.ingredients.length >= 3) confidence += 0.3;
  else reasons.push('Too few ingredients');
  if (recipe.steps.length >= 2) confidence += 0.3;
  else reasons.push('Missing directions');
  confidence = Math.min(1, Math.round(confidence * 100) / 100);
  return { confidence, needsReview: confidence < 0.75, reasons };
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized.includes(':')) return true;

  const parts = normalized.split('.').map((part) => Number(part));
  if (parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    return true;
  }

  return false;
}

function isBlockedIpAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

  const ipv4 = normalized.split('.').map((part) => Number(part));
  if (ipv4.length === 4 && ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    const [a, b] = ipv4;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true;
    return false;
  }

  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  if (normalized.startsWith('ff')) return true;
  if (normalized.startsWith('::ffff:')) {
    return isBlockedIpAddress(normalized.replace('::ffff:', ''));
  }
  return false;
}

async function assertPublicDnsHostname(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) {
    throw new Error('This URL cannot be imported');
  }

  const [aRecords, aaaaRecords] = await Promise.all([
    Deno.resolveDns(hostname, 'A').catch(() => [] as string[]),
    Deno.resolveDns(hostname, 'AAAA').catch(() => [] as string[]),
  ]);

  const addresses = [...aRecords, ...aaaaRecords];
  if (addresses.length === 0) {
    throw new Error('Could not resolve URL host');
  }

  if (addresses.some(isBlockedIpAddress)) {
    throw new Error('This URL cannot be imported');
  }
}

function validatePublicHttpUrl(value: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('Invalid URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported');
  }
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error('This URL cannot be imported');
  }
  const hostname = parsed.hostname.toLowerCase();
  const isAllowedHost = ALLOWED_URL_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
  if (!isAllowedHost) {
    throw new Error('This recipe site is not supported yet. Paste the recipe text or send a screenshot instead.');
  }
  return parsed;
}

async function textFromUrl(url: string): Promise<string> {
  const parsedUrl = validatePublicHttpUrl(url);
  await assertPublicDnsHostname(parsedUrl.hostname);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(parsedUrl.toString(), {
      redirect: 'manual',
      signal: controller.signal,
      headers: { accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8' },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error('URL redirect missing location');
      const redirected = new URL(location, parsedUrl);
      validatePublicHttpUrl(redirected.toString());
      return textFromUrl(redirected.toString());
    }

    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_URL_BYTES) {
      throw new Error('URL response is too large');
    }

    if (!res.ok) throw new Error(`URL fetch failed (${res.status})`);

    const limited = await readLimitedText(res, MAX_URL_BYTES);
    return limited
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function readLimitedText(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const text = await res.text();
    if (text.length > maxBytes) throw new Error('URL response is too large');
    return text;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('URL response is too large');
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function normalizeImageBase64(value: string): string {
  const base64 = value.includes(',') ? value.split(',').pop() ?? '' : value;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(base64)) {
    throw new Error('Invalid imageBase64');
  }
  const compact = base64.replace(/\s/g, '');
  const estimatedBytes = Math.ceil((compact.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_BASE64_BYTES) {
    throw new Error('Image is too large');
  }
  return compact;
}

async function parseImageRecipe(req: Request, imageBase64: string): Promise<ParsedRecipe> {
  const res = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/parse-image-recipe`, {
    method: 'POST',
    headers: {
      authorization: req.headers.get('authorization') ?? '',
      apikey: req.headers.get('apikey') ?? '',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ image: imageBase64 }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Image parser failed (${res.status})`);
  }

  const recipe = data.recipe ?? {};
  return {
    title: recipe.title ?? 'Imported Recipe',
    description: recipe.description ?? '',
    servings: Number(recipe.servings) || 4,
    prepTime: Number(recipe.prepTime) || 0,
    cookTime: Number(recipe.cookTime) || 0,
    ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
    steps: Array.isArray(recipe.steps) ? recipe.steps : [],
    sourceType: 'image',
    tags: Array.isArray(recipe.tags) ? recipe.tags : [],
    category: recipe.category ?? 'favorites',
  };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse(req);

  const { error: authError } = await verifyAuth(req);
  if (authError) return authError;

  try {
    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return jsonError('Invalid JSON body', 400, req);
    }

    if (!body.type) return jsonError('Missing source type', 400, req);
    if (body.type !== 'url' && body.type !== 'text' && body.type !== 'image') {
      return jsonError('Unsupported source type', 400, req);
    }

    if (body.type === 'image') {
      if (!body.imageBase64) return jsonError('Missing imageBase64', 400, req);
      const parsed = await parseImageRecipe(req, normalizeImageBase64(body.imageBase64));
      const confidence = confidenceFor(parsed);
      return jsonResponse({ recipe: parsed, ...confidence }, 200, req);
    }

    if (!body.input?.trim()) return jsonError('Missing input', 400, req);

    const sourceText = body.type === 'url' ? await textFromUrl(body.input) : body.input;
    const parsed = basicTextRecipe(sourceText, body.type, body.type === 'url' ? body.input : undefined);
    const confidence = confidenceFor(parsed);

    return jsonResponse({
      recipe: {
        ...parsed,
        sourceType: body.type,
        tags: [],
        category: 'favorites',
      },
      ...confidence,
    }, 200, req);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Parse failed', 500, req);
  }
});
