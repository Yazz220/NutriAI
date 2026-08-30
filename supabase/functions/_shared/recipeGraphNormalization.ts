type JsonRecord = Record<string, unknown>;

export interface NormalizedRecipeGraphDraft extends JsonRecord {
  title: string;
  servings?: number;
  yieldText?: string;
  category: string;
  ingredientGroups: JsonRecord[];
  stepGroups: JsonRecord[];
  tags: string[];
  provenance: JsonRecord;
}

export interface StructuredRecipeSourceMetadata {
  canonicalUrl?: string;
  sourceTitle?: string;
  sourceLanguage?: string;
  fetchedAt?: string;
  sourceContentHash?: string;
  candidateCount?: number;
  selectionReason?: string;
}

const STRUCTURED_RECIPE_PARSER_ID = 'schema-org-json-ld';
const STRUCTURED_RECIPE_PARSER_VERSION = 2;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function cleanText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
}

function instructionTexts(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(instructionTexts);
  if (typeof value === 'string') return cleanText(value) ? [cleanText(value)!] : [];
  const item = record(value);
  if (!item) return [];
  const nested = instructionTexts(item.itemListElement ?? item.steps);
  if (nested.length > 0) return nested;
  const text = cleanText(item.text ?? item.name);
  return text ? [text] : [];
}

function positiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== 'string' || !/^\s*\d+\s*$/.test(value)) return undefined;
  const parsed = Number(value.trim());
  return parsed > 0 ? parsed : undefined;
}

function servingsFromYield(value: unknown): number | undefined {
  if (typeof value === 'number') return positiveInteger(value);
  const yieldText = strings(value)[0];
  if (!yieldText) return undefined;
  const direct = positiveInteger(yieldText);
  if (direct) return direct;
  const serves = yieldText.match(
    /^\s*(?:(?:yield|makes?|serves?|servings?)\s*:?\s*)?(\d+)\s*(?:servings?)?\s*$/i,
  );
  return serves ? positiveInteger(serves[1]) : undefined;
}

function minutesFromIsoDuration(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/i);
  if (!match) return undefined;
  return Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function categoryFrom(value: unknown): string {
  const category = strings(value).join(' ').toLowerCase();
  if (category.includes('breakfast') || category.includes('brunch')) return 'breakfast';
  if (category.includes('dessert') || category.includes('sweet')) return 'desserts';
  if (category.includes('side')) return 'sides';
  if (category.includes('lunch')) return 'lunch';
  if (category.includes('dinner') || category.includes('main')) return 'dinner';
  if (category.includes('healthy') || category.includes('salad')) return 'healthy';
  return 'favorites';
}

function attributionFrom(recipe: JsonRecord): string | undefined {
  for (const candidate of [recipe.publisher, recipe.author]) {
    if (Array.isArray(candidate)) {
      for (const item of candidate) {
        const attribution = attributionFrom({ author: item });
        if (attribution) return attribution;
      }
    }
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    const candidateRecord = record(candidate);
    if (typeof candidateRecord?.name === 'string' && candidateRecord.name.trim()) {
      return candidateRecord.name.trim();
    }
  }
  return undefined;
}

const UNICODE_FRACTIONS: Record<string, string> = {
  '¼': '1/4',
  '½': '1/2',
  '¾': '3/4',
  '⅓': '1/3',
  '⅔': '2/3',
  '⅛': '1/8',
  '⅜': '3/8',
  '⅝': '5/8',
  '⅞': '7/8',
};

const INGREDIENT_UNIT_PATTERN = [
  'tablespoons?', 'tbsp\\.?', 'teaspoons?', 'tsp\\.?',
  'cups?', 'fluid ounces?', 'fl\\.?\\s*oz\\.?', 'ounces?', 'oz\\.?',
  'pounds?', 'lbs?\\.?', 'grams?', 'g', 'kilograms?', 'kg',
  'millilit(?:er|re)s?', 'ml', 'lit(?:er|re)s?', 'l',
  'cloves?', 'cans?', 'jars?', 'packages?', 'packets?', 'sticks?',
  'bunch(?:es)?', 'sprigs?', 'slices?', 'pieces?', 'heads?',
  'pinches?', 'dashes?', 'handfuls?',
].join('|');

const QUANTITY_TOKEN = '(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?)';
const LEADING_QUANTITY = new RegExp(`^(${QUANTITY_TOKEN}(?:\\s*(?:-|–|—|to)\\s*${QUANTITY_TOKEN})?)\\s+`, 'i');
const LEADING_UNIT = new RegExp(`^(${INGREDIENT_UNIT_PATTERN})(?:\\s+|$)`, 'i');
const VAGUE_AMOUNT = new RegExp(`^(a|an)\\s+(${INGREDIENT_UNIT_PATTERN})(?:\\s+of)?\\s+`, 'i');

