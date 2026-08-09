import type { ImageSourcePropType } from 'react-native';
import type { RecipeTemplateId } from '@/types/cookbook';

export interface RecipeTemplatePreset {
  id: RecipeTemplateId;
  name: string;
  tagline: string;
  previewAsset: ImageSourcePropType;
  styleDescriptor: string;
  promptDescriptor: string;
}

export const RECIPE_TEMPLATE_PRESETS: Record<RecipeTemplateId, RecipeTemplatePreset> = {
  'clean-cream': {
    id: 'clean-cream',
    name: 'Clean Cream',
    tagline: 'Minimal cream page with generous spacing',
    previewAsset: require('../assets/cookbook/templates/clean-cream-cupcakes.png'),
    styleDescriptor: 'Minimal alabaster cookbook page with restrained typography and quiet warm accents.',
    promptDescriptor:
      'clean cream cookbook template, alabaster paper, restrained serif typography, generous white space, compact timing row, small realistic food visual, sparse ingredients and directions sections, tiny butterscotch accent',
  },
  'ink-sketch': {
    id: 'ink-sketch',
    name: 'Ink Sketch',
    tagline: 'Hand-drawn border and black ink food art',
    previewAsset: require('../assets/cookbook/templates/ink-sketch-cupcakes.png'),
    styleDescriptor: 'Warm paper cookbook page with black ink illustration and a quiet hand-drawn border.',
    promptDescriptor:
      'ink sketch cookbook template, warm textured paper, black ink food illustration, hand-drawn vintage border, elegant title treatment, sparse ingredients and directions columns, small butterscotch detail',
  },
  'modern-editorial': {
    id: 'modern-editorial',
    name: 'Modern Editorial',
    tagline: 'Magazine-style structure with a polished visual',
    previewAsset: require('../assets/cookbook/templates/modern-editorial-cupcakes.png'),
    styleDescriptor: 'Modern editorial recipe page with structured blocks and a polished food visual.',
    promptDescriptor:
      'modern editorial cookbook template, clean magazine grid, bold title, refined high-contrast typography, asymmetric polished food visual, structured ingredient and direction blocks, warm gray rules, butterscotch accents',
  },
};

export const RECIPE_TEMPLATE_ORDER: RecipeTemplateId[] = [
  'clean-cream',
  'ink-sketch',
  'modern-editorial',
];

export const DEFAULT_RECIPE_TEMPLATE_ID: RecipeTemplateId = 'clean-cream';

export function isRecipeTemplateId(value: unknown): value is RecipeTemplateId {
  return typeof value === 'string' && value in RECIPE_TEMPLATE_PRESETS;
}

export function getRecipeTemplate(id?: string | null): RecipeTemplatePreset {
  return isRecipeTemplateId(id) ? RECIPE_TEMPLATE_PRESETS[id] : RECIPE_TEMPLATE_PRESETS[DEFAULT_RECIPE_TEMPLATE_ID];
}

export function listRecipeTemplates(): RecipeTemplatePreset[] {
  return RECIPE_TEMPLATE_ORDER.map((id) => RECIPE_TEMPLATE_PRESETS[id]);
}

export function orderRecipeTemplates(favoriteIds: readonly string[] = []): RecipeTemplatePreset[] {
  const favoriteTemplates = favoriteIds
    .filter(isRecipeTemplateId)
    .filter((id, index, all) => all.indexOf(id) === index)
    .map((id) => RECIPE_TEMPLATE_PRESETS[id]);
  const favoriteSet = new Set(favoriteTemplates.map((template) => template.id));
  const remainingTemplates = listRecipeTemplates().filter((template) => !favoriteSet.has(template.id));
  return [...favoriteTemplates, ...remainingTemplates];
}
