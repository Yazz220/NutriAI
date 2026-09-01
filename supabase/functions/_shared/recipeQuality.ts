type JsonRecord = Record<string, unknown>;

export const RECIPE_QUALITY_ASSESSMENT_VERSION = 1;

export const RECIPE_QUALITY_ISSUE_CODES = [
  'blank_ingredient',
  'blank_instruction',
  'missing_ingredient_quantities',
  'low_ingredient_quantity_coverage',
  'missing_baking_temperature',
  'missing_cooking_duration',
  'serving_yield_conflict',
  'invalid_recipe_time',
  'inconsistent_recipe_time',
  'critical_field_inferred',
] as const;

export type RecipeQualityIssueCode = typeof RECIPE_QUALITY_ISSUE_CODES[number];
export type RecipeQualitySeverity = 'warning' | 'blocking';
export type RecipeQualityDecision = 'auto_publish' | 'publish_with_note' | 'needs_correction';

export interface RecipeQualityIssue {
  key: string;
  code: RecipeQualityIssueCode;
  severity: RecipeQualitySeverity;
  message: string;
  fieldPaths: string[];
  confirmed: boolean;
}

export interface RecipeQualityMetrics {
  ingredientCount: number;
  quantifiedIngredientCount: number;
  stepCount: number;
  hasYield: boolean;
  hasCookingTemperature: boolean;
  hasCookingDuration: boolean;
}

export interface RecipeQualityAssessment {
  version: number;
  decision: RecipeQualityDecision;
  issues: RecipeQualityIssue[];
  metrics: RecipeQualityMetrics;
}

export interface RecipeQualityCandidate extends JsonRecord {
  title?: unknown;
  servings?: unknown;
  yieldText?: unknown;
  prepTimeMinutes?: unknown;
  cookTimeMinutes?: unknown;
  totalTimeMinutes?: unknown;
  ingredientGroups?: unknown;
  stepGroups?: unknown;
  provenance?: unknown;
}

interface IndexedRecord {
  value: JsonRecord;
  path: string;
}

const QUANTITY_PREFIX = /^\s*(?:\d|[¼½¾⅓⅔⅛⅜⅝⅞]|a\s+(?:pinch|dash|handful|sprig|bunch)\b)/i;
const QUANTITY_EXEMPTION = /\b(?:to taste|as needed|as desired|for garnish|for serving|optional)\b/i;
const BAKING_ACTION = /\b(?:bake|baked|baking|roast|roasted|roasting|preheat|oven)\b/i;
const COOKING_ACTION = /\b(?:bake|roast|boil|simmer|steam|fry|cook|grill|broil|poach|braise|sauté|saute)\b/i;
const EXPLICIT_TEMPERATURE = /(?:\b\d{2,3}\s*(?:°|degrees?\s*)?(?:f|c|fahrenheit|celsius)\b|\bgas\s+mark\s+\d+\b)/i;
const EXPLICIT_DURATION = /\b\d+(?:\s*(?:-|–|to)\s*\d+)?\s*(?:seconds?|secs?|minutes?|mins?|hours?|hrs?)\b/i;
const CRITICAL_INFERRED_FIELD = /(?:ingredientgroups.*(?:name|quantity|unit)|stepgroups|temperature|(?:prep|cook|total)time|servings|yield)/i;
const USER_CONFIRMABLE_ISSUES = new Set<RecipeQualityIssueCode>(['critical_field_inferred']);

function record(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function indexedItems(groups: unknown, itemKey: 'ingredients' | 'steps'): IndexedRecord[] {
  if (!Array.isArray(groups)) return [];
  return groups.flatMap((group, groupIndex) => {
    const groupRecord = record(group);
    const items = groupRecord?.[itemKey];
    if (!Array.isArray(items)) return [];
    return items.flatMap((item, itemIndex) => {
      const itemRecord = record(item);
      return itemRecord
        ? [{ value: itemRecord, path: `${itemKey === 'ingredients' ? 'ingredientGroups' : 'stepGroups'}.${groupIndex}.${itemKey}.${itemIndex}` }]
        : [];
    });
  });
}

function confirmedIssueKeys(candidate: RecipeQualityCandidate): Set<string> {
  const provenance = record(candidate.provenance);
  const values = provenance?.qualityConfirmedIssueKeys;
  return new Set(Array.isArray(values)
    ? values.filter((value): value is string => typeof value === 'string')
    : []);
}

function issueKey(code: RecipeQualityIssueCode, fieldPaths: string[]): string {
  return `${code}:${[...fieldPaths].sort().join('|')}`;
}

function makeIssue(
  code: RecipeQualityIssueCode,
  severity: RecipeQualitySeverity,
  message: string,
  fieldPaths: string[],
  confirmed: Set<string>,
): RecipeQualityIssue {
  const key = issueKey(code, fieldPaths);
  return {
    key,
    code,
    severity,
    message,
    fieldPaths,
    confirmed: USER_CONFIRMABLE_ISSUES.has(code) && confirmed.has(key),
  };
}

function hasIngredientQuantity(ingredient: JsonRecord): boolean {
  if (nonEmptyString(ingredient.quantity)) return true;
  const rawText = nonEmptyString(ingredient.rawText);
  return Boolean(rawText && QUANTITY_PREFIX.test(rawText));
}

function isQuantityExempt(ingredient: JsonRecord): boolean {
  if (ingredient.isOptional === true) return true;
  const text = [ingredient.name, ingredient.rawText, ingredient.preparation]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return QUANTITY_EXEMPTION.test(text);
}

function explicitServingYield(value: unknown): number | undefined {
  const text = nonEmptyString(value);
  if (!text) return undefined;
  const match = text.match(/^\s*(?:yield\s*:?\s*)?(?:serves?|servings?)\s*:?\s*(\d+)\s*$/i)
    ?? text.match(/^\s*(\d+)\s+servings?\s*$/i)
    ?? text.match(/^\s*makes?\s+(\d+)\s+servings?\s*$/i);
  return match ? Number(match[1]) : undefined;
}

function validOptionalMinutes(value: unknown): boolean {
  return value === undefined
    || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_080);
}