function normalizeUnicodeFractions(value: string): string {
  return value.replace(/(\d)?([¼½¾⅓⅔⅛⅜⅝⅞])/g, (_match, whole, fraction) => (
    `${whole ? `${whole} ` : ''}${UNICODE_FRACTIONS[fraction]}`
  ));
}

export function parseStructuredIngredientLine(value: unknown): JsonRecord | null {
  const rawText = cleanText(value);
  if (!rawText) return null;
  let remainder = normalizeUnicodeFractions(rawText).trim();
  let quantity: string | undefined;
  let unit: string | undefined;

  const vague = remainder.match(VAGUE_AMOUNT);
  if (vague) {
    quantity = vague[1].toLowerCase();
    unit = vague[2].replace(/\.$/, '').toLowerCase();
    remainder = remainder.slice(vague[0].length);
  } else {
    const amount = remainder.match(LEADING_QUANTITY);
    if (amount) {
      quantity = amount[1].replace(/\s+/g, ' ').replace(/,/g, '.');
      remainder = remainder.slice(amount[0].length);
      const unitMatch = remainder.match(LEADING_UNIT);
      if (unitMatch) {
        unit = unitMatch[1].replace(/\.$/, '').toLowerCase();
        remainder = remainder.slice(unitMatch[0].length);
      }
      remainder = remainder.replace(/^of\s+/i, '');
    }
  }

  const isOptional = /(?:,|\s)optional\s*$/i.test(remainder);
  remainder = remainder.replace(/(?:,|\s)optional\s*$/i, '').trim();
  const commaIndex = remainder.indexOf(',');
  const name = (commaIndex >= 0 ? remainder.slice(0, commaIndex) : remainder).trim();
  const preparation = commaIndex >= 0 ? remainder.slice(commaIndex + 1).trim() : '';

  return {
    name: name || rawText,
    rawText,
    ...(quantity ? { quantity } : {}),
    ...(unit ? { unit } : {}),
    ...(preparation ? { preparation } : {}),
    ...(isOptional ? { isOptional: true } : {}),
  };
}

function slug(value: string, fallback: string): string {
  const normalized = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized || fallback;
}

function structuredIngredientGroups(value: unknown): JsonRecord[] {
  const entries = Array.isArray(value) ? value : [value];
  const ingredients = entries.flatMap((item) => {
    if (typeof item === 'string') {
      const ingredient = parseStructuredIngredientLine(item);
      return ingredient ? [ingredient] : [];
    }
    const itemRecord = record(item);
    const text = itemRecord ? itemRecord.text ?? itemRecord.name : undefined;
    const ingredient = parseStructuredIngredientLine(text);
    return ingredient ? [ingredient] : [];
  });
  return ingredients.length > 0 ? [{ id: 'default', label: '', ingredients }] : [];
}

function structuredStepGroups(value: unknown): JsonRecord[] {
  const entries = Array.isArray(value) ? value : [value];
  const groups: JsonRecord[] = [];
  let ungrouped: JsonRecord[] = [];
  let stepNumber = 1;

  const flushUngrouped = () => {
    if (ungrouped.length === 0) return;
    groups.push({
      id: groups.length === 0 ? 'default' : `directions-${groups.length + 1}`,
      label: '',
      steps: ungrouped,
    });
    ungrouped = [];
  };

  entries.forEach((entry) => {
    const entryRecord = record(entry);
    const types = strings(entryRecord?.['@type']).map((type) => type.toLowerCase());
    const sectionItems = entryRecord?.itemListElement ?? entryRecord?.steps;
    const isSection = Boolean(entryRecord && (types.includes('howtosection') || sectionItems));
    if (isSection) {
      const texts = instructionTexts(sectionItems);
      if (texts.length === 0) return;
      flushUngrouped();
      const label = cleanText(entryRecord?.name) ?? '';
      groups.push({
        id: slug(label, `method-${groups.length + 1}`),
        label,
        steps: texts.map((text) => ({ id: `step-${stepNumber++}`, text })),
      });
      return;
    }

    instructionTexts(entry).forEach((text) => {
      ungrouped.push({ id: `step-${stepNumber++}`, text });
    });
  });
  flushUngrouped();
  return groups;
}

