import { importRecipeFromUrl, importRecipeFromText, importRecipeFromImage } from './recipeImport';
import { extractJsonLdRecipes } from './urlContentExtractor';
import { transcribeFromUrl, transcribeFromUri } from './sttClient';
import { createChatCompletion, createChatCompletionDeterministic } from './aiClient';
import { detectInputType, validateInput, getPlatformHints } from './inputDetection';
import { getImportKnobs, buildPrompt } from './promptRegistry';
import { recordAbstain, getRecentAbstains } from './importTelemetry';

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

export type SmartInput = {
  url?: string | null;
  text?: string | null;
  file?: { uri: string; mime?: string; name?: string } | null;
};

export type SmartOutput = {
  recipe: any;
  provenance: {
    source: 'url' | 'text' | 'image' | 'video';
    videoUrl?: string;
    caption?: string;
    transcript?: string;
    ocrText?: string;
    pageText?: string;
    parserNotes?: string[];
    confidence?: number;
    platform?: string;
    detectionConfidence?: number;
    validationWarnings?: string[];
    hints?: string[];
    // New policy & extraction provenance
    policy?: ParsePolicy;
    extractionMethod?: 'json-ld' | 'og' | 'scrape' | 'ocr' | 'transcript' | 'caption' | 'mixed';
    sourceByField?: Record<string, 'json-ld' | 'og' | 'ocr' | 'transcript' | 'caption' | 'ai'>;
    // Telemetry
    supportRates?: { ingredient: number; step: number };
    evidenceSizes?: { caption: number; transcript: number; ocr: number };

  };
};

// Parse policy scaffolding for downstream enforcement
export type ParsePolicy = 'verbatim' | 'conservative' | 'enrich';

// Telemetry helpers imported from importTelemetry.ts

// --- Evidence support computation for video imports (top-level) ---
function tokenize(s: string): Set<string> {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s\/\.]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && t.length > 2)
  );
}

// Normalize known video URL variants (e.g., YouTube Shorts -> watch)
async function normalizeVideoUrl(u: string): Promise<string> {
  try {
    // Use the Supabase Edge Function to resolve the URL server-side
    const supabaseUrl = 'https://wckohtwftlwhyldnfpbz.supabase.co/functions/v1/resolve-url';
    let finalUrl = u;

    try {
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indja29odHdmdGx3aHlsZG5mcGJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzA1NjgsImV4cCI6MjA2Nzc0NjU2OH0.uJN5YSIiil3tYm4JBG2UapMaYEROICE33iQvTaIUg68';
      const response = await fetch(supabaseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ url: u }),
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve URL: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.finalUrl) {
        finalUrl = data.finalUrl;
      }
    } catch (fetchError) {
      console.warn(`[UniversalImport] Could not resolve URL via proxy for ${u}, proceeding with original. Error: ${fetchError}`);
    }

    const url = new URL(finalUrl);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');

    // Normalize YouTube Shorts and short links to standard watch URLs
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      if (hostname === 'youtu.be' && url.pathname.length > 1) {
        const id = url.pathname.slice(1);
        return `https://www.youtube.com/watch?v=${id}`;
      }
      const shortsMatch = url.pathname.match(/\/shorts\/([^/?#]+)/);
      if (shortsMatch?.[1]) {
        const id = shortsMatch[1];
        return `https://www.youtube.com/watch?v=${id}`;
      }
    }

    // For other platforms like TikTok and Instagram, the resolved URL is usually sufficient
    return finalUrl;
  } catch (e) {
    console.error(`[UniversalImport] Failed to normalize URL ${u}:`, e);
    return u; // Return original URL on failure
  }
}

export function computeSupportRates(evidenceText: string, recipe: any): { ingredientSupport: number; stepSupport: number } {
  const ev = tokenize(evidenceText);
  const ings = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const steps = Array.isArray(recipe?.steps) ? recipe.steps : [];

  let ingSupported = 0;
  for (const ing of ings) {
    const name = String(ing?.name || '').toLowerCase();
    const tokens = tokenize(name);
    const supported = Array.from(tokens).some((t) => ev.has(t));
    if (supported) ingSupported++;
  }
  const ingredientSupport = ings.length ? ingSupported / ings.length : 0;

  let stepSupported = 0;
  for (const st of steps) {
    const tokens = tokenize(String(st || ''));
    const supported = Array.from(tokens).some((t) => ev.has(t));
    if (supported) stepSupported++;
  }
  const stepSupport = steps.length ? stepSupported / steps.length : 0;

  return { ingredientSupport, stepSupport };
}

