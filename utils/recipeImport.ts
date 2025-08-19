// Minimal client-side recipe import via scraping JSON-LD and Open Graph
// Note: For production, consider a server function to avoid CORS and site variability

export interface ImportedRecipe {
  name: string;
  description?: string;
  imageUrl?: string;
  ingredients: Array<{ name: string; quantity: number; unit: string; optional: boolean }>;
  steps: string[];
  tags: string[];
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  sourceUrl?: string;
}

// Score JSON-LD candidates by completeness
function scoreJsonLd(ld: RecipeJsonLd): number {
  let score = 0;
  if (ld.name) score += 2;
  if (ld.recipeIngredient && ld.recipeIngredient.length) score += Math.min(10, ld.recipeIngredient.length);
  const instrCount = Array.isArray(ld.recipeInstructions)
    ? ld.recipeInstructions.length
    : 0;
  score += Math.min(10, instrCount);
  if (ld.prepTime) score += 1;
  if (ld.cookTime) score += 1;
  if (ld.totalTime) score += 1;
  if (ld.recipeYield) score += 1;
  return score;
}

// Map JSON-LD Recipe to ImportedRecipe verbatim (no AI mutation)
function normalizeJsonLdRecipe(ld: RecipeJsonLd): ImportedRecipe {
  // Instructions normalization
  const instructions: string[] = [];
  const rawInstr = ld.recipeInstructions as any;
  if (Array.isArray(rawInstr)) {
    for (const step of rawInstr) {
      if (!step) continue;
      if (typeof step === 'string') {
        const s = step.trim();
        if (s) instructions.push(s);
        continue;
      }
      if (typeof step === 'object') {
        const text = (step.text ?? '').toString().trim();
        if (text) {
          instructions.push(text);
          continue;
        }
        const list = Array.isArray((step as any).itemListElement) ? (step as any).itemListElement : [];
        for (const li of list) {
          if (!li) continue;
          if (typeof li === 'string') {
            const t = li.trim();
            if (t) instructions.push(t);
          } else if (typeof li === 'object' && li.text) {
            const t = String(li.text).trim();
            if (t) instructions.push(t);
          }
        }
      }
    }
  }

  const ingredients = Array.isArray(ld.recipeIngredient) ? ld.recipeIngredient.map(normalizeIngredient) : [];
  const img = Array.isArray(ld.image) ? ld.image[0] : (ld.image as any);
  const keywordsArr = Array.isArray(ld.keywords)
    ? ld.keywords
    : (typeof ld.keywords === 'string' ? ld.keywords.split(',').map(s => s.trim()).filter(Boolean) : []);

  return {
    name: ld.name || 'Imported Recipe',
    description: ld.description || undefined,
    imageUrl: img ? String(img) : undefined,
    ingredients,
    steps: instructions,
    tags: keywordsArr,
    prepTime: parseISO8601DurationToMinutes(ld.prepTime),
    cookTime: parseISO8601DurationToMinutes(ld.cookTime),
    servings: ld.recipeYield ? parseInt(String(ld.recipeYield).replace(/\D/g, '') || '0', 10) || undefined : undefined,
  };
}

function parseISO8601DurationToMinutes(duration?: string): number | undefined {
  if (!duration) return undefined;
  // Simple PTxxM/PTxxHxxM parser
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const mins = parseInt(match[2] || '0', 10);
  return hours * 60 + mins;
}

function toNumberFromUnicodeFractions(s: string): number | null {
  const map: Record<string, number> = { '¼': 0.25, '½': 0.5, '¾': 0.75, '⅓': 1/3, '⅔': 2/3, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };
  if (map[s] != null) return map[s];
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) { const n = parseFloat(frac[1]); const d = parseFloat(frac[2]); return d ? n/d : null; }
  return null;
}