function structuredConfidence(input: {
  recipe: JsonRecord;
  ingredients: JsonRecord[];
  stepGroups: JsonRecord[];
  metadata?: StructuredRecipeSourceMetadata;
  attribution?: string;
  yieldText?: string;
}): number {
  const ingredientCount = input.ingredients.length;
  const parsedIngredientCount = input.ingredients.filter((ingredient) => ingredient.quantity || ingredient.unit).length;
  const hasSections = input.stepGroups.some((group) => typeof group.label === 'string' && group.label.length > 0);
  let score = 0.82;
  if (ingredientCount > 0 && parsedIngredientCount / ingredientCount >= 0.6) score += 0.04;
  if (input.yieldText) score += 0.02;
  if (input.attribution) score += 0.02;
  if (input.metadata?.canonicalUrl) score += 0.01;
  if (hasSections) score += 0.02;
  if (input.recipe.prepTime || input.recipe.cookTime || input.recipe.totalTime) score += 0.02;
  return Math.min(0.95, Math.round(score * 100) / 100);
}

/** Build a complete safety-net draft from schema.org Recipe JSON-LD. */
export function recipeJsonLdToDraft(
  value: unknown,
  sourceUrl: string,
  metadata?: StructuredRecipeSourceMetadata,
): NormalizedRecipeGraphDraft | null {
  const recipe = record(value);
  if (!recipe || typeof recipe.name !== 'string' || !recipe.name.trim()) return null;

  const ingredientGroups = structuredIngredientGroups(recipe.recipeIngredient ?? recipe.ingredients);
  const stepGroups = structuredStepGroups(recipe.recipeInstructions ?? recipe.instructions);
  const ingredients = ingredientGroups.flatMap((group) => Array.isArray(group.ingredients) ? group.ingredients : []);
  if (ingredients.length === 0 || stepGroups.length === 0) return null;

  const keywords = strings(recipe.keywords)
    .flatMap((keyword) => keyword.split(','))
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const attribution = attributionFrom(recipe);
  const yieldText = strings(recipe.recipeYield)[0];
  const servings = servingsFromYield(recipe.recipeYield);
  const sourceCategories = strings(recipe.recipeCategory);
  const sourceCuisines = strings(recipe.recipeCuisine);
  const confidence = structuredConfidence({
    recipe,
    ingredients,
    stepGroups,
    metadata,
    attribution,
    yieldText,
  });

  return {
    title: recipe.name.trim(),
    ...(cleanText(recipe.description) ? { description: cleanText(recipe.description) } : {}),
    ...(servings ? { servings } : {}),
    ...(yieldText ? { yieldText } : {}),
    ...(minutesFromIsoDuration(recipe.prepTime) !== undefined
      ? { prepTimeMinutes: minutesFromIsoDuration(recipe.prepTime) }
      : {}),
    ...(minutesFromIsoDuration(recipe.cookTime) !== undefined
      ? { cookTimeMinutes: minutesFromIsoDuration(recipe.cookTime) }
      : {}),
    ...(minutesFromIsoDuration(recipe.totalTime) !== undefined
      ? { totalTimeMinutes: minutesFromIsoDuration(recipe.totalTime) }
      : {}),
    ...(sourceCuisines[0] ? { cuisine: sourceCuisines[0], sourceCuisine: sourceCuisines } : {}),
    ...(sourceCategories.length > 0 ? { sourceCategory: sourceCategories } : {}),
    category: categoryFrom(recipe.recipeCategory),
    ingredientGroups,
    stepGroups,
    tags: keywords,
    provenance: {
      sourceType: 'url',
      sourceUrl,
      ...(metadata?.canonicalUrl ? { canonicalUrl: metadata.canonicalUrl } : {}),
      ...(metadata?.sourceTitle ? { sourceTitle: metadata.sourceTitle } : {}),
      ...(metadata?.sourceLanguage ? { sourceLanguage: metadata.sourceLanguage } : {}),
      ...(metadata?.fetchedAt ? { fetchedAt: metadata.fetchedAt } : {}),
      ...(metadata?.sourceContentHash ? { sourceContentHash: metadata.sourceContentHash } : {}),
      ...(metadata?.candidateCount !== undefined ? { structuredRecipeCandidateCount: metadata.candidateCount } : {}),
      ...(metadata?.selectionReason ? { structuredRecipeSelectionReason: metadata.selectionReason } : {}),
      ...(typeof recipe['@id'] === 'string' && recipe['@id'].trim()
        ? { structuredDataId: recipe['@id'].trim() }
        : {}),
      parserId: STRUCTURED_RECIPE_PARSER_ID,
      parserVersion: STRUCTURED_RECIPE_PARSER_VERSION,
      confidenceMethod: 'structured-coverage-v1',
      ...(attribution ? { sourceAttribution: attribution } : {}),
      inferredFields: sourceCategories.length > 0 ? [] : ['category'],
      extractionNotes: [
        'Nosh used the structured recipe data supplied by this site.',
      ],
      confidence,
    },
  };
}

function ingredientGroupsFrom(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  const ingredients = value.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [{ name: item.trim() }];
    const itemRecord = record(item);
    return typeof itemRecord?.name === 'string' ? [itemRecord] : [];
  });
  return ingredients.length > 0 ? [{ id: 'default', label: '', ingredients }] : [];
}

