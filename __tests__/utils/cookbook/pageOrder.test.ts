import type { CookbookPage } from '@/types/cookbook';
import { applyCookbookPageOrder, getBeforePageId } from '@/utils/cookbook/pageOrder';

function page(id: string, sortOrder: number): CookbookPage {
  return {
    id,
    cookbookId: 'book-1',
    recipeId: `recipe-${id}`,
    title: id,
    section: 'dinner',
    pageNumber: sortOrder + 1,
    sortOrder,
    lifecycleStatus: 'approved',
  };
}

describe('cookbook page order', () => {
  it('applies the server order and derives page numbers from it', () => {
    expect(applyCookbookPageOrder(
      [page('first', 0), page('second', 1), page('third', 2)],
      ['third', 'first', 'second'],
    )).toEqual([
      page('third', 0),
      page('first', 1),
      page('second', 2),
    ]);
  });

  it('uses the following page as the stable move anchor', () => {
    expect(getBeforePageId(['third', 'first', 'second'], 'first')).toBe('second');
    expect(getBeforePageId(['third', 'first', 'second'], 'second')).toBeNull();
  });
});