function parseMixedQuantity(tokens: string[]): { qty: number | null; used: number } {
  // handles: "1", "1/2", "1 1/2", and unicode like "½"
  if (!tokens.length) return { qty: null, used: 0 };
  const first = tokens[0];
  let qty = Number.isFinite(parseFloat(first)) ? parseFloat(first) : toNumberFromUnicodeFractions(first);
  let used = qty != null ? 1 : 0;
  if (qty != null && tokens[1]) {
    const f2 = toNumberFromUnicodeFractions(tokens[1]) ?? (tokens[1].includes('/') ? toNumberFromUnicodeFractions(tokens[1]) : null);
    if (f2 != null) { qty += f2; used = 2; }
  }
  return { qty: qty ?? null, used };
}

function normalizeIngredient(raw: string) {
  // More robust parser: quantity (mixed/unicode) + unit + name; tolerate descriptors
  let line = raw.replace(/\s+/g, ' ').trim();
  line = line.replace(/^[-•*]\s*/, '');
  line = line.replace(/^optional\s*[:\-]?\s*/i, '');
  // Keep descriptors; only detect optional flag without cutting text
  const isOptional = /\(\s*optional\s*\)/i.test(line) || /\boptional\b/i.test(line);
  const tokens = line.split(' ');
  const { qty, used } = parseMixedQuantity(tokens);
  const UNITS = ['tsp','teaspoon','teaspoons','tbsp','tablespoon','tablespoons','cup','cups','oz','ounce','ounces','g','gram','grams','kg','kilogram','kilograms','ml','milliliter','milliliters','l','liter','liters','clove','cloves','bunch','pinch','lb','pound','pounds'];
  let unit = 'pcs';
  let nameStart = 0;
  if (qty != null) {
    const u = (tokens[used] || '').toLowerCase();
    if (UNITS.includes(u)) { unit = u.replace(/s$/, ''); nameStart = used + 1; }
    else { unit = 'pcs'; nameStart = used; }
  } else {
    nameStart = 0;
  }
  const name = tokens.slice(nameStart).join(' ').trim();
  return { name: name || raw.trim(), quantity: qty ?? 1, unit, optional: isOptional };
}

// ------------------ Tokenization & Fidelity Helpers ------------------
function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s\/.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function containsAnyToken(haystack: string, tokenSet: Set<string>): boolean {
  const parts = tokenize(haystack);
  for (const p of parts) {
    if (tokenSet.has(p)) return true;
  }
  return false;
}

function enforceTokenFidelity(parsed: ImportedRecipe, sourceText: string): ImportedRecipe {
  const tokens = new Set(tokenize(sourceText));
  // Filter ingredients whose names share no tokens with source
  const filteredIngredients = (parsed.ingredients || []).filter(i => containsAnyToken(i.name || '', tokens));
  // Filter steps that share no tokens at all (keeps concise steps that mention actions/ingredients)
  const filteredSteps = (parsed.steps || []).filter(s => containsAnyToken(s, tokens));
  return {
    ...parsed,
    ingredients: filteredIngredients,
    steps: filteredSteps
  };
}

// AI fallback import from free-form text (copied recipe, transcript, etc.)
import { createChatCompletion, createChatCompletionDeterministic } from './aiClient';
import { buildPrompt } from './promptRegistry';
import { recordAbstain } from './importTelemetry';
import { extractJsonLdRecipes, RecipeJsonLd } from './urlContentExtractor';

export async function importRecipeFromText(text: string): Promise<ImportedRecipe> {
  const { system: sys } = buildPrompt('import.text', 'conservative');
  const user = text.slice(0, 8000);
  const raw = await createChatCompletionDeterministic([
    { role: 'system', content: sys },
    { role: 'user', content: user },
  ]);
  const jsonStr = raw.trim().replace(/^```json\s*|```$/g, '');
  const data = JSON.parse(jsonStr);
  if (data && data.abstain) {
    const reason = typeof data.reason === 'string' ? data.reason : 'abstain';
    try {
      recordAbstain({ source: 'text', reason, at: '' as any });
    } catch {}
    throw new Error(`ImportAbstain:text:${reason}`);
  }
  return normalizeImportedRecipe(data);
}