function stepGroupsFrom(value: unknown): JsonRecord[] {
  const steps = instructionTexts(value).map((text, index) => ({ id: `step-${index + 1}`, text }));
  return steps.length > 0 ? [{ id: 'default', label: '', steps }] : [];
}

function groupItemCount(groups: unknown, field: 'ingredients' | 'steps'): number {
  if (!Array.isArray(groups)) return 0;
  return groups.reduce((count, group) => {
    const groupRecord = record(group);
    return count + (Array.isArray(groupRecord?.[field]) ? groupRecord[field].length : 0);
  }, 0);
}

function uniqueId(value: unknown, fallback: string, seen: Set<string>): string {
  const base = typeof value === 'string' && value.trim() ? value.trim() : fallback;
  let candidate = base;
  let suffix = 2;

  while (seen.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  seen.add(candidate);
  return candidate;
}

function normalizeIngredientGroupIds(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return value.flatMap((group, index) => {
    const groupRecord = record(group);
    if (!groupRecord) return [];
    return [{
      ...groupRecord,
      id: uniqueId(groupRecord.id, `ingredient-group-${index + 1}`, seen),
    }];
  });
}

function normalizeStepGroupIds(value: unknown): JsonRecord[] {
  if (!Array.isArray(value)) return [];
  const seenGroups = new Set<string>();
  const seenSteps = new Set<string>();

  return value.flatMap((group, groupIndex) => {
    const groupRecord = record(group);
    if (!groupRecord) return [];
    const steps = Array.isArray(groupRecord.steps)
      ? groupRecord.steps.flatMap((step, stepIndex) => {
        const stepRecord = record(step);
        if (!stepRecord) return [];
        return [{
          ...stepRecord,
          id: uniqueId(stepRecord.id, `step-${groupIndex + 1}-${stepIndex + 1}`, seenSteps),
        }];
      })
      : [];

    return [{
      ...groupRecord,
      id: uniqueId(groupRecord.id, `step-group-${groupIndex + 1}`, seenGroups),
      steps,
    }];
  });
}

/** Repair common model omissions, then merge deterministic source evidence. */
export function normalizeRecipeGraphDraft(
  candidate: unknown,
  fallback: NormalizedRecipeGraphDraft | null,
  sourceType: string,
  sourceUrl?: string,
): NormalizedRecipeGraphDraft {
  const source = record(candidate) ?? {};
  const draft: JsonRecord = { ...(fallback ?? {}), ...source };

  if (groupItemCount(source.ingredientGroups, 'ingredients') === 0) {
    const aliasGroups = ingredientGroupsFrom(source.ingredients ?? source.recipeIngredient);
    draft.ingredientGroups = aliasGroups.length > 0 ? aliasGroups : fallback?.ingredientGroups ?? [];
  }
  if (groupItemCount(source.stepGroups, 'steps') === 0) {
    const aliasGroups = stepGroupsFrom(source.steps ?? source.instructions ?? source.recipeInstructions);
    draft.stepGroups = aliasGroups.length > 0 ? aliasGroups : fallback?.stepGroups ?? [];
  }

  draft.ingredientGroups = normalizeIngredientGroupIds(draft.ingredientGroups);
  draft.stepGroups = normalizeStepGroupIds(draft.stepGroups);

  draft.title = typeof source.title === 'string' && source.title.trim()
    ? source.title.trim()
    : fallback?.title ?? '';
  const servings = positiveInteger(source.servings) ?? fallback?.servings;
  if (servings) draft.servings = servings;
  else delete draft.servings;
  const yieldText = cleanText(source.yieldText) ?? fallback?.yieldText;
  if (yieldText) draft.yieldText = yieldText;
  else delete draft.yieldText;
  draft.category = typeof source.category === 'string' ? source.category : fallback?.category ?? 'favorites';
  draft.tags = Array.isArray(source.tags) ? source.tags : fallback?.tags ?? [];
  const provenance = record(source.provenance) ?? fallback?.provenance ?? {};
  draft.provenance = {
    ...provenance,
    sourceType,
    ...(sourceUrl ? { sourceUrl } : {}),
    confidence: typeof provenance.confidence === 'number' ? provenance.confidence : fallback ? 0.9 : 0.5,
  };

  return draft as NormalizedRecipeGraphDraft;
}

export function validateNormalizedRecipeGraph(draft: NormalizedRecipeGraphDraft): void {
  if (!draft.title) throw new Error('Extraction returned no title');
  if (groupItemCount(draft.ingredientGroups, 'ingredients') === 0) {
    throw new Error('Extraction returned no ingredients');
  }
  if (groupItemCount(draft.stepGroups, 'steps') === 0) {
    throw new Error('Extraction returned no steps');
  }
}
