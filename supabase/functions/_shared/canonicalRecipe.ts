type JsonRecord = Record<string, unknown>;

const CANONICAL_RECIPE_FIELDS = [
  'id',
  'title',
  'servings',
  'yieldText',
  'prepTimeMinutes',
  'cookTimeMinutes',
  'totalTimeMinutes',
  'cuisine',
  'category',
  'difficulty',
  'ingredientGroups',
  'stepGroups',
  'equipment',
  'tags',
  'dietaryTags',
  'createdAt',
  'updatedAt',
] as const;

const EXTRACTION_COMMENTARY = [
  /\b(?:recipe )?(?:source|transcript|extraction|confidence|provenance)\b/i,
  /\b(?:amount|quantity|time|temperature|yield|servings?|detail|information|ingredient|instruction|method) (?:was |is )?(?:not|wasn't|isn't) (?:explicitly )?(?:stated|specified|shown|provided|clear)\b/i,
  /\b(?:could not|couldn't|unable to) (?:determine|confirm|verify|extract|read)\b/i,
  /\b(?:inferred|assumed|estimated) (?:from|because|based on)\b/i,
  /\b(?:Folio|Nosh) (?:read|found|used|inferred|assumed|could|was unable)\b/i,
  /\b(?:image|photo|video|audio) (?:quality|was unclear|did not|does not)\b/i,
];

export function isCookbookRecipeNote(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  return !EXTRACTION_COMMENTARY.some((pattern) => pattern.test(value));
}

export function cookbookRecipeNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isCookbookRecipeNote)
    .map((note) => note.trim())
    .slice(0, 4);
}

export function cookbookRecipeDescription(value: unknown): string | undefined {
  return isCookbookRecipeNote(value) ? value.trim() : undefined;
}

/**
 * Projects an internal extraction record into the cooking data owned by a
 * cookbook page. Source evidence, confidence, and quality diagnostics remain
 * on the durable capture rather than becoming recipe copy.
 */
export function toCanonicalCookbookRecipe(graph: JsonRecord): JsonRecord {
  const recipe: JsonRecord = {};
  for (const field of CANONICAL_RECIPE_FIELDS) {
    if (graph[field] !== undefined) recipe[field] = graph[field];
  }

  const description = cookbookRecipeDescription(graph.description);
  if (description) recipe.description = description;

  const notes = cookbookRecipeNotes(graph.notes);
  if (notes.length > 0) recipe.notes = notes;
  return recipe;
}