function detectKind(input: SmartInput): {
  kind: 'video-url' | 'recipe-url' | 'text' | 'image-file' | 'video-file';
  detection: ReturnType<typeof detectInputType>;
  validation: ReturnType<typeof validateInput>;
  hints: string[];
} {
  let inputForDetection: string | File;

  if (input.url) {
    inputForDetection = input.url;
  } else if (input.file?.uri) {
    // Create a mock File object for detection
    const mockFile = {
      name: input.file.name || 'file',
      type: input.file.mime || '',
      // Use non-zero size to satisfy validators that disallow empty files
      size: 1
    } as File;
    inputForDetection = mockFile;
  } else {
    inputForDetection = input.text || '';
  }


  const detection = detectInputType(inputForDetection);
  const validation = validateInput(inputForDetection, detection);
  const hints = getPlatformHints(detection);

  // Map new detection types to legacy kinds for backward compatibility
  let kind: 'video-url' | 'recipe-url' | 'text' | 'image-file' | 'video-file';

  if (detection.type === 'url') {
    kind = detection.metadata.isVideoUrl ? 'video-url' : 'recipe-url';
  } else if (detection.type === 'image') {
    kind = 'image-file';
  } else if (detection.type === 'video') {
    kind = 'video-file';
  } else {
    kind = 'text';
  }

  return { kind, detection, validation, hints };
}

function normalizeFractions(text: string): string {
  // Convert Unicode fractions to regular fractions
  const unicodeFractions: Record<string, string> = {
    '½': '1/2',
    '⅓': '1/3',
    '⅔': '2/3',
    '¼': '1/4',
    '¾': '3/4',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8'
  };

  let result = text;

  // Replace Unicode fractions
  Object.entries(unicodeFractions).forEach(([unicode, fraction]) => {
    result = result.replace(new RegExp(unicode, 'g'), fraction);
  });

  // Normalize fraction spacing: "2 / 3" -> "2/3"
  result = result.replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2');

  // Handle mixed numbers: "1 2/3" -> "1 2/3" (ensure proper spacing)
  result = result.replace(/(\d+)\s+(\d+\/\d+)/g, '$1 $2');

  return result;
}

function preprocess(text: string) {
  // Enhanced preprocessing with fraction handling and better structure preservation
  let t = text || '';

  // First, normalize fractions to prevent parsing errors
  t = normalizeFractions(t);

  // Remove emojis
  t = t.replace(/[\u{1F300}-\u{1FAFF}]/gu, '');

  // Remove URLs
  t = t.replace(/https?:\/\/\S+/g, '');

  // Remove hashtags and mentions
  t = t.replace(/[#@]\w+/g, '');

  // Improve ingredient line formatting
  // Handle cases like "2 cups flour (all-purpose (divided in half))"
  t = t.replace(/(\d+(?:\s+\d+)?\/?\d*)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lb|grams?|g|kg|ml|l)\s+([^(\n]+)(\([^)]*\))?/gi,
    '$1 $2 $3 $4');

  // Ensure fractions stay connected to their units
  const units = ['cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
    'ounce', 'ounces', 'oz', 'pound', 'pounds', 'lb', 'gram', 'grams', 'g',
    'kilogram', 'kilograms', 'kg', 'milliliter', 'milliliters', 'ml', 'liter', 'liters', 'l'];

  // Protect fraction-unit combinations
  units.forEach(unit => {
    const regex = new RegExp(`(\\d+(?:\\s+\\d+)?/\\d+)\\s+(${unit})`, 'gi');
    t = t.replace(regex, '$1 $2');
  });

  // Clean up extra whitespace but preserve line structure
  t = t.replace(/[ \t]+/g, ' '); // Replace multiple spaces/tabs with single space
  t = t.replace(/\n\s*\n/g, '\n'); // Remove empty lines
  t = t.trim();

  return t;
}

// Helper function to determine if we should skip AI reconciliation
function shouldSkipReconciliation(recipe: any): boolean {
  // Skip if recipe looks complete and well-formed
  if (!recipe || !recipe.ingredients || !Array.isArray(recipe.ingredients)) {
    return false;
  }

  // Check if ingredients have reasonable structure
  const hasGoodIngredients = recipe.ingredients.length > 0 &&
    recipe.ingredients.every((ing: any) => ing.name && (ing.quantity || ing.quantity === 0));

  // Check if we have steps
  const hasSteps = recipe.steps && Array.isArray(recipe.steps) && recipe.steps.length > 0;

  // Skip reconciliation if everything looks good
  return hasGoodIngredients && hasSteps;
}

// Helper function to validate and fix common fraction parsing errors
function validateIngredientQuantities(ingredients: any[]): any[] {
  return ingredients.map(ingredient => {
    if (!ingredient.quantity || !ingredient.unit || !ingredient.name) {
      return ingredient;
    }

    // Check for common fraction parsing errors
    const quantity = String(ingredient.quantity);
    const unit = String(ingredient.unit);
    const name = String(ingredient.name);

    // Fix case where "2/3 cup water" became "2 cup water" 
    // by checking if the name contains fraction indicators
    if (quantity && !quantity.includes('/') && name.includes('/')) {
      console.warn(`[UniversalImport] Detected fraction parsing error: ${quantity} ${unit} ${name}`);
      // This is a more complex fix that would require parsing the name
      // For now, just log the warning
    }

    // Ensure fractions are properly formatted
    if (quantity.includes('/')) {
      // Normalize fraction format
      const normalizedQuantity = quantity.replace(/\s+/g, ' ').trim();
      return {
        ...ingredient,
        quantity: normalizedQuantity
      };
    }

    return ingredient;
  });
}

function mergeSignals(parts: Array<string | undefined>) {
  const cleanedParts = parts.filter((p): p is string => !!p).map(p => preprocess(p));
  const lines = cleanedParts.join('\n').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const l of lines) {
    const k = l.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(l); }
  }
  return out.join('\n');
}

