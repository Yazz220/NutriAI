import type { ImageSourcePropType } from 'react-native';
import type { CookbookPageStyleId, CookbookStyleId } from '@/types/cookbook';
import {
  compileRecipePageStyleDescriptor,
  DEFAULT_RECIPE_PAGE_STYLE_ID,
  isCreationPageStyleId as isActiveRecipePageStyleId,
  isRecipePageStyleId,
  listActiveRecipePageStyles,
  resolveActiveRecipePageStyle,
  resolveLatestRecipePageStyle,
  resolveRecipePageStyleVersion,
  type CreationPageStyleId,
} from '@/constants/recipePageStyles';
export {
  COOKBOOK_COVER_COLORS,
  COOKBOOK_COVER_FINISHES,
  DEFAULT_COVER_COLOR_ID,
  DEFAULT_COVER_FINISH_ID,
  listCookbookCoverColors,
  listCookbookCoverFinishes,
} from '@/constants/cookbookBindings';
export type {
  CookbookCoverColor as CookbookCoverColorOption,
  CookbookCoverFinish as CookbookCoverFinishOption,
} from '@/constants/cookbookBindings';
export type { CreationPageStyleId } from '@/constants/recipePageStyles';

export interface CookbookPageStyleOption {
  id: CreationPageStyleId;
  name: string;
  description: string;
  modelDescription: string;
  revision: number;
  styleReferences: readonly string[];
  samples: {
    brownies: ImageSourcePropType;
    cookies: ImageSourcePropType;
  };
  studioOrder: number;
}

function option(
  id: CreationPageStyleId,
  samples: CookbookPageStyleOption['samples'],
): CookbookPageStyleOption {
  const style = resolveActiveRecipePageStyle(id);
  return {
    id,
    name: style.name,
    description: style.description,
    modelDescription: compileRecipePageStyleDescriptor(style, 'standard'),
    revision: style.revision,
    styleReferences: style.styleReferences,
    samples,
    studioOrder: style.studioOrder ?? 0,
  };
}

export const COOKBOOK_PAGE_STYLES: Record<CreationPageStyleId, CookbookPageStyleOption> = {
  studio: option('studio', {
    brownies: require('../assets/cookbook/style-previews/studio-v1-brownies.png'),
    cookies: require('../assets/cookbook/style-previews/studio-v1-cookies.png'),
  }),
  editorial: option('editorial', {
    brownies: require('../assets/cookbook/style-previews/editorial-v2-brownies.png'),
    cookies: require('../assets/cookbook/style-previews/editorial-v2-cookies.png'),
  }),
  illustrated: option('illustrated', {
    // These existing assets depict the ingredient-and-step layout locked by revision 3.
    brownies: require('../assets/cookbook/style-previews/illustrated-v2-brownies.png'),
    cookies: require('../assets/cookbook/style-previews/illustrated-v2-cookies.png'),
  }),
  watercolor: option('watercolor', {
    // The original portrait samples match the preserved Illustrated 1 art direction.
    brownies: require('../assets/cookbook/style-previews/illustrated-brownies.png'),
    cookies: require('../assets/cookbook/style-previews/illustrated-cookies.png'),
  }),
  heritage: option('heritage', {
    brownies: require('../assets/cookbook/style-previews/heritage-v2-brownies.png'),
    cookies: require('../assets/cookbook/style-previews/heritage-v2-cookies.png'),
  }),
  journal: option('journal', {
    brownies: require('../assets/cookbook/style-previews/journal-v1-brownies.png'),
    cookies: require('../assets/cookbook/style-previews/journal-v1-cookies.png'),
  }),
  artisan: option('artisan', {
    brownies: require('../assets/cookbook/style-previews/artisan-v1-brownies.png'),
    cookies: require('../assets/cookbook/style-previews/artisan-v1-cookies.png'),
  }),
};

export const DEFAULT_CREATION_PAGE_STYLE_ID: CreationPageStyleId = DEFAULT_RECIPE_PAGE_STYLE_ID;

export type CookbookPageStylePreview = Pick<CookbookPageStyleOption, 'name' | 'samples'>;

/** Never show today's sample as the appearance of an older saved revision. */
export function getCookbookPageStylePreview(
  styleId: CookbookPageStyleId,
  revision: number,
): CookbookPageStylePreview | null {
  if (styleId === 'illustrated' && revision === 1) {
    return { name: 'Illustrated', samples: COOKBOOK_PAGE_STYLES.watercolor.samples };
  }
  if (isActiveRecipePageStyleId(styleId)) {
    const option = COOKBOOK_PAGE_STYLES[styleId];
    if (option.revision === revision) return option;
  }
  return null;
}

export function listCreationPageStyles(): CookbookPageStyleOption[] {
  return listActiveRecipePageStyles().map((style) => COOKBOOK_PAGE_STYLES[style.id as CreationPageStyleId]);
}

export function isCreationPageStyleId(value?: string | null): value is CreationPageStyleId {
  return isActiveRecipePageStyleId(value);
}

export function normalizeCookbookPageStyleId(
  value?: string | null,
  legacyCoverStyle?: CookbookStyleId,
): CookbookPageStyleId {
  if (isRecipePageStyleId(value)) return value;
  if (legacyCoverStyle && isRecipePageStyleId(legacyCoverStyle)) return legacyCoverStyle;
  return DEFAULT_CREATION_PAGE_STYLE_ID;
}

export function getCookbookPageStyleRevision(styleId: CookbookPageStyleId): number {
  return resolveLatestRecipePageStyle(styleId).revision;
}

export function getCookbookPageStyleReferences(
  styleId: CookbookPageStyleId,
  revision?: number,
): string[] {
  const style = revision
    ? resolveRecipePageStyleVersion(styleId, revision)
    : resolveLatestRecipePageStyle(styleId);
  return [...(style?.styleReferences ?? [])];
}

export function getCookbookPageStyleName(styleId: CookbookPageStyleId): string {
  return resolveLatestRecipePageStyle(styleId).name;
}

export function getCookbookPageStyleModelDescription(styleId: CookbookPageStyleId): string {
  return compileRecipePageStyleDescriptor(resolveLatestRecipePageStyle(styleId), 'standard');
}