export async function importRecipeFromUrl(url: string): Promise<ImportedRecipe> {
  // Structured-data-first: fetch HTML and try JSON-LD verbatim
  let html = '';
  try {
    const res = await fetch(url);
    html = await res.text();
  } catch {}
  if (!html) {
    try {
      const readerUrl = `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`;
      const res = await fetch(readerUrl);
      html = await res.text();
    } catch {}
  }

  if (html) {
    try {
      const candidates = extractJsonLdRecipes(html);
      if (candidates && candidates.length) {
        // choose best candidate by completeness
        const scored = candidates
          .map((ld) => ({ ld, score: scoreJsonLd(ld) }))
          .sort((a, b) => b.score - a.score);
        const best = scored[0].ld;
        const mapped = normalizeJsonLdRecipe(best);
        // If JSON-LD provides both lists, ALWAYS return verbatim mapping without AI
        if (mapped.ingredients.length && mapped.steps.length) return mapped;
      }
    } catch (e) {
      console.warn('[RecipeImport] JSON-LD extraction failed, continue with extractor:', e);
    }
  }

  // Use the enhanced URL content extractor as secondary path
  try {
    const { extractUrlContent } = await import('./urlContentExtractor');
    const extracted = await extractUrlContent(url);

    if (extracted.rawText && extracted.rawText.length > 100) {
      try {
        let parsed = await importRecipeFromText(extracted.rawText);
        // Enforce token fidelity to prevent inventions when using AI fallback
        parsed = enforceTokenFidelity(parsed, extracted.rawText);
        return parsed;
      } catch (error) {
        console.warn('[RecipeImport] Enhanced extraction failed, using legacy method:', error);
      }
    }
  } catch (error) {
    console.warn('[RecipeImport] Enhanced URL extractor failed, using legacy method:', error);
  }

  // Fallback to legacy extraction method
  if (!html) {
    // As a last resort, let AI parse from URL text itself (may be less accurate)
    const ai = await importRecipeFromText(`URL: ${url}\nIf you know this site format, reconstruct the recipe.`);
    return enforceTokenFidelity(ai, `URL: ${url}`);
  }

  let doc: Document | null = null;
  try {
    doc = new DOMParser().parseFromString(html, 'text/html');
  } catch {}

  // Try JSON-LD @type Recipe (handle @graph and arrays)
  const ldScripts = doc ? Array.from(doc.querySelectorAll('script[type="application/ld+json"]')) : [];
  for (const script of ldScripts) {
    try {
      const root = JSON.parse(script.textContent || '{}');
      const pool: any[] = [];
      const pushCandidate = (obj: any) => { if (obj && typeof obj === 'object') pool.push(obj); };
      if (Array.isArray(root)) root.forEach(pushCandidate); else pushCandidate(root);
      // Flatten @graph entries
      const graph = pool.flatMap((n) => (Array.isArray(n['@graph']) ? n['@graph'] : []));
      const all = [...pool, ...graph];
      const isRecipeType = (t: any) => t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'));
      const recipeJson = all.find((j) => isRecipeType(j['@type']));
      if (recipeJson) {
        const ingredientsList: string[] = Array.isArray(recipeJson.recipeIngredient) ? recipeJson.recipeIngredient : [];
        // Handle HowToSection/HowToStep structures
        const rawInstr = recipeJson.recipeInstructions || [];
        const instructions: string[] = Array.isArray(rawInstr)
          ? rawInstr.flatMap((step: any) => {
              if (typeof step === 'string') return [step];
              if (Array.isArray(step)) return step.map((s) => (typeof s === 'string' ? s : s?.text).trim());
              if (step?.itemListElement && Array.isArray(step.itemListElement)) {
                return step.itemListElement.map((s: any) => (typeof s === 'string' ? s : s?.text)).filter(Boolean);
              }
              return step?.text ? [String(step.text)] : [];
            })
          : [];
        const result: ImportedRecipe = {
          name: recipeJson.name || 'Imported Recipe',
          description: recipeJson.description,
          imageUrl: (Array.isArray(recipeJson.image) ? recipeJson.image[0] : recipeJson.image) || undefined,
          ingredients: ingredientsList.map(normalizeIngredient),
          steps: instructions.filter(Boolean),
          tags: (recipeJson.keywords ? String(recipeJson.keywords).split(',').map((s: string) => s.trim()) : []),
          prepTime: parseISO8601DurationToMinutes(recipeJson.prepTime),
          cookTime: parseISO8601DurationToMinutes(recipeJson.cookTime),
          servings: recipeJson.recipeYield ? parseInt(String(recipeJson.recipeYield).replace(/\D/g, '') || '0', 10) : undefined,
        };
        if (result.ingredients.length && result.steps.length) return result;
        // If JSON-LD incomplete, try DOM fallbacks below before returning
        html = html; // no-op to keep scope
      }
    } catch {}
  }

  // Helper: find list under a heading (Ingredients / Directions / Steps / Method)
  function extractByHeading(root: Document, headingKeywords: string[]): string[] {
    const hs = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6')) as HTMLElement[];
    for (const h of hs) {
      const text = (h.innerText || h.textContent || '').trim().toLowerCase();
      if (!text) continue;
      if (headingKeywords.some((kw) => text.includes(kw))) {
        // Traverse next siblings until we hit a list or paragraph block
        let el: Element | null = h.nextElementSibling;
        const lines: string[] = [];
        while (el && !(el as HTMLElement).matches('h1,h2,h3,h4,h5,h6')) {
          if (el.matches('ul,ol')) {
            lines.push(...Array.from(el.querySelectorAll('li')).map((li) => (li as HTMLElement).innerText || li.textContent || ''));
            break;
          }
          if (el.matches('p,div')) {
            const t = (el as HTMLElement).innerText || el.textContent || '';
            // Split on line breaks/bullets
            const split = t.split(/\n|•|\r/).map((s) => s.trim()).filter(Boolean);
            if (split.length > 1) { lines.push(...split); break; }
          }
          el = el.nextElementSibling;
        }
        if (lines.length) return lines;
      }
    }
    return [];
  }

  // DOM selector fallbacks for common sites
  if (doc) {
    let ingTexts = Array.from(doc.querySelectorAll('[itemprop="recipeIngredient"], .ingredient, .ingredients li, li.ingredient, ul.ingredients li'))
      .map((el) => (el as HTMLElement).innerText || el.textContent || '')
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length > 1);
    if (!ingTexts.length) {
      ingTexts = extractByHeading(doc, ['ingredient']);
    }
    let stepTexts = Array.from(doc.querySelectorAll('[itemprop="recipeInstructions"] li, .instructions li, ol li, .method li'))
      .map((el) => (el as HTMLElement).innerText || el.textContent || '')
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter((t) => t && t.length > 3);
    if (!stepTexts.length) {
      stepTexts = extractByHeading(doc, ['instruction', 'direction', 'method', 'step']);
    }
    if (ingTexts.length || stepTexts.length) {
      return {
        name: doc.querySelector('h1')?.textContent?.trim() || doc.title || 'Imported Recipe',
        description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
        imageUrl: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined,
        ingredients: ingTexts.map(normalizeIngredient),
        steps: stepTexts,
        tags: [],
      };
    }
  }

  // Fallback: Open Graph
  const title = doc?.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc?.title || 'Imported Recipe';
  const description = doc?.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined;
  const image = doc?.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined;

  const basic = {
    name: title,
    description,
    imageUrl: image,
    ingredients: [] as any[],
    steps: [] as string[],
    tags: [] as string[],
  };

  // As a better fallback, strip text content and ask AI to parse it
  try {
    const text = (doc?.body?.textContent || '').slice(0, 20000) || html.slice(0, 20000);
    if (text) {
      // 1) Plain-text section extractor (no AI). Prefer exact site content.
      const sections = extractRecipeSectionsFromText(text);
      if (sections.ingredients.length >= 3 && sections.steps.length >= 3) {
        return {
          ...basic,
          name: basic.name,
          description: basic.description,
          imageUrl: basic.imageUrl,
          ingredients: sections.ingredients.map(normalizeIngredient),
          steps: sections.steps,
          tags: [],
        };
      }
      // 2) If still weak, use AI but DO NOT overwrite found lists; only fill gaps.
      let parsed = await importRecipeFromText(text);
      // Prevent invention: filter parsed with token fidelity
      parsed = enforceTokenFidelity(parsed, text);
      if (!parsed.ingredients?.length && sections.ingredients.length) parsed.ingredients = sections.ingredients.map(normalizeIngredient);
      if (!parsed.steps?.length && sections.steps.length) parsed.steps = sections.steps;
      return { ...basic, ...parsed, imageUrl: parsed.imageUrl || basic.imageUrl };
    }
  } catch {}

  return basic;
}

