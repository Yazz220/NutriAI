import type { CookbookPage } from '@/types/cookbook';

export function applyCookbookPageOrder(
  pages: CookbookPage[],
  orderedPageIds: string[],
): CookbookPage[] {
  const positions = new Map(orderedPageIds.map((id, index) => [id, index]));

  return [...pages]
    .sort((left, right) => {
      const leftPosition = positions.get(left.id);
      const rightPosition = positions.get(right.id);
      if (leftPosition !== undefined && rightPosition !== undefined) return leftPosition - rightPosition;
      if (leftPosition !== undefined) return -1;
      if (rightPosition !== undefined) return 1;
      return left.sortOrder - right.sortOrder || left.pageNumber - right.pageNumber;
    })
    .map((page) => {
      const position = positions.get(page.id);
      if (position === undefined) return page;
      if (page.sortOrder === position && page.pageNumber === position + 1) return page;
      return { ...page, sortOrder: position, pageNumber: position + 1 };
    });
}

export function getBeforePageId(orderedPageIds: string[], pageId: string): string | null {
  const pageIndex = orderedPageIds.indexOf(pageId);
  if (pageIndex < 0) return null;
  return orderedPageIds[pageIndex + 1] ?? null;
}
