import { Colors } from '@/constants/colors';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import { shiftColor } from '@/utils/cookbook/coverArt';
import type {
  CookbookCoverColorId,
  CookbookCoverFinishId,
  CookbookStyleId,
} from '@/types/cookbook';

/**
 * Physical binding archetypes for the 3D bookshelf and creation studio.
 *
 * Cover appearance is deliberately shallower than book construction:
 * finish controls the weave/grain, color controls the palette, and
 * `PhysicalBook` owns the unchanged geometry and physical behavior.
 * Legacy binding ids remain valid adapters for older persisted books.
 */

export type CookbookBindingId =
  | 'sage-linen'
  | 'terracotta-cloth'
  | 'navy-leather'
  | 'charcoal-cloth'
  | 'alabaster-linen'
  | 'umber-leather';

export type BindingMaterial = 'cloth' | 'linen';

export interface CookbookCoverFinish {
  id: CookbookCoverFinishId;
  name: string;
  description: string;
  material: BindingMaterial;
  studioOrder: number;
  grain: { frequency: number; amplitude: number };
  weave: {
    verticalGapRatio: number;
    verticalGapMin: number;
    horizontalGapRatio: number;
    horizontalGapMin: number;
    strokeWidth: number;
    opacity: number;
  };
}

export interface CookbookCoverColor {
  id: CookbookCoverColorId;
  name: string;
  studioOrder: number;
  cloth: string;
  weave: string;
  foil: readonly [string, string, string];
  band: string;
  /** Compatibility value written for older application builds. */
  legacyStyleId: CookbookBindingId;
}

export interface CookbookBinding {
  id: CookbookBindingId;
  finishId: CookbookCoverFinishId;
  colorId: CookbookCoverColorId;
  name: string;
  tagline: string;
  material: BindingMaterial;
  /** Base cloth/board color. */
  cloth: string;
  /** Woven thread line color. */
  weave: string;
  /** Metallic foil ramp: [shadow, base, highlight]. */
  foil: readonly [string, string, string];
  /** Quiet head and tail cap color. */
  band: string;
  /**
   * SkSL grain tuning. `frequency` scales the noise field (higher = finer),
   * `amplitude` is the luminance modulation depth (0..1, keep under 0.12).
   */
  grain: { frequency: number; amplitude: number };
  weavePattern: CookbookCoverFinish['weave'];
}

export const FOIL_RAMPS = {
  gold: ['#7a5a18', '#d4af37', '#f7e8b0'],
  copper: ['#6b3418', '#b87348', '#f0b98d'],
  silver: ['#565b63', '#b9bfc7', '#eef1f4'],
} as const;

export const DEFAULT_COVER_FINISH_ID: CookbookCoverFinishId = 'fine-cloth';
export const DEFAULT_COVER_COLOR_ID: CookbookCoverColorId = 'sage';

export const COOKBOOK_COVER_FINISHES: Record<CookbookCoverFinishId, CookbookCoverFinish> = {
  'fine-cloth': {
    id: 'fine-cloth',
    name: 'Fine cloth',
    description: 'A refined, tightly woven book cloth',
    material: 'cloth',
    studioOrder: 0,
    grain: { frequency: 0.72, amplitude: 0.038 },
    weave: {
      verticalGapRatio: 66,
      verticalGapMin: 3.4,
      horizontalGapRatio: 42,
      horizontalGapMin: 5.4,
      strokeWidth: 0.52,
      opacity: 0.11,
    },
  },
  'natural-linen': {
    id: 'natural-linen',
    name: 'Natural linen',
    description: 'A warmer, more open woven texture',
    material: 'linen',
    studioOrder: 1,
    grain: { frequency: 0.5, amplitude: 0.052 },
    weave: {
      verticalGapRatio: 48,
      verticalGapMin: 4.8,
      horizontalGapRatio: 34,
      horizontalGapMin: 6.4,
      strokeWidth: 0.68,
      opacity: 0.17,
    },
  },
};

export const COOKBOOK_COVER_COLORS: Record<CookbookCoverColorId, CookbookCoverColor> = {
  sage: {
    id: 'sage', name: 'Sage', studioOrder: 0, cloth: '#7d8471', weave: '#6b7260',
    foil: FOIL_RAMPS.gold, band: '#5c624f', legacyStyleId: 'sage-linen',
  },
  clay: {
    id: 'clay', name: 'Clay', studioOrder: 1, cloth: Colors.peach, weave: '#8f3823',
    foil: FOIL_RAMPS.copper, band: '#7c3120', legacyStyleId: 'terracotta-cloth',
  },
  midnight: {
    id: 'midnight', name: 'Midnight', studioOrder: 2, cloth: '#2f3b52', weave: '#27334a',
    foil: FOIL_RAMPS.silver, band: '#232c3e', legacyStyleId: 'navy-leather',
  },
  alabaster: {
    id: 'alabaster', name: 'Alabaster', studioOrder: 3, cloth: Colors.alabaster, weave: '#e6e1d5',
    foil: FOIL_RAMPS.copper, band: '#ded8cb', legacyStyleId: 'alabaster-linen',
  },
  charcoal: {
    id: 'charcoal', name: 'Charcoal', studioOrder: 4, cloth: Colors.charcoal, weave: '#262420',
    foil: FOIL_RAMPS.gold, band: '#0f0e0c', legacyStyleId: 'charcoal-cloth',
  },
  umber: {
    id: 'umber', name: 'Umber', studioOrder: 5, cloth: Colors.warmUmber, weave: '#241f1c',
    foil: FOIL_RAMPS.gold, band: '#1c1815', legacyStyleId: 'umber-leather',
  },
};