// Extract Ingredients and Steps sections from plain text content deterministically (no AI)
function extractRecipeSectionsFromText(text: string): { ingredients: string[]; steps: string[] } {
  const T = normalizeWhitespace(text);
  // Find headings
  const ingIdx = indexOfAny(T, [/\bingredients\b/i]);
  const stepsIdx = indexOfAny(T, [/\bsteps\b/i, /\bdirections\b/i, /\bmethod\b/i, /\binstructions\b/i]);
  const ingredients: string[] = [];
  const steps: string[] = [];
  if (ingIdx >= 0) {
    const end = stepsIdx > ingIdx ? stepsIdx : Math.min(T.length, ingIdx + 4000);
    const ingBlock = T.slice(ingIdx, end);
    // lines after heading
    const lines = ingBlock.split(/\n/).slice(1).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      // stop on next heading marker
      if (/^(yield|servings|steps|directions|method|instructions)\b/i.test(line)) break;
      if (/^[-•*\d]/.test(line) || /\d/.test(line)) ingredients.push(cleanBullet(line));
    }
  }
  if (stepsIdx >= 0) {
    const end = Math.min(T.length, stepsIdx + 6000);
    const stepBlock = T.slice(stepsIdx, end);
    const lines = stepBlock.split(/\n/).slice(1).map((l) => l.trim()).filter(Boolean);
    let expected = 1;
    for (const line of lines) {
      // hard stops before site footer/meta/links
      if (/^(yield|servings|ingredients|meal\s*type|category|food\s*group|season|nutrition|government|policies)\b/i.test(line)) break;
      if (/https?:\/\//i.test(line) || /^\[/.test(line) || /^\*/.test(line)) break;
      // numbered steps preferred
      const m = line.match(/^(\d+)[).]\s+(.*)$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > expected + 2) break; // jump means we likely left steps section
        expected = n + 1;
        steps.push(m[2]);
        continue;
      }
      // fallback: accept longer instruction-like lines, but stop on metadata-like `Label:`
      if (/^\w[\w\s]+:\s+/.test(line)) break;
      if (line.length > 12) steps.push(line);
    }
  }
  return { ingredients, steps };
}