function numericMinutes(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : undefined;
}

export function assessRecipeQuality(candidate: RecipeQualityCandidate): RecipeQualityAssessment {
  const confirmed = confirmedIssueKeys(candidate);
  const ingredients = indexedItems(candidate.ingredientGroups, 'ingredients');
  const steps = indexedItems(candidate.stepGroups, 'steps');
  const issues: RecipeQualityIssue[] = [];

  const blankIngredients = ingredients
    .filter((ingredient) => !nonEmptyString(ingredient.value.name))
    .map((ingredient) => `${ingredient.path}.name`);
  if (blankIngredients.length > 0) {
    issues.push(makeIssue(
      'blank_ingredient',
      'blocking',
      'One or more ingredient names are blank.',
      blankIngredients,
      confirmed,
    ));
  }

  const blankSteps = steps
    .filter((step) => !nonEmptyString(step.value.text))
    .map((step) => `${step.path}.text`);
  if (blankSteps.length > 0) {
    issues.push(makeIssue(
      'blank_instruction',
      'blocking',
      'One or more cooking directions are blank.',
      blankSteps,
      confirmed,
    ));
  }

  const quantityCandidates = ingredients.filter((ingredient) => (
    nonEmptyString(ingredient.value.name) && !isQuantityExempt(ingredient.value)
  ));
  const quantifiedIngredients = quantityCandidates.filter((ingredient) => hasIngredientQuantity(ingredient.value));
  if (quantityCandidates.length >= 2 && quantifiedIngredients.length === 0) {
    issues.push(makeIssue(
      'missing_ingredient_quantities',
      'blocking',
      'The ingredient list has no usable amounts. Add the quantities shown in the source, or confirm the list as written.',
      quantityCandidates.map((ingredient) => `${ingredient.path}.quantity`),
      confirmed,
    ));
  } else if (
    quantityCandidates.length >= 4
    && quantifiedIngredients.length / quantityCandidates.length < 0.5
  ) {
    issues.push(makeIssue(
      'low_ingredient_quantity_coverage',
      'warning',
      'Several ingredients do not include amounts.',
      quantityCandidates
        .filter((ingredient) => !hasIngredientQuantity(ingredient.value))
        .map((ingredient) => `${ingredient.path}.quantity`),
      confirmed,
    ));
  }

  const stepText = steps
    .map((step) => [step.value.text, step.value.temperature].filter((value) => typeof value === 'string').join(' '))
    .join(' ');
  const hasCookingTemperature = EXPLICIT_TEMPERATURE.test(stepText);
  if (BAKING_ACTION.test(stepText) && !hasCookingTemperature) {
    issues.push(makeIssue(
      'missing_baking_temperature',
      'blocking',
      'The method uses an oven but does not include an oven temperature.',
      steps.filter((step) => BAKING_ACTION.test(String(step.value.text ?? ''))).map((step) => `${step.path}.text`),
      confirmed,
    ));
  }

  const hasStepDuration = steps.some((step) => (
    typeof step.value.durationMinutes === 'number' && step.value.durationMinutes >= 0
  )) || EXPLICIT_DURATION.test(stepText);
  const hasCookingDuration = hasStepDuration
    || numericMinutes(candidate.cookTimeMinutes) !== undefined
    || numericMinutes(candidate.totalTimeMinutes) !== undefined;
  if (COOKING_ACTION.test(stepText) && !hasCookingDuration) {
    issues.push(makeIssue(
      'missing_cooking_duration',
      'warning',
      'The method does not include a cooking duration.',
      steps.filter((step) => COOKING_ACTION.test(String(step.value.text ?? ''))).map((step) => `${step.path}.text`),
      confirmed,
    ));
  }

  const servings = typeof candidate.servings === 'number' && Number.isInteger(candidate.servings)
    ? candidate.servings
    : undefined;
  const yieldServings = explicitServingYield(candidate.yieldText);
  if (servings && yieldServings && servings !== yieldServings) {
    issues.push(makeIssue(
      'serving_yield_conflict',
      'blocking',
      `The serving count says ${servings}, but the recipe yield says ${yieldServings}.`,
      ['servings', 'yieldText'],
      confirmed,
    ));
  }

  const timeFields = [
    ['prepTimeMinutes', candidate.prepTimeMinutes],
    ['cookTimeMinutes', candidate.cookTimeMinutes],
    ['totalTimeMinutes', candidate.totalTimeMinutes],
  ] as const;
  const invalidTimePaths = timeFields
    .filter(([, value]) => !validOptionalMinutes(value))
    .map(([field]) => field);
  if (invalidTimePaths.length > 0) {
    issues.push(makeIssue(
      'invalid_recipe_time',
      'blocking',
      'One or more recipe times are not valid minute values.',
      invalidTimePaths,
      confirmed,
    ));
  }

  const prepTime = numericMinutes(candidate.prepTimeMinutes);
  const cookTime = numericMinutes(candidate.cookTimeMinutes);
  const totalTime = numericMinutes(candidate.totalTimeMinutes);
  if (totalTime !== undefined && (
    (prepTime !== undefined && totalTime < prepTime)
    || (cookTime !== undefined && totalTime < cookTime)
  )) {
    issues.push(makeIssue(
      'inconsistent_recipe_time',
      'blocking',
      'The total time is shorter than one of the recipe stages.',
      ['prepTimeMinutes', 'cookTimeMinutes', 'totalTimeMinutes'],
      confirmed,
    ));
  } else if (
    totalTime !== undefined
    && prepTime !== undefined
    && cookTime !== undefined
    && totalTime < prepTime + cookTime
  ) {
    issues.push(makeIssue(
      'inconsistent_recipe_time',
      'warning',
      'The total time is shorter than prep time and cook time combined.',
      ['prepTimeMinutes', 'cookTimeMinutes', 'totalTimeMinutes'],
      confirmed,
    ));
  }

  const provenance = record(candidate.provenance);
  const inferredFields = Array.isArray(provenance?.inferredFields)
    ? provenance.inferredFields.filter((value): value is string => typeof value === 'string')
    : [];
  const criticalInferences = inferredFields.filter((field) => CRITICAL_INFERRED_FIELD.test(field));
  if (criticalInferences.length > 0) {
    issues.push(makeIssue(
      'critical_field_inferred',
      'warning',
      'Folio normalized a cooking detail that was not explicit in the source.',
      criticalInferences,
      confirmed,
    ));
  }

  const hasOpenBlockingIssue = issues.some((issue) => issue.severity === 'blocking' && !issue.confirmed);
  const decision: RecipeQualityDecision = hasOpenBlockingIssue
    ? 'needs_correction'
    : issues.length > 0
      ? 'publish_with_note'
      : 'auto_publish';

  return {
    version: RECIPE_QUALITY_ASSESSMENT_VERSION,
    decision,
    issues,
    metrics: {
      ingredientCount: ingredients.length,
      quantifiedIngredientCount: quantifiedIngredients.length,
      stepCount: steps.length,
      hasYield: Boolean(nonEmptyString(candidate.yieldText) || servings),
      hasCookingTemperature,
      hasCookingDuration,
    },
  };
}