const LEGACY_COLOR_IDS: Partial<Record<CookbookStyleId, CookbookCoverColorId>> = {
  'sage-linen': 'sage',
  'terracotta-cloth': 'clay',
  'navy-leather': 'midnight',
  'alabaster-linen': 'alabaster',
  'charcoal-cloth': 'charcoal',
  'umber-leather': 'umber',
};

export function normalizeCoverFinishId(value?: string | null): CookbookCoverFinishId {
  return value && value in COOKBOOK_COVER_FINISHES
    ? value as CookbookCoverFinishId
    : DEFAULT_COVER_FINISH_ID;
}

export function normalizeCoverColorId(
  value?: string | null,
  legacyStyleId?: CookbookStyleId | string | null,
): CookbookCoverColorId {
  if (value && value in COOKBOOK_COVER_COLORS) return value as CookbookCoverColorId;
  if (legacyStyleId && LEGACY_COLOR_IDS[legacyStyleId as CookbookStyleId]) {
    return LEGACY_COLOR_IDS[legacyStyleId as CookbookStyleId]!;
  }
  return DEFAULT_COVER_COLOR_ID;
}

export function listCookbookCoverFinishes(): CookbookCoverFinish[] {
  return Object.values(COOKBOOK_COVER_FINISHES)
    .sort((left, right) => left.studioOrder - right.studioOrder);
}

export function listCookbookCoverColors(): CookbookCoverColor[] {
  return Object.values(COOKBOOK_COVER_COLORS)
    .sort((left, right) => left.studioOrder - right.studioOrder);
}

export function getLegacyCoverStyleForColor(colorId?: CookbookCoverColorId | string | null): CookbookStyleId {
  return COOKBOOK_COVER_COLORS[normalizeCoverColorId(colorId)].legacyStyleId;
}

export function resolveCookbookBinding(input: {
  finishId?: CookbookCoverFinishId | string | null;
  colorId?: CookbookCoverColorId | string | null;
  legacyStyleId?: CookbookStyleId | string | null;
} = {}): CookbookBinding {
  const finish = COOKBOOK_COVER_FINISHES[normalizeCoverFinishId(input.finishId)];
  const color = COOKBOOK_COVER_COLORS[normalizeCoverColorId(input.colorId, input.legacyStyleId)];
  return {
    id: color.legacyStyleId,
    finishId: finish.id,
    colorId: color.id,
    name: color.name,
    tagline: `${color.name} ${finish.name.toLocaleLowerCase()}`,
    material: finish.material,
    cloth: color.cloth,
    weave: color.weave,
    foil: color.foil,
    band: color.band,
    grain: finish.grain,
    weavePattern: finish.weave,
  };
}

export const COOKBOOK_BINDINGS = Object.values(COOKBOOK_COVER_COLORS).reduce(
  (bindings, color) => {
    bindings[color.legacyStyleId] = resolveCookbookBinding({
      finishId: DEFAULT_COVER_FINISH_ID,
      colorId: color.id,
    });
    return bindings;
  },
  {} as Record<CookbookBindingId, CookbookBinding>,
);

export const COOKBOOK_BINDING_ORDER: CookbookBindingId[] = [
  'sage-linen',
  'terracotta-cloth',
  'navy-leather',
  'charcoal-cloth',
  'alabaster-linen',
  'umber-leather',
];

export const DEFAULT_COOKBOOK_BINDING: CookbookBindingId = 'sage-linen';

export function getCookbookBinding(id?: CookbookBindingId | string | null): CookbookBinding {
  if (id && (id as CookbookBindingId) in COOKBOOK_BINDINGS) {
    return COOKBOOK_BINDINGS[id as CookbookBindingId];
  }
  return COOKBOOK_BINDINGS[DEFAULT_COOKBOOK_BINDING];
}

export function listCookbookBindings(): CookbookBinding[] {
  return COOKBOOK_BINDING_ORDER.map((id) => COOKBOOK_BINDINGS[id]);
}

/**
 * Resolves every current or legacy style onto the canonical cloth shell.
 */
export function getCookbookBindingForStyle(id?: CookbookStyleId | string | null): CookbookBinding {
  const preset = getCookbookStyle(id);
  if (preset.binding) return getCookbookBinding(preset.binding);
  const cloth = preset.palette.spine;
  return {
    id: DEFAULT_COOKBOOK_BINDING,
    finishId: DEFAULT_COVER_FINISH_ID,
    colorId: DEFAULT_COVER_COLOR_ID,
    name: preset.name,
    tagline: preset.tagline,
    material: 'cloth',
    cloth,
    weave: shiftColor(cloth, -14),
    foil: FOIL_RAMPS.gold,
    band: shiftColor(cloth, -24),
    grain: { frequency: 0.72, amplitude: 0.038 },
    weavePattern: COOKBOOK_COVER_FINISHES['fine-cloth'].weave,
  };
}