function normalizeWhitespace(s: string) { return s.replace(/\r/g, '').replace(/\u00A0/g, ' ').replace(/[\t ]+/g, ' ').replace(/\s*\n\s*/g, '\n'); }
function indexOfAny(hay: string, pats: RegExp[]): number { for (const p of pats) { const m = hay.search(p); if (m >= 0) return m; } return -1; }
function cleanBullet(s: string): string { return s.replace(/^[-•*]\s*/, '').trim(); }

function normalizeImportedRecipe(data: any): ImportedRecipe {
  const ing = Array.isArray(data.ingredients) ? data.ingredients.map((i: any) => ({
    name: String(i.name || '').trim() || 'Ingredient',
    quantity: Number(i.quantity) > 0 ? Number(i.quantity) : 1,
    unit: String(i.unit || 'pcs'),
    optional: Boolean(i.optional),
  })) : [];
  const steps = Array.isArray(data.steps) ? data.steps.map((s: any) => String(s)).filter(Boolean) : [];
  const tags = Array.isArray(data.tags) ? data.tags.map((t: any) => String(t)) : [];
  return {
    name: String(data.name || 'Imported Recipe'),
    description: data.description ? String(data.description) : undefined,
    imageUrl: data.imageUrl ? String(data.imageUrl) : undefined,
    ingredients: ing,
    steps,
    tags,
    prepTime: typeof data.prepTime === 'number' ? data.prepTime : undefined,
    cookTime: typeof data.cookTime === 'number' ? data.cookTime : undefined,
    servings: typeof data.servings === 'number' ? data.servings : undefined,
  };
}


