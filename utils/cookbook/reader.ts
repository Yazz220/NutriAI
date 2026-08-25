const RECIPE_PAGE_OFFSET = 1;
export const TOUCH_PAGING_BREAKPOINT = 600;

export function shouldAutoHideReaderChrome(_platform: string): boolean {
  // Chrome fades after a few idle seconds on every platform — page turns,
  // taps, and pointer movement all wake it again.
  return true;
}

export function shouldUseTouchPaging(platform: string, width: number): boolean {
  return platform !== 'web' && width < TOUCH_PAGING_BREAKPOINT;
}

export function getAdjacentRecipePageIndex(
  pageIds: string[],
  currentPageId: string | undefined,
  offset: -1 | 1,
): number | null {
  if (pageIds.length === 0) return null;
  const requestedIndex = currentPageId ? pageIds.indexOf(currentPageId) : -1;
  const currentIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const nextIndex = Math.max(0, Math.min(pageIds.length - 1, currentIndex + offset));
  return nextIndex === currentIndex ? null : nextIndex;
}

export type CookbookLeaf =
  | { type: 'bookplate'; id: 'bookplate' }
  | { type: 'recipe'; id: string; pageIndex: number }
  | { type: 'blank'; id: string };

export interface CookbookSpread {
  id: string;
  left: CookbookLeaf;
  right: CookbookLeaf;
}

export function getLeafIndexForPage(
  leaves: CookbookLeaf[],
  pageId: string | null | undefined,
): number {
  if (!pageId) return 0;
  const index = leaves.findIndex((leaf) => leaf.type === 'recipe' && leaf.id === pageId);
  return index >= 0 ? index : 0;
}

export function getReaderPageIndex(pageIds: string[], targetPageId: string | null | undefined): number | null {
  if (!targetPageId) return null;
  const recipeIndex = pageIds.indexOf(targetPageId);
  return recipeIndex >= 0 ? recipeIndex + RECIPE_PAGE_OFFSET : null;
}

export function buildCookbookLeaves(pageIds: string[]): CookbookLeaf[] {
  const leaves: CookbookLeaf[] = [
    { type: 'bookplate', id: 'bookplate' },
    ...pageIds.map<CookbookLeaf>((id, pageIndex) => ({ type: 'recipe', id, pageIndex })),
  ];

  if (leaves.length % 2 !== 0) {
    leaves.push({ type: 'blank', id: 'blank-end' });
  }

  return leaves;
}

export function buildRecipeLeaves(pageIds: string[]): CookbookLeaf[] {
  return pageIds.map<CookbookLeaf>((id, pageIndex) => ({ type: 'recipe', id, pageIndex }));
}

export function buildCookbookSpreads(pageIds: string[]): CookbookSpread[] {
  const leaves = buildCookbookLeaves(pageIds);

  const spreads: CookbookSpread[] = [];
  for (let index = 0; index < leaves.length; index += 2) {
    const left = leaves[index];
    const right = leaves[index + 1];
    spreads.push({ id: `${left.id}:${right.id}`, left, right });
  }

  return spreads;
}

export function getSpreadIndexForPage(spreads: CookbookSpread[], pageId: string | null | undefined): number | null {
  if (!pageId) return null;
  const spreadIndex = spreads.findIndex((spread) => spread.left.id === pageId || spread.right.id === pageId);
  return spreadIndex >= 0 ? spreadIndex : null;
}
