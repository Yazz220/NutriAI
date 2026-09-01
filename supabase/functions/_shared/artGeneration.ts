import { COOKBOOK_GEOMETRY } from '../../../constants/cookbookGeometry.ts';
import {
  compileRecipePageStyleDescriptor,
  isRecipePageStyleId,
  isRecipePageStyleVersion,
  resolveLatestRecipePageStyle,
  resolveRecipePageStyleVersion,
  type RecipePageDensity,
  type RecipePageStyleId,
} from '../../../constants/recipePageStyles.ts';
import { cookbookRecipeDescription, cookbookRecipeNotes } from './canonicalRecipe.ts';
import { RECIPE_PAGE_GENERATION_STAGE_VERSION } from './captureStages.ts';

export { isRecipePageStyleId, isRecipePageStyleVersion } from '../../../constants/recipePageStyles.ts';

export interface RecipePageIngredient {
  name?: string;
  rawText?: string;
  quantity?: string;
  unit?: string;
  preparation?: string;
  isOptional?: boolean;
}

export interface RecipePageIngredientGroup {
  label?: string;
  ingredients?: RecipePageIngredient[];
}

export interface RecipePageStep {
  heading?: string;
  text?: string;
  durationMinutes?: number;
  temperature?: string;
}

export interface RecipePageStepGroup {
  label?: string;
  steps?: RecipePageStep[];
}

export interface RecipePageRecipeInput {
  title: string;
  cuisine?: string;
  description?: string;
  servings?: number;
  yieldText?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  ingredientGroups?: RecipePageIngredientGroup[];
  stepGroups?: RecipePageStepGroup[];
  notes?: string[];
}

export interface RecipePageCopy {
  title: string;
  description?: string;
  metadata: string[];
  ingredientGroups: Array<{ label?: string; lines: string[] }>;
  stepGroups: Array<{ label?: string; steps: string[] }>;
  notes: string[];
}

export interface RecipePagePromptPayload {
  kind: 'complete-recipe-page';
  generationContractVersion: typeof RECIPE_PAGE_GENERATION_STAGE_VERSION;
  geometryId: typeof COOKBOOK_GEOMETRY.id;
  geometryRevision: typeof COOKBOOK_GEOMETRY.revision;
  styleId: RecipePageStyleId;
  styleRevision: number;
  density: RecipePageDensity;
  styleDescriptor: string;
  recipe: RecipePageCopy;
  output: {
    aspectRatio: typeof COOKBOOK_GEOMETRY.generation.aspectRatio;
    resolution: typeof COOKBOOK_GEOMETRY.generation.resolution;
  };
  pageInstructions: string;
  styleReferences: string[];
}