// Import from image via enhanced OCR processing + Vision model fallback
export async function importRecipeFromImage(imageDataUrl: string): Promise<ImportedRecipe> {
  try {
    // Try OCR extraction first (faster and more reliable for text-heavy images)
    const { processImageOcr, validateOcrResult } = await import('./imageOcrProcessor');
    
    try {
      const ocrResult = await processImageOcr(imageDataUrl, {
        preprocessImage: true,
        provider: 'auto',
        fallbackProviders: true
      });
      
      const validation = validateOcrResult(ocrResult);
      
      // If OCR extracted good text, use it
      if (validation.isValid && ocrResult.text.length > 50) {
        console.log('[RecipeImport] Using OCR extraction for image');
        const recipe = await importRecipeFromText(ocrResult.text);
        return recipe;
      } else if (ocrResult.text.length > 20) {
        // Even if validation failed, try parsing if we got some text
        console.log('[RecipeImport] Using OCR extraction with low confidence');
        try {
          const recipe = await importRecipeFromText(ocrResult.text);
          return recipe;
        } catch (error) {
          console.warn('[RecipeImport] OCR text parsing failed, falling back to vision model:', error);
        }
      }
    } catch (error) {
      console.warn('[RecipeImport] OCR processing failed, falling back to vision model:', error);
    }
  } catch (error) {
    console.warn('[RecipeImport] OCR processor not available, using vision model:', error);
  }

  // Fallback to vision model for complex images or when OCR fails
  console.log('[RecipeImport] Using vision model for image processing');
  
  const AI_API_BASE = process.env.EXPO_PUBLIC_AI_API_BASE || 'https://openrouter.ai/api/v1';
  const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;
  const AI_PROXY_BASE = process.env.EXPO_PUBLIC_AI_PROXY_BASE; // Optional proxy
  const VISION_MODEL = process.env.EXPO_PUBLIC_AI_VISION_MODEL || 'qwen/qwen2.5-vl-72b-instruct:free';

  const base = AI_PROXY_BASE || AI_API_BASE;
  const url = `${base.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!AI_PROXY_BASE && AI_API_KEY) {
    headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    headers['HTTP-Referer'] = 'https://nutriai.app';
    headers['X-Title'] = 'NutriAI';
  }

  const { system } = buildPrompt('import.image', 'conservative');

  const body = {
    model: VISION_MODEL,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: [
        { type: 'text', text: 'Extract the full recipe from this image as strict JSON.' },
        { type: 'image_url', image_url: { url: imageDataUrl } },
      ]}
    ],
    temperature: 0,
  } as const;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Vision recipe import failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('Vision response missing content');
  const match = content.match(/\{[\s\S]*\}/);
  const toParse = match ? match[0] : content;
  const data = JSON.parse(toParse);
  if (data && data.abstain) {
    const reason = typeof data.reason === 'string' ? data.reason : 'abstain';
    try {
      recordAbstain({ source: 'image', reason, at: '' as any });
    } catch {}
    throw new Error(`ImportAbstain:image:${reason}`);
  }
  return normalizeImportedRecipe(data);
}