async function reconcileWithAI(initialJson: any, evidence: string): Promise<{ recipe: any; notes: string[]; confidence: number }> {
  const { system } = buildPrompt('import.reconcile', 'conservative');

  const user = `PRELIMINARY_JSON\n${JSON.stringify(initialJson)}\n\nEVIDENCE\n${evidence}`;
  const resp = await createChatCompletionDeterministic([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);
  try {
    let jsonText = resp.trim();
    // Attempt to extract JSON from code fences or surrounding text
    const fenceMatch = jsonText.match(/```json[\s\S]*?```/i) || jsonText.match(/```[\s\S]*?```/);
    if (fenceMatch) {
      jsonText = fenceMatch[0].replace(/```json|```/gi, '').trim();
    } else {
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.slice(firstBrace, lastBrace + 1);
      }
    }
    const parsed = JSON.parse(jsonText);
    let recipe = parsed.recipe || initialJson;

    // Validate and fix ingredient quantities, especially fractions
    if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
      recipe.ingredients = validateIngredientQuantities(recipe.ingredients);
    }

    const notes = Array.isArray(parsed.notes) ? parsed.notes : [];
    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.7;
    return { recipe, notes, confidence };
  } catch {
    // fallback to initial
    return { recipe: initialJson, notes: ['Failed to parse reconciliation response.'], confidence: 0.6 };
  }
}

