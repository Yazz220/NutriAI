/**
 * Recipe Graph — the canonical structured recipe format for Nosh.
 *
 * This is the spine of the entire pipeline. It powers:
 * - Extraction: the AI model outputs this structure from any source (URL, image, video, text)
 * - Nosh reasoning: the assistant reads and mutates this (scale servings, substitute ingredients, update steps)
 * - The typesetter: the native renderer lays out the page from this data
 * - Search: finding recipes by ingredient, tag, cuisine, dietary info
 *
 * Design principles:
 * - Ingredients and steps are grouped (e.g., "For the dough" / "For the filling")
 * - Quantities are strings so fractions and ranges survive ("1/2", "2-3")
 * - Provenance tracks what was extracted vs. inferred by the model
 * - The graph is self-contained — it does not depend on cookbook or presentation types
 * - Backward compatible: a flat recipe (one ingredient group, one step group) is a valid graph
 */

// ---------------------------------------------------------------------------
// Category — culinary classification, independent of cookbook sections
// ---------------------------------------------------------------------------

export type RecipeCategory =
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'healthy'
  | 'desserts'
  | 'sides'
  | 'favorites';

export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

export type RecipeSourceType = 'url' | 'text' | 'image' | 'video' | 'audio' | 'manual';

export type RecipeQualityDecision = 'auto_publish' | 'publish_with_note' | 'needs_correction';
export type RecipeQualitySeverity = 'warning' | 'blocking';

export interface RecipeQualityIssue {
  key: string;
  code: string;
  severity: RecipeQualitySeverity;
  message: string;
  fieldPaths: string[];
  confirmed: boolean;
}

export interface RecipeQualityAssessment {
  version: number;
  decision: RecipeQualityDecision;
  issues: RecipeQualityIssue[];
  metrics: {
    ingredientCount: number;
    quantifiedIngredientCount: number;
    stepCount: number;
    hasYield: boolean;
    hasCookingTemperature: boolean;
    hasCookingDuration: boolean;
  };
}

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

/**
 * A single ingredient with optional preparation note.
 * Quantities are strings so fractions ("1/2"), ranges ("2-3"), and
 * vague amounts ("a pinch") survive intact.
 */
export interface RecipeIngredient {
  /** Display name, e.g., "all-purpose flour" */
  name: string;
  /** Exact ingredient line observed in the source before conservative parsing. */
  rawText?: string;
  /** Amount as a string, e.g., "1", "1/2", "2-3". Omitted if none specified. */
  quantity?: string;
  /** Unit, e.g., "cup", "tbsp", "g", "oz", "clove". */
  unit?: string;
  /** Preparation instruction, e.g., "finely chopped", "at room temperature", "divided". */
  preparation?: string;
  /** Whether this ingredient is optional. */
  isOptional?: boolean;
  /** When Nosh scales the recipe, the original quantity is preserved here. */
  originalQuantity?: string;
}

/**
 * A named group of ingredients.
 * Most recipes have one default group. Complex recipes have multiple:
 *   "For the dough" → [flour, water, salt, yeast]
 *   "For the filling" → [apples, sugar, cinnamon, butter]
 */
