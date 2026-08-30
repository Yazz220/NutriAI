import { COOKBOOK_GEOMETRY } from '../../../constants/cookbookGeometry.ts';
import { RECIPE_PAGE_GENERATION_STAGE_VERSION } from './captureStages.ts';

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
  styleId: string;
  styleRevision: number;
  styleDescriptor: string;
  recipe: RecipePageCopy;
  output: {
    aspectRatio: typeof COOKBOOK_GEOMETRY.generation.aspectRatio;
    resolution: typeof COOKBOOK_GEOMETRY.generation.resolution;
  };
  pageInstructions: string;
  styleReferences: string[];
}

interface RecipePageStyleProfile {
  revision: number;
  paper: string;
  typography: string;
  illustration: string;
  palette: string;
  composition: string;
}

export const RECIPE_PAGE_STYLE_PROFILES: Record<string, RecipePageStyleProfile> = {
  illustrated: {
    revision: 1,
    paper: 'warm alabaster paper with a subtle natural tooth and pristine finish',
    typography: 'elegant warm serif display titles with calm, highly legible editorial sans-serif recipe text',
    illustration: 'refined hand-drawn black ink food illustration with delicate translucent watercolor and natural ingredient detail',
    palette: 'warm alabaster, muted sage green, restrained ochre, food-led natural color, and black ink',
    composition: 'airy contemporary cookbook publishing with generous safe margins, a balanced ingredient-and-method grid, and one integrated food illustration',
  },
  'studio-editorial': {
    revision: 1,
    paper: 'clean warm-white paper with a smooth premium editorial finish',
    typography: 'confident high-contrast serif display titles with precise modern sans-serif recipe text and crisp uppercase labels',
    illustration: 'appetizing realistic overhead culinary photography with natural texture and restrained styling',
    palette: 'warm white, charcoal black, food-led natural color, and one restrained terracotta accent',
    composition: 'disciplined contemporary culinary-magazine grid with strong hierarchy, generous whitespace, and an integrated photographic hero',
  },
  heritage: {
    revision: 1,
    paper: 'pristine warm parchment with a subtle archival tooth and no stains or distressing',
    typography: 'dignified heritage serif display titles with traditional but highly readable cookbook body type',
    illustration: 'refined engraved copperplate-style food artwork with controlled cross-hatching and accurate dish detail',
    palette: 'warm parchment, deep umber ink, restrained antique gold rules, and muted food-led color',
    composition: 'refined archival cookbook publishing with balanced columns, quiet classical ornament, generous margins, and modern legibility',
  },
  'vintage-garden': {
    revision: 1,
    paper: 'warm alabaster paper with a subtle natural tooth',
    typography: 'classic cookbook serif display type with restrained editorial body type',
    illustration: 'fine black ink line drawing with a restrained watercolor wash',
    palette: 'warm alabaster, faded olive, muted ochre, and black ink',
    composition: 'timeless kitchen publishing with a quiet vintage border and generous margins',
  },
  handwritten: {
    revision: 1,
    paper: 'clean alabaster paper with a soft handmade texture',
    typography: 'warm classic serif titles with calm, highly legible editorial body type',
    illustration: 'loose botanical black ink linework with soft watercolor accents',
    palette: 'alabaster, leaf green, warm butterscotch, and black ink',
    composition: 'airy garden-table publishing with botanical details and generous white space',
  },
  editorial: {
    revision: 1,
    paper: 'warm alabaster paper with subtle print texture',
    typography: 'confident classic serif titles with refined editorial body type',
    illustration: 'refined black ink food illustration with subtle tonal shading',
    palette: 'warm alabaster, charcoal, and soft stone gray',
    composition: 'classic family cookbook publishing with restrained ornament and clear columns',
  },
  watercolor: {
    revision: 1,
    paper: 'clean white paper with a gentle deckled-paper impression',
    typography: 'friendly serif titles with simple, readable cookbook body type',
    illustration: 'delicate black ink contour drawing with translucent watercolor washes',
    palette: 'clean white, soft blush, warm caramel, and black ink',
    composition: 'beloved family-recipe publishing with gentle imperfections and centered balance',
  },
  rustic: {
    revision: 1,
    paper: 'warm notebook-like alabaster paper',
    typography: 'heritage serif titles with compact, legible recipe typography',
    illustration: 'expressive black ink kitchen sketch with dry-brush texture',
    palette: 'warm alabaster, charcoal, and weathered gray',
    composition: 'kitchen journal publishing with a notebook margin and practical organization',
  },
  minimal: {
    revision: 1,
    paper: 'bright clean white paper',
    typography: 'precise contemporary titles with crisp modern recipe typography',
    illustration: 'precise contemporary line illustration with restrained flat color',
    palette: 'clean white, black, and pale sky blue',
    composition: 'minimal modern publishing with a strict grid and generous negative space',
  },
  'sage-linen': {
    revision: 1,
    paper: 'alabaster paper with a faint natural fiber texture',
    typography: 'classic serif display titles with refined old-world cookbook body type',
    illustration: 'fine botanical black ink linework with delicate watercolor accents',
    palette: 'alabaster, muted sage green, restrained antique gold, and black ink',
    composition: 'refined garden cookbook publishing with botanical corner details and balanced columns',
  },
  'terracotta-cloth': {
    revision: 1,
    paper: 'warm cream paper with a sun-aged natural texture',
    typography: 'warm Mediterranean serif titles with elegant, readable recipe typography',
    illustration: 'confident ink food illustration with sun-washed watercolor pigment',
    palette: 'warm cream, terracotta, copper, muted olive, and dark brown ink',
    composition: 'sun-warmed Mediterranean publishing with relaxed geometry and copper accents',
  },
  'navy-leather': {
    revision: 1,
    paper: 'deep parchment paper with a refined matte texture',
    typography: 'refined brasserie display type with crisp, high-contrast recipe typography',
    illustration: 'controlled charcoal and ink food illustration with subtle tonal shading',
    palette: 'deep parchment, midnight navy, restrained silver gray, and charcoal',
    composition: 'late-night bistro publishing with structured columns and discreet silver rules',
  },
  'charcoal-cloth': {
    revision: 1,
    paper: 'soft alabaster paper with a smooth editorial finish',
    typography: 'confident modern serif titles with disciplined recipe typography',
    illustration: 'bold economical black ink illustration with one restrained metallic accent',
    palette: 'alabaster, charcoal, antique gold, and black ink',
    composition: 'modern bistro publishing with strong hierarchy and minimal ornament',
  },
  'alabaster-linen': {
    revision: 1,
    paper: 'pale alabaster paper with a light woven texture',
    typography: 'airy farmhouse serif titles with open, readable body type',
    illustration: 'airy black ink line illustration with a light watercolor wash',
    palette: 'pale alabaster, soft copper, muted wheat, and black ink',
    composition: 'bright farmhouse publishing with wide margins and delicate copper rules',
  },
  'umber-leather': {
    revision: 1,
    paper: 'warm parchment paper with an archival tooth',
    typography: 'heritage serif display titles with traditional cookbook body type',
    illustration: 'heritage black ink illustration with warm engraved shading',
    palette: 'warm parchment, deep umber, restrained antique gold, and black ink',
    composition: 'hearth-kitchen publishing with archival framing and a grounded two-column layout',
  },
};