export async function smartImport(input: SmartInput): Promise<SmartOutput> {
  console.log('[UniversalImport] Starting smart import with input:', {
    hasUrl: !!input.url,
    hasText: !!input.text,
    hasFile: !!input.file,
    fileType: input.file?.mime
  });

  const { kind, detection, validation, hints } = detectKind(input);

  console.log('[UniversalImport] Detection result:', {
    kind,
    detectionType: detection.type,
    confidence: detection.confidence,
    platform: detection.metadata.platform
  });

  // Check validation before proceeding
  if (!validation.isValid) {
    console.warn('[UniversalImport] Input validation failed:', validation.errors, 'kind=', kind);
    // For text and image-file, proceed best-effort to avoid blocking simple flows
    if (kind !== 'text' && kind !== 'image-file') {
      throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
    }
  }

  const provenance: SmartOutput['provenance'] = {
    source: kind.includes('url') ? 'url' : kind.includes('text') ? 'text' : kind.includes('image') ? 'image' : 'video',
    platform: detection.metadata.platform,
    detectionConfidence: detection.confidence,
    validationWarnings: validation.warnings,
    hints
  } as any;

  if (kind === 'recipe-url') {
    // Guard: if there is no actual URL (e.g., detector flagged URL-like text), fallback to text parsing
    if (!input.url) {
      console.warn('[UniversalImport] Detected recipe-url but input.url is missing. Falling back to text parsing.');
      const recipe = parseRecipeWithRules(preprocess(input.text || ''));
      const policy: ParsePolicy = 'conservative';
      const evidenceSizes = { text: (input.text || '').length } as any;
      return { recipe, provenance: { ...provenance, policy, evidenceSizes, parserNotes: ['URL detection fallback to text'], confidence: 0.9 } };
    }
    // Heuristic pre-check: detect JSON-LD to set policy and extraction hints
    try {
      let html = '';
      try {
        const res = await fetch(input.url!);
        html = await res.text();
      } catch {}
      if (!html) {
        try {
          const readerUrl = `https://r.jina.ai/http://${String(input.url!).replace(/^https?:\/\//, '')}`;
          const res = await fetch(readerUrl);
          html = await res.text();
        } catch {}
      }
      if (html) {
        const jsonLd = extractJsonLdRecipes(html);
        if (jsonLd.length) {
          provenance.policy = 'verbatim';
          provenance.extractionMethod = 'json-ld';
          provenance.parserNotes = [
            ...(provenance.parserNotes || []),
            'JSON-LD detected; prefer verbatim mapping'
          ];
        } else {
          provenance.policy = 'conservative';
        }
      }
    } catch {}

    const recipe = await importRecipeFromUrl(input.url!); 
    recipe.sourceUrl = input.url;
    // Add basic evidence sizes if available (HTML length unknown here); keep policy/extractionMethod from detection
    return { recipe, provenance: { ...provenance, confidence: 0.9 } };
  }

  if (kind === 'text') {
    // Use deterministic rule-based parsing instead of AI for consistency
    const recipe = parseRecipeWithRules(preprocess(input.text || ''));
    // Telemetry: conservative policy, evidence size (text length)
    const policy: ParsePolicy = 'conservative';
    const evidenceSizes = { text: (input.text || '').length } as any;
    // Skip AI reconciliation for text imports to ensure consistency
    console.log('[UniversalImport] Using direct text import for consistency');
    return { recipe, provenance: { ...provenance, policy, evidenceSizes, parserNotes: ['Rule-based parsing'], confidence: 0.9 } };
  }

  if (kind === 'image-file') {
    // Convert to base64 data URL as expected by importRecipeFromImage
    const uri = input.file!.uri;
    let dataUrl: string;
    if (uri.startsWith('data:')) {
      dataUrl = uri;
    } else if (Platform.OS === 'web') {
      // Web: use fetch -> arrayBuffer -> base64 (avoid direct Node Buffer typings)
      const res = await fetch(uri);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const g: any = globalThis as any;
      const base64 = typeof g.btoa === 'function'
        ? g.btoa(binary)
        : g.Buffer && typeof g.Buffer.from === 'function'
          ? g.Buffer.from(binary, 'binary').toString('base64')
          : '';
      const ct = res.headers.get('Content-Type') || undefined;
      const guessedMime = input.file!.mime || ct || 'image/jpeg';
      dataUrl = `data:${guessedMime};base64,${base64}`;
    } else {
      // Native: use expo-file-system
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const ext = uri.split('.').pop()?.toLowerCase();
      const mime = input.file!.mime || (ext === 'png' ? 'image/png' : 'image/jpeg');
      dataUrl = `data:${mime};base64,${base64}`;
    }
    const recipe = await importRecipeFromImage(dataUrl);
    const policy: ParsePolicy = 'conservative';
    const evidenceSizes = { imageBytes: (dataUrl.length || 0) } as any;
    return { recipe, provenance: { ...provenance, policy, evidenceSizes } };
  }

  if (kind === 'video-url') {
    const normUrl = await normalizeVideoUrl(input.url!);
    provenance.videoUrl = normUrl;

    console.log('[UniversalImport] Processing video URL automatically:', input.url);

    // 1) Try reader (r.jina.ai) first for page text/captions
    try {
      const readerUrl = `https://r.jina.ai/http/${normUrl.replace(/^https?:\/\//, '')}`;
      const res = await fetch(readerUrl);
      const page = await res.text();
      const evidence = (page || '').slice(0, 200000);
      if (evidence && evidence.trim().length > 50) {
        provenance.pageText = evidence.slice(0, 2000);
        const recipe = parseRecipeWithRules(preprocess(evidence));
        const knobs = getImportKnobs();
        const { ingredientSupport, stepSupport } = computeSupportRates(evidence, recipe);
        const ingOk = ingredientSupport >= knobs.minIngredientSupport;
        const stepOk = stepSupport >= knobs.minStepSupport;
        if (ingOk && stepOk) {
          return {
            recipe: { ...recipe, sourceUrl: input.url },
            provenance: {
              ...provenance,
              parserNotes: ['Reader first (r.jina.ai) + rule-based parsing'],
              confidence: 0.6,
              policy: knobs.policy,
              extractionMethod: 'scrape',
              supportRates: { ingredient: ingredientSupport, step: stepSupport } as any,
              evidenceSizes: { transcript: 0 } as any
            }
          };
        }
        // continue to STT if evidence insufficient
      }
    } catch (readerErr) {
      console.warn('[UniversalImport] Reader-first failed:', readerErr);
    }

    // 2) Auto-transcribe from URL under the hood
    let tx: any;
    try {
      tx = await transcribeFromUrl(normUrl, { language: 'english', response_format: 'json' } as any);
    } catch (e: any) {
      console.warn('[UniversalImport] transcribeFromUrl failed:', e);
      const msg = typeof e?.message === 'string' ? e.message : '';
      const reason = /\(400\)/.test(msg) || /invalid/i.test(msg) ? 'provider_rejected_url' : 'transcription_unavailable';
      recordAbstain({ source: 'video', reason, support: undefined as any, evidenceSizes: { transcript: 0 } as any, at: '' as any });
      throw new Error(`ImportAbstain:video:${reason}`);
    }
    provenance.transcript = tx?.text;

    if (!tx?.text || tx.text.trim().length < 10) {
      const reason = 'no_transcript';
      recordAbstain({ source: 'video', reason, support: undefined as any, evidenceSizes: { transcript: 0 } as any, at: '' as any });
      throw new Error('ImportAbstain:video:' + reason);
    }

    // Deterministic parse from transcript
    const evidence = tx.text;
    const recipe = parseRecipeWithRules(preprocess(evidence));

    // Enforce thresholds
    const knobs = getImportKnobs();
    const { ingredientSupport, stepSupport } = computeSupportRates(evidence, recipe);
    const ingOk = ingredientSupport >= knobs.minIngredientSupport;
    const stepOk = stepSupport >= knobs.minStepSupport;
    if (!(ingOk && stepOk)) {
      const reason = 'insufficient_video_evidence';
      recordAbstain({
        source: 'video',
        reason,
        support: { ingredient: ingredientSupport, step: stepSupport },
        evidenceSizes: { transcript: provenance.transcript?.length || 0 } as any,
        at: '' as any,
      });
      throw new Error(`ImportAbstain:video:${reason}:ing=${ingredientSupport.toFixed(2)};step=${stepSupport.toFixed(2)}`);
    }

    return {
      recipe,
      provenance: {
        ...provenance,
        parserNotes: ['Auto transcription (URL) + rule-based parsing'],
        confidence: 0.7,
        policy: knobs.policy,
        extractionMethod: 'transcript',
        supportRates: { ingredient: ingredientSupport, step: stepSupport } as any,
        evidenceSizes: { transcript: provenance.transcript?.length || 0 } as any
      }
    };
  }

  // video-file processing with multiple fallback strategies
  console.log('[UniversalImport] Processing video file:', input.file?.name);

  // Strategy 1: Try enhanced video content extraction
  try {
    console.log('[UniversalImport] Attempting enhanced video extraction...');
    const { extractVideoContent } = await import('./videoContentExtractor');

    // Convert URI to File object for video extraction
    const response = await fetch(input.file!.uri);
    const blob = await response.blob();
    const videoFile = new File([blob], input.file!.name || 'video.mp4', {
      type: input.file!.mime || 'video/mp4'
    });

    const videoResult = await extractVideoContent(videoFile, {
      extractCaptions: true,
      extractFrameText: true,
      transcribeAudio: true,
      frameInterval: 10,
      maxFrames: 8
    });

    provenance.transcript = videoResult.audioTranscript;
    provenance.caption = videoResult.captions;
    provenance.ocrText = videoResult.frameTexts.join('\n');

    const evidence = videoResult.mergedContent;

    if (!evidence || evidence.trim().length < 10) {
      throw new Error('No meaningful content extracted from video');
    }

    // Use rule-based parsing for consistency
    const recipe = parseRecipeWithRules(preprocess(evidence));

    // Enforce evidence thresholds
    const knobs = getImportKnobs();
    const { ingredientSupport, stepSupport } = computeSupportRates(evidence, recipe);
    const ingOk = ingredientSupport >= knobs.minIngredientSupport;
    const stepOk = stepSupport >= knobs.minStepSupport;
    if (!(ingOk && stepOk)) {
      const reason = 'insufficient_video_evidence';
      recordAbstain({
        source: 'video',
        reason,
        support: { ingredient: ingredientSupport, step: stepSupport },
        evidenceSizes: {
          caption: provenance.caption?.length,
          transcript: provenance.transcript?.length,
          ocr: provenance.ocrText?.length,
        },
        at: '' as any,
      });
      throw new Error(`ImportAbstain:video:${reason}:ing=${ingredientSupport.toFixed(2)};step=${stepSupport.toFixed(2)}`);
    }
    console.log('[UniversalImport] Enhanced video extraction successful');

    return {
      recipe,
      provenance: {
        ...provenance,
        parserNotes: ['Enhanced video extraction + rule-based parsing', ...videoResult.metadata.extractionMethods],
        confidence: Math.max(0.8, videoResult.metadata.confidence),
        policy: knobs.policy,
        extractionMethod: 'mixed',
        supportRates: { ingredient: ingredientSupport, step: stepSupport } as any,
        evidenceSizes: {
          caption: provenance.caption?.length || 0,
          transcript: provenance.transcript?.length || 0,
          ocr: provenance.ocrText?.length || 0
        } as any
      }
    };

  } catch (enhancedError) {
    console.warn('[UniversalImport] Enhanced video extraction failed:', enhancedError);

    // Strategy 2: Fallback to audio-only transcription
    try {
      console.log('[UniversalImport] Falling back to audio-only transcription...');
      const tx = await transcribeFromUri(
        input.file!.uri,
        input.file!.name || 'video.mp4',
        input.file!.mime || 'video/mp4',
        { language: 'english', response_format: 'json' }
      );

      provenance.transcript = tx.text;

      if (!tx.text || tx.text.trim().length < 10) {
        throw new Error('No meaningful transcript extracted from video audio');
      }

      // Use rule-based parsing for consistency
      const recipe = parseRecipeWithRules(preprocess(tx.text));

      // Enforce evidence thresholds on audio transcript
      const knobs = getImportKnobs();
      const { ingredientSupport, stepSupport } = computeSupportRates(tx.text, recipe);
      const ingOk = ingredientSupport >= knobs.minIngredientSupport;
      const stepOk = stepSupport >= knobs.minStepSupport;
      if (!(ingOk && stepOk)) {
        const reason = 'insufficient_video_evidence';
        recordAbstain({
          source: 'video',
          reason,
          support: { ingredient: ingredientSupport, step: stepSupport },
          evidenceSizes: {
            caption: provenance.caption?.length,
            transcript: provenance.transcript?.length,
            ocr: provenance.ocrText?.length,
          },
          at: '' as any,
        });
        throw new Error(`ImportAbstain:video:${reason}:ing=${ingredientSupport.toFixed(2)};step=${stepSupport.toFixed(2)}`);
      }
      console.log('[UniversalImport] Audio-only transcription successful');

      return {
        recipe: { ...recipe, sourceUrl: input.url },
        provenance: {
          ...provenance,
          parserNotes: ['Audio-only transcription + rule-based parsing'],
          confidence: 0.7,
          policy: knobs.policy,
          extractionMethod: 'transcript',
          supportRates: { ingredient: ingredientSupport, step: stepSupport } as any,
          evidenceSizes: {
            caption: provenance.caption?.length || 0,
            transcript: provenance.transcript?.length || 0,
            ocr: provenance.ocrText?.length || 0
          } as any
        }
      };

    } catch (audioError) {
      console.error('[UniversalImport] Audio transcription also failed:', audioError);

      // Strategy 3: Final fallback - ask user to provide text or screenshot
      throw new Error(
        'Unable to process video content. Please try one of these alternatives:\n' +
        '1. Paste the recipe text from the video caption\n' +
        '2. Take a screenshot of the recipe and import that instead\n' +
        '3. Use a different video with clearer audio or captions'
      );
    }
  }
}