export interface IngredientGroup {
  /** Stable id for cross-referencing from step groups. */
  id: string;
  /** Group label. Undefined or empty = the default/ungrouped section. */
  label?: string;
  ingredients: RecipeIngredient[];
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

/**
 * A single instruction step.
 */
export interface RecipeStep {
  /** Stable id for referencing from Nosh tool calls. */
  id: string;
  /** The instruction text. */
  text: string;
  /** Optional heading for this step, e.g., "Prepare the dough". */
  heading?: string;
  /** Estimated time for this step in minutes, if specified. */
  durationMinutes?: number;
  /** Temperature if relevant, e.g., "350°F", "medium-high heat". */
  temperature?: string;
  /** Which ingredient group ids this step uses, for cross-referencing. */
  usesGroups?: string[];
}

/**
 * A named phase of the recipe.
 * Most recipes have one default phase. Complex recipes have multiple:
 *   "Make the dough" → [mix, knead, rest]
 *   "Assemble" → [roll, fill, fold]
 *   "Bake" → [preheat, bake, cool]
 */
export interface StepGroup {
  /** Stable id. */
  id: string;
  /** Phase label. Undefined or empty = the default/ungrouped phase. */
  label?: string;
  steps: RecipeStep[];
}

// ---------------------------------------------------------------------------
// Provenance — where the recipe came from and what was inferred
// ---------------------------------------------------------------------------

/**
 * Tracks the origin of the recipe and what the extraction model
 * inferred vs. read directly from the source. This drives the
 * "subtle notes" that appear on the page when the model had to guess.
 */
export interface RecipeProvenance {
  sourceType: RecipeSourceType;
  sourceUrl?: string;
  /** Publisher-declared canonical URL, kept separately from the URL the user submitted. */
  canonicalUrl?: string;
  sourceTitle?: string;
  sourceLanguage?: string;
  fetchedAt?: string;
  sourceContentHash?: string;
  parserId?: string;
  parserVersion?: number;
  confidenceMethod?: string;
  structuredDataId?: string;
  structuredRecipeCandidateCount?: number;
  structuredRecipeSelectionReason?: string;
  /** Original source attribution: blog name, channel name, cookbook title. */
  sourceAttribution?: string;
  /** Fields the model inferred rather than read directly, e.g., ["ovenTemperature", "servings"]. */
  inferredFields?: string[];
  /** Notes the model wants to surface about extraction confidence. */
  extractionNotes?: string[];
  /** Overall extraction confidence, 0–1. */
  confidence: number;
  /** Deterministic semantic checks run after extraction and before page generation. */
  qualityAssessment?: RecipeQualityAssessment;
  /** First blocking assessment, retained after correction for debugging and ingestion evals. */
  qualityInitialAssessment?: RecipeQualityAssessment;
  /** Exact issue keys the user reviewed and accepted in the correction surface. */
  qualityConfirmedIssueKeys?: string[];
}

// ---------------------------------------------------------------------------
// The Recipe Graph
// ---------------------------------------------------------------------------

/**
 * The canonical structured recipe.
 * This is what extraction produces, what Nosh reasons about,
 * and what the typesetter renders.
 */
export interface RecipeGraph {
  id: string;
  title: string;
  description?: string;

  // --- Core culinary data ---
  /** Numeric people-servings only. Omitted when the source yield is not a serving count. */
  servings?: number;
  /** Exact source yield, e.g., "Serves 6", "1 loaf", or "Makes 24 cookies". */
  yieldText?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  cuisine?: string;
  sourceCuisine?: string[];
  sourceCategory?: string[];
  category: RecipeCategory;
  difficulty?: RecipeDifficulty;

  // --- Grouped ingredients and steps ---
  ingredientGroups: IngredientGroup[];
  stepGroups: StepGroup[];

  // --- Rich metadata ---
  notes?: string[];
  equipment?: string[];
  tags: string[];
  dietaryTags?: string[];

  // --- Provenance ---
  provenance: RecipeProvenance;