export const RECIPE_PAGE_STYLE_IDS = Object.freeze(Object.keys(RECIPE_PAGE_STYLE_PROFILES));

export function isRecipePageStyleId(value: unknown): value is string {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(RECIPE_PAGE_STYLE_PROFILES, value);
}

function getRecipePageStyleProfile(styleId: string): RecipePageStyleProfile {
  return RECIPE_PAGE_STYLE_PROFILES[styleId] ?? RECIPE_PAGE_STYLE_PROFILES.illustrated;
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
    description: clean(graph.description),
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
    notes: (graph.notes ?? []).map((note) => note.trim()).filter(Boolean).slice(0, 4),
  };
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
  const profile = getRecipePageStyleProfile(styleId);
  const styleRevision = options.styleRevision ?? profile.revision;
  const copy = buildRecipePageCopy(graph);
  const exactCopy = renderExactCopy(copy);
  const visualDirection = clean(options.visualDirection);
  const styleReferences = (options.styleReferences ?? [])
    .filter((url) => /^https:\/\//i.test(url))
    .slice(0, 4);
  const styleDescriptor = [
    profile.paper,
    profile.typography,
    profile.illustration,
    profile.palette,
    profile.composition,
  ].join('; ');
  const pageInstructions = [
    `Create one finished, flat, portrait cookbook page in the canonical ${COOKBOOK_GEOMETRY.generation.aspectRatio} aspect ratio.`,
    'The result is the page itself, not a photograph, mockup, open book, loose sheet, or framed poster.',
    'Fill the entire output canvas; the canvas edges are the physical page edges.',
    'Do not place a smaller page inside the canvas, leave blank outer padding, add a drop shadow, or show a surrounding background.',
    'Typeset every supplied line exactly once. Preserve all quantities, units, times, and temperatures.',
    'Do not invent, omit, paraphrase, duplicate, or reorder recipe content.',
    'Use a clear hierarchy and text large enough to read on an iPhone.',
    'Keep all text and important artwork inside a generous safe margin.',
    'Include an appetizing illustration or editorial food image of the finished dish as part of the page composition.',
    'Treat the locked style profile as a publishing design system: keep its typography, palette, image treatment, spacing, and ornament consistent across recipes.',
    'Do not print a page number because recipes may be reordered later.',
    visualDirection ? `Requested visual adjustment: ${visualDirection}. Keep the cookbook identity unchanged.` : '',
  ].filter(Boolean).join(' ');

  const prompt = [
    pageInstructions,
    `Locked cookbook identity, revision ${styleRevision}: ${styleDescriptor}.`,
    styleReferences.length > 0
      ? 'Use the supplied reference images only for visual identity, paper, palette, illustration language, and publishing character. Never copy their recipe content.'
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