// Deterministic rule-based recipe parser to avoid AI inconsistency
function parseRecipeWithRules(text: string): any {
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  let recipe = {
    name: '',
    description: '',
    ingredients: [] as any[],
    steps: [] as string[],
    prepTime: undefined as number | undefined,
    cookTime: undefined as number | undefined,
    servings: undefined as number | undefined,
    tags: [] as string[]
  };

  let currentSection = 'title';
  let ingredientIndex = 0;
  let stepIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Detect recipe title (usually first non-empty line)
    if (!recipe.name && currentSection === 'title') {
      recipe.name = line;
      continue;
    }

    // Detect description (line after title, before ingredients)
    if (!recipe.description && currentSection === 'title' && !isIngredientSectionHeader(lowerLine) && !isStepSectionHeader(lowerLine)) {
      recipe.description = line;
      continue;
    }

    // Detect section headers
    if (isIngredientSectionHeader(lowerLine)) {
      currentSection = 'ingredients';
      continue;
    }

    if (isStepSectionHeader(lowerLine)) {
      currentSection = 'steps';
      continue;
    }

    // Parse ingredients
    if (currentSection === 'ingredients' || (currentSection === 'title' && looksLikeIngredient(line))) {
      currentSection = 'ingredients';
      const ingredient = parseIngredientLine(line);
      if (ingredient) {
        recipe.ingredients.push(ingredient);
        ingredientIndex++;
      }
      continue;
    }

    // Parse steps
    if (currentSection === 'steps' || looksLikeStep(line)) {
      currentSection = 'steps';
      const step = parseStepLine(line, stepIndex + 1);
      if (step) {
        recipe.steps.push(step);
        stepIndex++;
      }
      continue;
    }

    // Try to extract timing info from any line
    extractTimingInfo(line, recipe);
  }

  // Fallback: if no clear sections found, try to parse everything
  if (recipe.ingredients.length === 0 && recipe.steps.length === 0) {
    return parseUnstructuredRecipe(text);
  }

  return recipe;
}

