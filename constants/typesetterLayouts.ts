/**
 * Typesetter layout configuration.
 *
 * Maps each of the 3 RecipeTemplateId presets to the spatial arrangement
 * of the cookbook page:
 *   - clean-cream: single column, art centered on top, generous spacing
 *   - ink-sketch: single column with decorative border, art full width on top
 *   - modern-editorial: two-column grid (ingredients left, steps right),
 *     art as an asymmetric header element
 *
 * The template controls the SPATIAL ARRANGEMENT.
 * The style preset (typesetterStyles.ts) controls the VISUAL APPEARANCE.
 * They compose: any template can be used with any style.
 */

import type { RecipeTemplateId } from '@/types/cookbook';

export type TypesetterLayout = 'single-column' | 'single-column-bordered' | 'two-column-grid';

export interface TypesetterLayoutConfig {
  id: RecipeTemplateId;
  layout: TypesetterLayout;
  /** Art width as a fraction of content width (0.7–1.0). */
  artWidthRatio: number;
  /** Whether the art is centered (true) or full-width (false). */
  artCentered: boolean;
  /** Whether ingredients and steps are in separate columns. */
  twoColumnContent: boolean;
  /** Gap between art zone and text zone, as fraction of page height. */
  artTextGapRatio: number;
  /** Gap between sections, as fraction of page height. */
  sectionGapRatio: number;
}

export const TYPESETTER_LAYOUT_CONFIGS: Record<RecipeTemplateId, TypesetterLayoutConfig> = {
  'clean-cream': {
    id: 'clean-cream',
    layout: 'single-column',
    artWidthRatio: 0.72,
    artCentered: true,
    twoColumnContent: false,
    artTextGapRatio: 0.02,
    sectionGapRatio: 0.025,
  },
  'ink-sketch': {
    id: 'ink-sketch',
    layout: 'single-column-bordered',
    artWidthRatio: 1.0,
    artCentered: false,
    twoColumnContent: false,
    artTextGapRatio: 0.025,
    sectionGapRatio: 0.025,
  },
  'modern-editorial': {
    id: 'modern-editorial',
    layout: 'two-column-grid',
    artWidthRatio: 0.85,
    artCentered: false,
    twoColumnContent: true,
    artTextGapRatio: 0.02,
    sectionGapRatio: 0.03,
  },
};

const DEFAULT_TEMPLATE: RecipeTemplateId = 'clean-cream';

export function getTypesetterLayoutConfig(templateId?: RecipeTemplateId | string | null): TypesetterLayoutConfig {
  if (templateId && (templateId as RecipeTemplateId) in TYPESETTER_LAYOUT_CONFIGS) {
    return TYPESETTER_LAYOUT_CONFIGS[templateId as RecipeTemplateId];
  }
  return TYPESETTER_LAYOUT_CONFIGS[DEFAULT_TEMPLATE];
}
