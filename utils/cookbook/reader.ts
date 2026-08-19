const RECIPE_PAGE_OFFSET = 2;
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
  | { type: 'contents'; id: 'contents' }
  | { type: 'recipe'; id: string; pageIndex: number }
  | { type: 'blank'; id: string };

export interface CookbookSpread {
  id: string;
  left: CookbookLeaf;
  right: CookbookLeaf;
}

export function getReaderPageIndex(pageIds: string[], targetPageId: string | null | undefined): number | null {
  if (!targetPageId) return null;
  const recipeIndex = pageIds.indexOf(targetPageId);
  return recipeIndex >= 0 ? recipeIndex + RECIPE_PAGE_OFFSET : null;
}

export function buildCookbookLeaves(pageIds: string[]): CookbookLeaf[] {
  const leaves: CookbookLeaf[] = [
    { type: 'bookplate', id: 'bookplate' },
    { type: 'contents', id: 'contents' },
    ...pageIds.map<CookbookLeaf>((id, pageIndex) => ({ type: 'recipe', id, pageIndex })),
  ];

  if (leaves.length % 2 !== 0) {
    leaves.push({ type: 'blank', id: 'blank-end' });
  }

  return leaves;
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

// Table-of-contents layout shared by the web contents texture and its tap
// hit-testing. The texture is painted on a 900x1240 canvas; entry rows fill
// the region between CONTENTS_ENTRIES_TOP and CONTENTS_ENTRIES_BOTTOM.
export const CONTENTS_CANVAS_HEIGHT = 1240;
export const CONTENTS_ENTRIES_TOP = 250;
export const CONTENTS_ENTRIES_BOTTOM = 1170;
const CONTENTS_MAX_ROW_HEIGHT = 80;

export function getContentsRowHeight(entryCount: number): number {
  return Math.min(CONTENTS_MAX_ROW_HEIGHT, (CONTENTS_ENTRIES_BOTTOM - CONTENTS_ENTRIES_TOP) / Math.max(entryCount, 1));
}

export function getContentsEntryIndex(canvasY: number, entryCount: number): number | null {
  if (entryCount <= 0) return null;
  const index = Math.floor((canvasY - CONTENTS_ENTRIES_TOP) / getContentsRowHeight(entryCount));
  return index >= 0 && index < entryCount ? index : null;
}