function isIngredientSectionHeader(line: string): boolean {
  return /^(ingredients?|what you need|shopping list|you will need):?$/i.test(line.trim());
}

function isStepSectionHeader(line: string): boolean {
  return /^(steps?|instructions?|directions?|method|preparation|how to make):?$/i.test(line.trim());
}

function looksLikeIngredient(line: string): boolean {
  // Check for quantity + unit + ingredient pattern - MUST handle fractions properly
  const ingredientPattern = /^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|pounds?|g|grams?|kg|ml|l|liters?|cloves?|bunches?|pinch|splash|pcs?|pieces?)\s+/i;
  return ingredientPattern.test(line.trim());
}

function looksLikeStep(line: string): boolean {
  // Check for numbered step or cooking verbs
  const stepPattern = /^\d+\.?\s+/;
  const cookingVerbs = /\b(preheat|heat|cook|bake|mix|stir|add|combine|whisk|fold|pour|serve|roll|spread|sprinkle|top|remove|slice|let|cool)\b/i;
  return stepPattern.test(line.trim()) || cookingVerbs.test(line);
}

function parseIngredientLine(line: string): any | null {
  // Enhanced regex to handle fractions and complex formats
  // CRITICAL: Must capture fractions like "2/3" as complete quantities
  const patterns = [
    // Pattern 1: Fractions like "2/3 cup water" or mixed numbers like "1 1/2 cups flour"
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(cups?|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|pounds?|g|grams?|kg|ml|l|liters?|cloves?|bunches?|pinch|splash|pcs?|pieces?)\s+(.+)$/i
  ];

  console.log(`[parseIngredientLine] Parsing: "${line.trim()}"`);

  for (const pattern of patterns) {
    const match = line.trim().match(pattern);
    if (match) {
      const [, quantity, unit, name] = match;

      console.log(`[parseIngredientLine] Matched - Quantity: "${quantity}", Unit: "${unit}", Name: "${name}"`);

      // Clean up the name (remove extra parentheses content if needed)
      const cleanName = name.trim();

      const result = {
        name: cleanName,
        quantity: quantity.trim(),
        unit: normalizeUnit(unit.toLowerCase()),
        optional: /\(optional\)/i.test(cleanName)
      };

      console.log(`[parseIngredientLine] Result:`, result);
      return result;
    }
  }

  console.log(`[parseIngredientLine] No match found for: "${line.trim()}"`);
  return null;
}