export function withRecipeQualityAssessment<T extends RecipeQualityCandidate>(
  candidate: T,
  assessment: RecipeQualityAssessment,
): T {
  const provenance = record(candidate.provenance) ?? {};
  const previousAssessment = readRecipeQualityAssessment(candidate);
  const initialAssessment = record(provenance.qualityInitialAssessment)
    ?? (previousAssessment?.decision === 'needs_correction' ? previousAssessment : null);
  return {
    ...candidate,
    provenance: {
      ...provenance,
      ...(initialAssessment ? { qualityInitialAssessment: initialAssessment } : {}),
      qualityAssessment: assessment,
    },
  } as T;
}

export function confirmRecipeQualityIssues<T extends RecipeQualityCandidate>(
  candidate: T,
  issueKeys: string[],
): T {
  const provenance = record(candidate.provenance) ?? {};
  const existing = Array.isArray(provenance.qualityConfirmedIssueKeys)
    ? provenance.qualityConfirmedIssueKeys.filter((value): value is string => typeof value === 'string')
    : [];
  return {
    ...candidate,
    provenance: {
      ...provenance,
      qualityConfirmedIssueKeys: [...new Set([...existing, ...issueKeys])],
    },
  } as T;
}

export function readRecipeQualityAssessment(
  candidate: RecipeQualityCandidate | null | undefined,
): RecipeQualityAssessment | null {
  const provenance = record(candidate?.provenance);
  const assessment = record(provenance?.qualityAssessment);
  if (
    assessment?.version !== RECIPE_QUALITY_ASSESSMENT_VERSION
    || !['auto_publish', 'publish_with_note', 'needs_correction'].includes(String(assessment.decision))
    || !Array.isArray(assessment.issues)
    || !record(assessment.metrics)
  ) return null;
  return assessment as unknown as RecipeQualityAssessment;
}
