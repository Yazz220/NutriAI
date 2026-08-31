import type { CookbookBinding } from '@/constants/cookbookBindings';
import type {
  CookbookCoverTitleColorId,
  CookbookCoverTitlePlacementId,
} from '@/types/cookbook';

export type CoverTitleFoil = CookbookBinding['foil'];

export interface CoverTitleColorOption {
  id: CookbookCoverTitleColorId;
  name: string;
  swatchColor: string;
  foil?: CoverTitleFoil;
  studioOrder: number;
}

export interface CoverTitlePlacementOption {
  id: CookbookCoverTitlePlacementId;
  name: string;
  studioOrder: number;
  /** Center of the title block as a proportion of the front board height. */
  centerRatio: number;
}

export const DEFAULT_COVER_TITLE_COLOR_ID: CookbookCoverTitleColorId = 'auto';
export const DEFAULT_COVER_TITLE_PLACEMENT_ID: CookbookCoverTitlePlacementId = 'center';

export const COVER_TITLE_COLORS: Record<CookbookCoverTitleColorId, CoverTitleColorOption> = {
  auto: {
    id: 'auto',
    name: 'Auto',
    swatchColor: '#D4AF37',
    studioOrder: 0,
  },
  gilt: {
    id: 'gilt',
    name: 'Gilt',
    swatchColor: '#D4AF37',
    foil: ['#7A5A18', '#D4AF37', '#F7E8B0'],
    studioOrder: 1,
  },
  ivory: {
    id: 'ivory',
    name: 'Ivory',
    swatchColor: '#F7F2EA',
    foil: ['#8A8175', '#F7F2EA', '#FFFFFF'],
    studioOrder: 2,
  },
  plum: {
    id: 'plum',
    name: 'Plum',
    swatchColor: '#65436F',
    foil: ['#351E3D', '#65436F', '#B99FC0'],
    studioOrder: 3,
  },
  charcoal: {
    id: 'charcoal',
    name: 'Ink',
    swatchColor: '#2B2B2B',
    foil: ['#11100F', '#2B2B2B', '#6B655F'],
    studioOrder: 4,
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    swatchColor: '#B9BFC7',
    foil: ['#565B63', '#B9BFC7', '#EEF1F4'],
    studioOrder: 5,
  },
};

export const COVER_TITLE_PLACEMENTS: Record<
  CookbookCoverTitlePlacementId,
  CoverTitlePlacementOption
> = {
  upper: { id: 'upper', name: 'Upper', studioOrder: 0, centerRatio: 0.31 },
  center: { id: 'center', name: 'Center', studioOrder: 1, centerRatio: 0.47 },
  lower: { id: 'lower', name: 'Lower', studioOrder: 2, centerRatio: 0.64 },
};

const TITLE_COLOR_IDS = new Set<string>(Object.keys(COVER_TITLE_COLORS));
const TITLE_PLACEMENT_IDS = new Set<string>(Object.keys(COVER_TITLE_PLACEMENTS));

export function normalizeCoverTitleColorId(value?: string | null): CookbookCoverTitleColorId {
  return value && TITLE_COLOR_IDS.has(value)
    ? value as CookbookCoverTitleColorId
    : DEFAULT_COVER_TITLE_COLOR_ID;
}

export function normalizeCoverTitlePlacementId(value?: string | null): CookbookCoverTitlePlacementId {
  return value && TITLE_PLACEMENT_IDS.has(value)
    ? value as CookbookCoverTitlePlacementId
    : DEFAULT_COVER_TITLE_PLACEMENT_ID;
}

export function listCoverTitleColors(): CoverTitleColorOption[] {
  return Object.values(COVER_TITLE_COLORS)
    .sort((left, right) => left.studioOrder - right.studioOrder);
}

export function listCoverTitlePlacements(): CoverTitlePlacementOption[] {
  return Object.values(COVER_TITLE_PLACEMENTS)
    .sort((left, right) => left.studioOrder - right.studioOrder);
}

export function resolveCoverTitleFoil(
  colorId: CookbookCoverTitleColorId | string | null | undefined,
  automaticFoil: CoverTitleFoil,
): CoverTitleFoil {
  return COVER_TITLE_COLORS[normalizeCoverTitleColorId(colorId)].foil ?? automaticFoil;
}

export function resolveCoverTitleCenterRatio(
  placementId: CookbookCoverTitlePlacementId | string | null | undefined,
): number {
  return COVER_TITLE_PLACEMENTS[normalizeCoverTitlePlacementId(placementId)].centerRatio;
}