function parseStepLine(line: string, stepNumber: number): string | null {
  let step = line.trim();

  // Remove step number if present
  step = step.replace(/^\d+\.?\s*/, '');

  if (step.length < 5) return null; // Too short to be a meaningful step

  return step;
}

function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'cups': 'cup',
    'tablespoons': 'tbsp',
    'tablespoon': 'tbsp',
    'teaspoons': 'tsp',
    'teaspoon': 'tsp',
    'ounces': 'oz',
    'ounce': 'oz',
    'pounds': 'lb',
    'pound': 'lb',
    'grams': 'g',
    'gram': 'g',
    'kilograms': 'kg',
    'kilogram': 'kg',
    'milliliters': 'ml',
    'milliliter': 'ml',
    'liters': 'l',
    'liter': 'l',
    'pieces': 'pcs',
    'piece': 'pcs'
  };

  return unitMap[unit] || unit;
}

function extractTimingInfo(line: string, recipe: any): void {
  // Extract prep time
  const prepMatch = line.match(/prep(?:aration)?\s*time:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i);
  if (prepMatch && !recipe.prepTime) {
    recipe.prepTime = parseInt(prepMatch[1]);
  }

  // Extract cook time
  const cookMatch = line.match(/cook(?:ing)?\s*time:?\s*(\d+)\s*(?:min|minutes?|hrs?|hours?)/i);
  if (cookMatch && !recipe.cookTime) {
    recipe.cookTime = parseInt(cookMatch[1]);
  }

  // Extract servings
  const servingMatch = line.match(/serves?\s*(\d+)|(\d+)\s*servings?/i);
  if (servingMatch && !recipe.servings) {
    recipe.servings = parseInt(servingMatch[1] || servingMatch[2]);
  }
}