function clean(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function ingredientLine(ingredient: RecipePageIngredient): string | undefined {
  const name = clean(ingredient.name);
  if (!name) return undefined;
  const amount = [clean(ingredient.quantity), clean(ingredient.unit)].filter(Boolean).join(' ');
  const preparation = clean(ingredient.preparation);
  const optional = ingredient.isOptional ? 'optional' : undefined;
  const detail = [preparation, optional].filter(Boolean).join(', ');
  return `${amount ? `${amount} ` : ''}${name}${detail ? `, ${detail}` : ''}`;
}

function stepLine(step: RecipePageStep, index: number): string | undefined {
  const text = clean(step.text);
  if (!text) return undefined;
  const heading = clean(step.heading);
  const cues = [
    step.durationMinutes ? `${step.durationMinutes} min` : undefined,
    clean(step.temperature),
  ].filter(Boolean).join(' · ');
  return `${index + 1}. ${heading ? `${heading}: ` : ''}${text}${cues ? ` [${cues}]` : ''}`;
}

export function buildRecipePageCopy(graph: RecipePageRecipeInput): RecipePageCopy {
  const metadata = [
    clean(graph.yieldText) ?? (graph.servings ? `Serves ${graph.servings}` : undefined),
    graph.prepTimeMinutes ? `Prep ${graph.prepTimeMinutes} min` : undefined,
    graph.cookTimeMinutes ? `Cook ${graph.cookTimeMinutes} min` : undefined,
    graph.totalTimeMinutes ? `Total ${graph.totalTimeMinutes} min` : undefined,
  ].filter((value): value is string => Boolean(value));

  return {
    title: graph.title.trim(),
    description: cookbookRecipeDescription(graph.description),
    metadata,
    ingredientGroups: (graph.ingredientGroups ?? []).map((group) => ({
      label: clean(group.label),
      lines: (group.ingredients ?? [])
        .map(ingredientLine)
        .filter((value): value is string => Boolean(value)),
    })).filter((group) => group.lines.length > 0),
    stepGroups: (graph.stepGroups ?? []).map((group) => ({
      label: clean(group.label),
      steps: (group.steps ?? [])
        .map(stepLine)
        .filter((value): value is string => Boolean(value)),
    })).filter((group) => group.steps.length > 0),
    notes: cookbookRecipeNotes(graph.notes),
  };
}

export function resolveRecipePageDensity(copy: RecipePageCopy): RecipePageDensity {
  const ingredientCount = copy.ingredientGroups.reduce((sum, group) => sum + group.lines.length, 0);
  const stepCount = copy.stepGroups.reduce((sum, group) => sum + group.steps.length, 0);

  if (ingredientCount <= 6 && stepCount <= 4) return 'sparse';
  if (ingredientCount <= 12 && stepCount <= 8) return 'standard';
  return 'dense';
}

function renderExactCopy(copy: RecipePageCopy): string {
  const sections: string[] = [
    `TITLE\n${copy.title}`,
    copy.description ? `DESCRIPTION\n${copy.description}` : '',
    copy.metadata.length > 0 ? `RECIPE DETAILS\n${copy.metadata.join(' | ')}` : '',
    ...copy.ingredientGroups.map((group) => [
      `INGREDIENTS${group.label ? ` - ${group.label}` : ''}`,
      ...group.lines.map((line) => `• ${line}`),
    ].join('\n')),
    ...copy.stepGroups.map((group) => [
      `METHOD${group.label ? ` - ${group.label}` : ''}`,
      ...group.steps,
    ].join('\n')),
    copy.notes.length > 0 ? `NOTES\n${copy.notes.map((note) => `• ${note}`).join('\n')}` : '',
  ];
  return sections.filter(Boolean).join('\n\n');
}

export function buildRecipePagePrompt(
  graph: RecipePageRecipeInput,
  styleId: string,
  options: {
    styleRevision?: number;
    visualDirection?: string;
    styleReferences?: string[];
  } = {},
): { prompt: string; payload: RecipePagePromptPayload } {
  if (!isRecipePageStyleId(styleId)) throw new Error(`Unsupported recipe page style ${styleId}`);

  const fallbackRevision = resolveLatestRecipePageStyle(styleId).revision;
  const styleRevision = options.styleRevision ?? fallbackRevision;
  const style = resolveRecipePageStyleVersion(styleId, styleRevision);
  if (!style) throw new Error(`Unsupported recipe page style version ${styleId}@${styleRevision}`);

  const copy = buildRecipePageCopy(graph);
  const density = resolveRecipePageDensity(copy);
  const exactCopy = renderExactCopy(copy);
  const visualDirection = clean(options.visualDirection);
  const styleReferences = (options.styleReferences ?? [])
    .filter((url) => /^https:\/\//i.test(url))
    .slice(0, 4);
  const styleDescriptor = compileRecipePageStyleDescriptor(style, density);
  const pageInstructions = [
    `Create one finished, flat, portrait cookbook page in the canonical ${COOKBOOK_GEOMETRY.generation.aspectRatio} aspect ratio.`,
    'The result is the page itself, not a photograph, mockup, open book, loose sheet, or framed poster.',
    'Fill the entire output canvas; the canvas edges are the physical page edges.',
    'Do not place a smaller page inside the canvas, leave blank outer padding, add a drop shadow, or show a surrounding background.',
    'Typeset every supplied line exactly once. Preserve all quantities, units, times, and temperatures.',
    'Do not invent, omit, paraphrase, duplicate, or reorder recipe content.',
    'Never print extraction analysis, confidence, provenance, source limitations, missing-information commentary, or comments about how Folio understood the recipe.',
    'Use a clear hierarchy and text large enough to read on an iPhone.',
    'Keep all text and important artwork inside a generous safe margin.',
    'Include a compelling finished-dish visual in the exact medium required by the locked style contract.',
    'Treat the locked style contract as a publishing system: follow its typography, palette, image medium, spacing, graphic language, signature cue, composition, and exclusions.',
    'Do not drift toward a generic warm-paper serif cookbook aesthetic when the style contract specifies another direction.',
    'The style changes presentation only. It must never change the recipe copy or canonical page geometry.',
    'Do not print a page number because recipes may be reordered later.',
    visualDirection ? `Requested visual adjustment: ${visualDirection}. Keep the cookbook identity unchanged.` : '',
  ].filter(Boolean).join(' ');

  const prompt = [
    pageInstructions,
    `Locked cookbook identity ${style.id}, immutable revision ${style.revision}: ${styleDescriptor}.`,
    styleReferences.length > 0
      ? 'Use the supplied reference images only for visual identity, paper, palette, image language, and publishing character. Never copy their recipe content.'
      : '',
    'Render this exact recipe copy:',
    '--- BEGIN EXACT COPY ---',
    exactCopy,
    '--- END EXACT COPY ---',
  ].filter(Boolean).join('\n\n');

  return {
    prompt,
    payload: {
      kind: 'complete-recipe-page',
      generationContractVersion: RECIPE_PAGE_GENERATION_STAGE_VERSION,
      geometryId: COOKBOOK_GEOMETRY.id,
      geometryRevision: COOKBOOK_GEOMETRY.revision,
      styleId,
      styleRevision,
      density,
      styleDescriptor,
      recipe: copy,
      output: {
        aspectRatio: COOKBOOK_GEOMETRY.generation.aspectRatio,
        resolution: COOKBOOK_GEOMETRY.generation.resolution,
      },
      pageInstructions,
      styleReferences,
    },
  };
}

export function stableCookbookSeed(cookbookId: string): number {
  let hash = 2166136261;
  for (let index = 0; index < cookbookId.length; index += 1) {
    hash ^= cookbookId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 2147483647 || 1;
}

export function buildOpenRouterImageRequest(
  model: string,
  prompt: string,
  seed?: number,
  styleReferences: string[] = [],
): Record<string, unknown> {
  const request: Record<string, unknown> = {
    model,
    prompt,
    aspect_ratio: COOKBOOK_GEOMETRY.generation.aspectRatio,
    resolution: COOKBOOK_GEOMETRY.generation.resolution,
    n: 1,
  };

  if (seed !== undefined) request.seed = seed;

  if (styleReferences.length > 0) {
    request.input_references = styleReferences.slice(0, 4).map((url) => ({
      type: 'image_url',
      image_url: { url },
    }));
  }

  return request;
}
