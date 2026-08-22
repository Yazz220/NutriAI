import { Colors } from '@/constants/colors';
import { getCookbookStyle } from '@/constants/cookbookStyles';
import { shiftColor } from '@/utils/cookbook/coverArt';
import type { CookbookStyleId } from '@/types/cookbook';

/**
 * Physical binding archetypes for the 3D bookshelf and creation studio.
 *
 * Each archetype describes how a cookbook is bound: the cloth color of the
 * boards, the material weave (linen / cloth / leather), the metallic foil
 * ramp used for stamped typography and ornaments, and the headband / hub
 * band color. Cover presets in `constants/cookbookStyles.ts` reference an
 * archetype through their `binding` key; `PhysicalBook` renders from it.
 */

export type CookbookBindingId =
  | 'sage-linen'
  | 'terracotta-cloth'
  | 'navy-leather'
  | 'charcoal-cloth'
  | 'alabaster-linen'
  | 'umber-leather';

export type BindingMaterial = 'linen' | 'cloth' | 'leather';

export interface CookbookBinding {
  id: CookbookBindingId;
  name: string;
  tagline: string;
  material: BindingMaterial;
  /** Base cloth/board color. */
  cloth: string;
  /** Woven thread line color (linen and cloth materials). */
  weave: string;
  /** Metallic foil ramp: [shadow, base, highlight]. */
  foil: readonly [string, string, string];
  /** Hub band and headband color. */
  band: string;
  /**
   * SkSL grain tuning. `frequency` scales the noise field (higher = finer),
   * `amplitude` is the luminance modulation depth (0..1, keep under 0.12).
   */
  grain: { frequency: number; amplitude: number };
}

export const FOIL_RAMPS = {
  gold: ['#7a5a18', '#d4af37', '#f7e8b0'],
  copper: ['#6b3418', '#b87348', '#f0b98d'],
  silver: ['#565b63', '#b9bfc7', '#eef1f4'],
} as const;

export const COOKBOOK_BINDINGS: Record<CookbookBindingId, CookbookBinding> = {
  'sage-linen': {
    id: 'sage-linen',
    name: 'Sage Linen',
    tagline: 'Sage green linen with gold foil stamping',
    material: 'linen',
    cloth: '#7d8471',
    weave: '#6b7260',
    foil: FOIL_RAMPS.gold,
    band: '#5c624f',
    grain: { frequency: 0.9, amplitude: 0.05 },
  },
  'terracotta-cloth': {
    id: 'terracotta-cloth',
    name: 'Terracotta Cloth',
    tagline: 'Warm terracotta cloth with copper foil',
    material: 'cloth',
    cloth: Colors.peach,
    weave: '#8f3823',
    foil: FOIL_RAMPS.copper,
    band: '#7c3120',
    grain: { frequency: 0.6, amplitude: 0.045 },
  },
  'navy-leather': {
    id: 'navy-leather',
    name: 'Navy Leather',
    tagline: 'Midnight navy leather with silver foil',
    material: 'leather',
    cloth: '#2f3b52',
    weave: '#27334a',
    foil: FOIL_RAMPS.silver,
    band: '#232c3e',
    grain: { frequency: 0.25, amplitude: 0.09 },
  },
  'charcoal-cloth': {
    id: 'charcoal-cloth',
    name: 'Charcoal Cloth',
    tagline: 'Charcoal cloth with gold foil',
    material: 'cloth',
    cloth: Colors.charcoal,
    weave: '#262420',
    foil: FOIL_RAMPS.gold,
    band: '#0f0e0c',
    grain: { frequency: 0.6, amplitude: 0.04 },
  },
  'alabaster-linen': {
    id: 'alabaster-linen',
    name: 'Alabaster Linen',
    tagline: 'Pale alabaster linen with copper foil',
    material: 'linen',
    cloth: Colors.alabaster,
    weave: '#e6e1d5',
    foil: FOIL_RAMPS.copper,
    band: '#ded8cb',
    grain: { frequency: 0.9, amplitude: 0.03 },
  },
  'umber-leather': {
    id: 'umber-leather',
    name: 'Umber Leather',
    tagline: 'Dark umber leather with gold foil',
    material: 'leather',
    cloth: Colors.warmUmber,
    weave: '#241f1c',
    foil: FOIL_RAMPS.gold,
    band: '#1c1815',
    grain: { frequency: 0.22, amplitude: 0.08 },
  },
};

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
 * Resolves the binding archetype for a cover style. Luxury presets carry a
 * `binding` key; legacy presets synthesize a neutral cloth binding from
 * their palette so their spines still render on the packed shelf.
 */
export function getCookbookBindingForStyle(id?: CookbookStyleId | string | null): CookbookBinding {
  const preset = getCookbookStyle(id);
  if (preset.binding) return getCookbookBinding(preset.binding);
  const cloth = preset.palette.spine;
  return {
    id: DEFAULT_COOKBOOK_BINDING,
    name: preset.name,
    tagline: preset.tagline,
    material: 'cloth',
    cloth,
    weave: shiftColor(cloth, -14),
    foil: FOIL_RAMPS.gold,
    band: shiftColor(cloth, -24),
    grain: { frequency: 0.6, amplitude: 0.04 },
  };
}