function parseUnstructuredRecipe(text: string): any {
  // Fallback for unstructured text - try to extract what we can
  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);

  const recipe = {
    name: lines[0] || 'Imported Recipe',
    description: '',
    ingredients: [] as any[],
    steps: [] as string[],
    prepTime: undefined as number | undefined,
    cookTime: undefined as number | undefined,
    servings: undefined as number | undefined,
    tags: [] as string[]
  };

  // Try to find ingredients and steps in unstructured text
  lines.forEach((line, index) => {
    if (looksLikeIngredient(line)) {
      const ingredient = parseIngredientLine(line);
      if (ingredient) recipe.ingredients.push(ingredient);
    } else if (looksLikeStep(line)) {
      const step = parseStepLine(line, recipe.steps.length + 1);
      if (step) recipe.steps.push(step);
    }

    extractTimingInfo(line, recipe);
  });

  return recipe;
}

// Test function to verify fraction handling (can be removed in production)
export function testFractionHandling() {
  const testCases = [
    "2/3 cup water (warm)",
    "1 1/2 cups flour",
    "3/4 teaspoon salt",
    "½ cup sugar",
    "2 ⅓ cups milk"
  ];

  console.log('[UniversalImport] Testing fraction handling:');
  testCases.forEach(testCase => {
    const processed = preprocess(testCase);
    const normalized = normalizeFractions(testCase);
    const parsed = parseIngredientLine(testCase);
    console.log(`Original: "${testCase}"`);
    console.log(`  -> Normalized: "${normalized}"`);
    console.log(`  -> Processed: "${processed}"`);
    console.log(`  -> Parsed:`, parsed);
    console.log('---');
  });
}

// Test function specifically for the problematic case
export function testSpecificFraction() {
  const testCase = "2/3 cup water (warm (110 to 115 degrees F))";
  console.log('[UniversalImport] Testing specific fraction case:');
  console.log(`Input: "${testCase}"`);

  const normalized = normalizeFractions(testCase);
  console.log(`Normalized: "${normalized}"`);

  const processed = preprocess(testCase);
  console.log(`Processed: "${processed}"`);

  const parsed = parseIngredientLine(processed);
  console.log(`Parsed:`, parsed);

  const looksLike = looksLikeIngredient(processed);
  console.log(`Looks like ingredient: ${looksLike}`);
}


// -----------------------------------------------------------------------------
// Modular wrapper handlers for explicit import flows
// These provide a clean, dedicated entrypoint for each import type while
// reusing the existing smartImport() orchestration and provenance handling.
// -----------------------------------------------------------------------------

export async function importRecipeFromUrlHandler(url: string): Promise<SmartOutput> {
  if (!url || typeof url !== 'string') throw new Error('Invalid URL');
  return smartImport({ url });
}

export async function importRecipeFromTextHandler(text: string): Promise<SmartOutput> {
  if (!text || typeof text !== 'string') throw new Error('Invalid text');
  return smartImport({ text });
}

export type ImportFile = { uri: string; mime?: string; name?: string };

export async function importRecipeFromImageHandler(file: ImportFile): Promise<SmartOutput> {
  if (!file?.uri) throw new Error('Invalid image file');
  return smartImport({ file });
}

export async function importRecipeFromVideoUrlHandler(url: string): Promise<SmartOutput> {
  if (!url || typeof url !== 'string') throw new Error('Invalid video URL');
  return smartImport({ url });
}

export async function importRecipeFromVideoFileHandler(file: ImportFile): Promise<SmartOutput> {
  if (!file?.uri) throw new Error('Invalid video file');
  return smartImport({ file });
}