  // --- Timestamps ---
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Draft (pre-persistence) — what extraction returns before saving
// ---------------------------------------------------------------------------

/**
 * The extraction model's output before it's persisted to the database.
 * No id or timestamps — those are assigned on save.
 */
export type RecipeGraphDraft = Omit<RecipeGraph, 'id' | 'createdAt' | 'updatedAt'>;

// ---------------------------------------------------------------------------
// Nosh tool-call types — what the assistant uses to mutate the graph
// ---------------------------------------------------------------------------

/** Scale all ingredient quantities by a ratio. */
export interface ScaleServingsTool {
  tool: 'scale_servings';
  targetServings: number;
}

/** Substitute one ingredient for another. */
export interface SubstituteIngredientTool {
  tool: 'substitute_ingredient';
  ingredientName: string;
  substituteName: string;
  /** Optional quantity override for the substitute. */
  substituteQuantity?: string;
  substituteUnit?: string;
  /** Culinary reasoning for the substitution. */
  reason?: string;
}

/** Start a cooking timer. */
export interface StartTimerTool {
  tool: 'start_timer';
  durationMinutes: number;
  label?: string;
}

/** Guide the user to the next step. */
export interface GuideNextStepTool {
  tool: 'guide_next_step';
  stepId: string;
}

/** Update the recipe graph in place (Nosh edits the page live). */
export interface UpdatePageDataTool {
  tool: 'update_page_data';
  /** JSON-patch-style operations on the recipe graph. */
  operations: RecipeGraphPatch[];
}

/** A single mutation to the recipe graph. */
export interface RecipeGraphPatch {
  /** JSON Pointer path, e.g., "/ingredientGroups/0/ingredients/2/quantity". */
  path: string;
  /** The new value, or null to delete. */
  value: unknown;
}

export type NoshToolCall =
  | ScaleServingsTool
  | SubstituteIngredientTool
  | StartTimerTool
  | GuideNextStepTool
  | UpdatePageDataTool;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Flatten grouped ingredients into a single list (for search, scaling, etc.). */
export function flattenIngredients(groups: IngredientGroup[]): RecipeIngredient[] {
  return groups.flatMap((group) => group.ingredients);
}

/** Flatten grouped steps into a single list. */
export function flattenSteps(groups: StepGroup[]): RecipeStep[] {
  return groups.flatMap((group) => group.steps);
}

/** Total ingredient count across all groups (used for layout density). */
export function totalIngredientCount(groups: IngredientGroup[]): number {
  return groups.reduce((sum, group) => sum + group.ingredients.length, 0);
}

/** Total step count across all groups (used for layout density). */
export function totalStepCount(groups: StepGroup[]): number {
  return groups.reduce((sum, group) => sum + group.steps.length, 0);
}

/**
 * Create a single-group recipe from flat ingredient/step arrays.
 * Useful for backward compatibility with the legacy flat format and
 * for simple recipes that don't need grouping.
 */
export function flatIngredientGroup(ingredients: RecipeIngredient[]): IngredientGroup {
  return { id: 'default', ingredients };
}

export function flatStepGroup(steps: RecipeStep[]): StepGroup {
  return { id: 'default', steps };
}

/**
 * Convert a legacy flat recipe (ingredients as array, steps as string array)
 * into a RecipeGraphDraft with single default groups.
 */
export function fromLegacyRecipe(legacy: {
  title: string;
  description?: string;
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  ingredients: Array<{ name: string; quantity?: string; unit?: string; isOptional?: boolean }>;
  steps: string[];
  sourceType?: string;
  sourceUrl?: string;
  tags?: string[];
  category?: string;
  confidence?: number;
}): RecipeGraphDraft {
  const ingredientGroups: IngredientGroup[] = [
    {
      id: 'default',
      ingredients: legacy.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        isOptional: ingredient.isOptional,
      })),
    },
  ];

  const stepGroups: StepGroup[] = [
    {
      id: 'default',
      steps: legacy.steps.map((text, index) => ({
        id: `step-${index}`,
        text,
      })),
    },
  ];

  const category: RecipeCategory = (legacy.category as RecipeCategory) ?? 'favorites';
  const sourceType: RecipeSourceType = (legacy.sourceType as RecipeSourceType) ?? 'text';

  return {
    title: legacy.title,
    description: legacy.description,
    servings: legacy.servings ?? 4,
    prepTimeMinutes: legacy.prepTime,
    cookTimeMinutes: legacy.cookTime,
    category,
    ingredientGroups,
    stepGroups,
    tags: legacy.tags ?? [],
    provenance: {
      sourceType,
      sourceUrl: legacy.sourceUrl,
      confidence: legacy.confidence ?? 0,
    },
  };
}
