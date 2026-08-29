import type { ImageSourcePropType } from 'react-native';
import type { CookbookPageStyleId, CookbookStyleId } from '@/types/cookbook';
import { getCookbookStyle } from '@/constants/cookbookStyles';
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

export type CreationPageStyleId = 'illustrated' | 'studio-editorial' | 'heritage';

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

export const COOKBOOK_PAGE_STYLES: Record<CreationPageStyleId, CookbookPageStyleOption> = {
  illustrated: {
    id: 'illustrated',
    name: 'Illustrated',
    description: 'Gentle drawings and soft color',
    modelDescription:
      'refined hand-drawn black ink food illustration with delicate translucent watercolor, warm alabaster paper, muted sage and ochre accents, airy contemporary cookbook publishing',
    revision: 1,
    styleReferences: [],
    samples: {
      brownies: require('../assets/cookbook/style-previews/illustrated-brownies.png'),
      cookies: require('../assets/cookbook/style-previews/illustrated-cookies.png'),
    },
    studioOrder: 0,
  },
  'studio-editorial': {
    id: 'studio-editorial',
    name: 'Editorial',
    description: 'Bold imagery and clean type',
    modelDescription:
      'polished contemporary culinary editorial photography, warm white paper, confident high-contrast serif titles, precise sans-serif recipe text, disciplined asymmetric grid, restrained terracotta rules',
    revision: 1,
    styleReferences: [],
    samples: {
      brownies: require('../assets/cookbook/style-previews/editorial-brownies.png'),
      cookies: require('../assets/cookbook/style-previews/editorial-cookies.png'),
    },
    studioOrder: 1,
  },
  heritage: {
    id: 'heritage',
    name: 'Heritage',
    description: 'Classic ink and quiet ornament',
    modelDescription:
      'refined archival cookbook publishing with engraved copperplate food artwork, pristine warm parchment, deep umber ink, restrained antique gold rules, dignified serif typography and quiet classical ornament',
    revision: 1,
    styleReferences: [],
    samples: {
      brownies: require('../assets/cookbook/style-previews/heritage-brownies.png'),
      cookies: require('../assets/cookbook/style-previews/heritage-cookies.png'),
    },
    studioOrder: 2,
  },
};

export const DEFAULT_CREATION_PAGE_STYLE_ID: CreationPageStyleId = 'illustrated';

const CREATION_PAGE_STYLE_IDS = new Set<string>(Object.keys(COOKBOOK_PAGE_STYLES));

export function listCreationPageStyles(): CookbookPageStyleOption[] {
  return Object.values(COOKBOOK_PAGE_STYLES).sort((left, right) => left.studioOrder - right.studioOrder);
}

export function isCreationPageStyleId(value?: string | null): value is CreationPageStyleId {
  return typeof value === 'string' && CREATION_PAGE_STYLE_IDS.has(value);
}

export function normalizeCookbookPageStyleId(
  value?: string | null,
  legacyCoverStyle?: CookbookStyleId,
): CookbookPageStyleId {
  if (isCreationPageStyleId(value)) return value;
  if (value && getCookbookStyle(value).id === value) return value as CookbookStyleId;
  return legacyCoverStyle ?? DEFAULT_CREATION_PAGE_STYLE_ID;
}

export function getCookbookPageStyleRevision(styleId: CookbookPageStyleId): number {
  return isCreationPageStyleId(styleId)
    ? COOKBOOK_PAGE_STYLES[styleId].revision
    : getCookbookStyle(styleId).styleRevision;
}

export function getCookbookPageStyleReferences(styleId: CookbookPageStyleId): string[] {
  const references = isCreationPageStyleId(styleId)
    ? COOKBOOK_PAGE_STYLES[styleId].styleReferences
    : getCookbookStyle(styleId).pageStyleReferences ?? [];
  return [...references];
}

export function getCookbookPageStyleName(styleId: CookbookPageStyleId): string {
  return isCreationPageStyleId(styleId)
    ? COOKBOOK_PAGE_STYLES[styleId].name
    : getCookbookStyle(styleId).theme.name;
}

export function getCookbookPageStyleModelDescription(styleId: CookbookPageStyleId): string {
  return isCreationPageStyleId(styleId)
    ? COOKBOOK_PAGE_STYLES[styleId].modelDescription
    : getCookbookStyle(styleId).theme.prompt;
}
