/**
 * The product-owned physical geometry of every Folio cookbook.
 *
 * Ratios describe the trimmed paper leaf. Renderers may add cover-board
 * overhang, spine thickness, shadows, and responsive stage padding, but they
 * must derive their page and spread proportions from this contract.
 */
export const COOKBOOK_GEOMETRY = {
  id: 'nosh-cookbook-4x5-v1',
  revision: 1,
  page: {
    width: 4,
    height: 5,
    aspectRatio: 4 / 5,
    heightRatio: 5 / 4,
    designWidth: 800,
    designHeight: 1000,
  },
  spread: {
    width: 8,
    height: 5,
    aspectRatio: 8 / 5,
  },
  print: {
    widthInches: 8,
    heightInches: 10,
  },
  generation: {
    aspectRatio: '4:5',
    resolution: '2K',
  },
} as const;

export type CookbookGeometryId = typeof COOKBOOK_GEOMETRY.id;
export type CookbookGenerationAspectRatio = typeof COOKBOOK_GEOMETRY.generation.aspectRatio;

export function resolveCookbookPageHeight(pageWidth: number): number {
  return pageWidth * COOKBOOK_GEOMETRY.page.heightRatio;
}

export function resolveCookbookSpreadHeight(spreadWidth: number): number {
  return spreadWidth / COOKBOOK_GEOMETRY.spread.aspectRatio;
}
