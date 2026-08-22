type JsonRecord = Record<string, unknown>;

export interface NormalizedRecipeGraphDraft extends JsonRecord {
  title: string;
  servings: number;
  category: string;
  ingredientGroups: JsonRecord[];
  stepGroups: JsonRecord[];
  tags: string[];
  provenance: JsonRecord;
}

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(strings);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function instructionTexts(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(instructionTexts);
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  const item = record(value);
  if (!item) return [];
  const nested = instructionTexts(item.itemListElement ?? item.steps);
  if (nested.length > 0) return nested;
  return strings(item.text ?? item.name);
}

function integerFrom(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const match = strings(value).join(' ').match(/\d+/);
  return match ? Number(match[0]) : fallback;
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
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    const candidateRecord = record(candidate);
    if (typeof candidateRecord?.name === 'string' && candidateRecord.name.trim()) {
      return candidateRecord.name.trim();
    }
  }
  return undefined;
}

/** Build a complete safety-net draft from schema.org Recipe JSON-LD. */
export function recipeJsonLdToDraft(
  value: unknown,
  sourceUrl: string,
): NormalizedRecipeGraphDraft | null {
  const recipe = record(value);
  if (!recipe || typeof recipe.name !== 'string' || !recipe.name.trim()) return null;

  const ingredients = strings(recipe.recipeIngredient ?? recipe.ingredients);
  const steps = instructionTexts(recipe.recipeInstructions ?? recipe.instructions);
  if (ingredients.length === 0 || steps.length === 0) return null;

  const keywords = strings(recipe.keywords)
    .flatMap((keyword) => keyword.split(','))
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const attribution = attributionFrom(recipe);

  return {
    title: recipe.name.trim(),
    ...(typeof recipe.description === 'string' ? { description: recipe.description.replace(/<[^>]+>/g, '').trim() } : {}),
    servings: Math.max(1, integerFrom(recipe.recipeYield, 1)),
    ...(minutesFromIsoDuration(recipe.prepTime) !== undefined
      ? { prepTimeMinutes: minutesFromIsoDuration(recipe.prepTime) }
      : {}),
    ...(minutesFromIsoDuration(recipe.cookTime) !== undefined
      ? { cookTimeMinutes: minutesFromIsoDuration(recipe.cookTime) }
      : {}),
    ...(strings(recipe.recipeCuisine)[0] ? { cuisine: strings(recipe.recipeCuisine)[0] } : {}),
    category: categoryFrom(recipe.recipeCategory),
    ingredientGroups: [{
      id: 'default',
      label: '',
      ingredients: ingredients.map((name) => ({ name })),
    }],
    stepGroups: [{
      id: 'default',
      label: '',
      steps: steps.map((text, index) => ({ id: `step-${index + 1}`, text })),
    }],
    tags: keywords,
    provenance: {
      sourceType: 'url',
      sourceUrl,
      ...(attribution ? { sourceAttribution: attribution } : {}),
      inferredFields: [],
      extractionNotes: [
        'Nosh used the structured recipe data supplied by this site. Review quantities before saving.',
      ],
      confidence: 0.9,
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

  draft.title = typeof source.title === 'string' && source.title.trim()
    ? source.title.trim()
    : fallback?.title ?? '';
  draft.servings = Math.max(1, integerFrom(source.servings, fallback?.servings ?? 1));
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
