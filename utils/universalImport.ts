import { importRecipeFromUrl, importRecipeFromText, importRecipeFromImage } from './recipeImport';
import { extractJsonLdRecipes } from './urlContentExtractor';
import { transcribeFromUrl, transcribeFromUri } from './sttClient';
import { createChatCompletion } from './aiClient';
import { detectInputType, validateInput, getPlatformHints } from './inputDetection';

import * as FileSystem from 'expo-file-system';

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

  };
};

// Parse policy scaffolding for downstream enforcement
export type ParsePolicy = 'verbatim' | 'conservative' | 'enrich';

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
      size: 0 // We don't have size info from SmartInput
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
  const system = `You are a CONSERVATIVE recipe data validator. Your job is to MINIMALLY fix the preliminary JSON, NOT to rewrite or improve the recipe.

STRICT RULES - DO NOT DEVIATE:
1. PRESERVE the preliminary JSON as much as possible
2. ONLY fix obvious parsing errors, do NOT make creative changes
3. NEVER change ingredient names unless they are clearly wrong
4. NEVER change quantities unless they are clearly parsing errors
5. NEVER add ingredients not in the preliminary JSON
6. NEVER remove ingredients from the preliminary JSON
7. BE CONSISTENT - same input should always give same output

FRACTION HANDLING:
- If you see "2/3" in evidence but "2" in JSON, fix it to "2/3"
- If you see "1/2" in evidence but "1" in JSON, fix it to "1/2"
- NEVER convert fractions to decimals or whole numbers
- Preserve exact fraction format from evidence

UNIT NORMALIZATION ONLY:
- tablespoon → tbsp
- teaspoon → tsp  
- ounces → oz
- pounds → lb
- cups → cup (keep singular)

WHAT NOT TO DO:
- Do NOT simplify recipe names
- Do NOT change ingredient quantities unless clearly wrong
- Do NOT add missing ingredients
- Do NOT rewrite instructions
- Do NOT make the recipe "better"

Return ONLY: { recipe: <minimally_fixed_json>, notes: [<what_you_fixed>], confidence: <0.8_if_minimal_changes_0.6_if_major_fixes> }`;

  const user = `PRELIMINARY_JSON\n${JSON.stringify(initialJson)}\n\nEVIDENCE\n${evidence}`;
  const resp = await createChatCompletion([
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
    console.error('[UniversalImport] Input validation failed:', validation.errors);
    throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
  }

  const provenance: SmartOutput['provenance'] = {
    source: kind.includes('url') ? 'url' : kind.includes('text') ? 'text' : kind.includes('image') ? 'image' : 'video',
    platform: detection.metadata.platform,
    detectionConfidence: detection.confidence,
    validationWarnings: validation.warnings,
    hints
  } as any;

  if (kind === 'recipe-url') {
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
    return { recipe, provenance };
  }

  if (kind === 'text') {
    // Use deterministic rule-based parsing instead of AI for consistency
    const recipe = parseRecipeWithRules(preprocess(input.text || ''));
    // For text-only we don’t have extra evidence; still run light reconcile on text
    // Skip AI reconciliation for text imports to ensure consistency
    console.log('[UniversalImport] Using direct text import for consistency');
    return { recipe, provenance: { ...provenance, parserNotes: ['Rule-based parsing'], confidence: 0.9 } };
  }

  if (kind === 'image-file') {
    // Convert to base64 data URL as expected by importRecipeFromImage
    const uri = input.file!.uri;
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const ext = uri.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${base64}`;
    const recipe = await importRecipeFromImage(dataUrl);
    return { recipe, provenance };
  }

  if (kind === 'video-url') {
    provenance.videoUrl = input.url!;

    console.log('[UniversalImport] Processing video URL:', input.url);

    // For now, provide a helpful error message for video URLs since transcription might not be available
    throw new Error(
      'Video URL processing requires transcription services that may not be currently available.\n\n' +
      'Please try one of these alternatives:\n' +
      '• Copy the recipe text from the video description or comments\n' +
      '• Take a screenshot of the recipe and import that instead\n' +
      '• Download the video and upload it as a file\n' +
      '• Use the "Transcribe Video" button if it appears'
    );
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
    console.log('[UniversalImport] Enhanced video extraction successful');

    return {
      recipe,
      provenance: {
        ...provenance,
        parserNotes: ['Enhanced video extraction + rule-based parsing', ...videoResult.metadata.extractionMethods],
        confidence: Math.max(0.8, videoResult.metadata.confidence)
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
      console.log('[UniversalImport] Audio-only transcription successful');

      return {
        recipe,
        provenance: {
          ...provenance,
          parserNotes: ['Audio-only transcription + rule-based parsing'],
          confidence: 0.7
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


