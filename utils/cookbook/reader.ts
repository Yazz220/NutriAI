const RECIPE_PAGE_OFFSET = 2;

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

export function buildCookbookSpreads(pageIds: string[]): CookbookSpread[] {
  const leaves: CookbookLeaf[] = [
    { type: 'bookplate', id: 'bookplate' },
    { type: 'contents', id: 'contents' },
    ...pageIds.map<CookbookLeaf>((id, pageIndex) => ({ type: 'recipe', id, pageIndex })),
  ];

  if (leaves.length % 2 !== 0) {
    leaves.push({ type: 'blank', id: 'blank-end' });
  }

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
