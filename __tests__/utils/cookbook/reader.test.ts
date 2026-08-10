import {
  buildCookbookSpreads,
  getAdjacentRecipePageIndex,
  getReaderPageIndex,
  getSpreadIndexForPage,
  shouldAutoHideReaderChrome,
  shouldUseTouchPaging,
} from '@/utils/cookbook/reader';

describe('reader chrome visibility', () => {
  it('auto-hides only on web, where pointer movement can restore it', () => {
    expect(shouldAutoHideReaderChrome('web')).toBe(true);
    expect(shouldAutoHideReaderChrome('ios')).toBe(false);
    expect(shouldAutoHideReaderChrome('android')).toBe(false);
  });
});

describe('touch paging', () => {
  it('replaces page arrows only on compact native screens', () => {
    expect(shouldUseTouchPaging('ios', 390)).toBe(true);
    expect(shouldUseTouchPaging('android', 430)).toBe(true);
    expect(shouldUseTouchPaging('ios', 768)).toBe(false);
    expect(shouldUseTouchPaging('web', 390)).toBe(false);
  });

  it('moves one recipe at a time and resists at the book edges', () => {
    const pageIds = ['page-a', 'page-b', 'page-c'];

    expect(getAdjacentRecipePageIndex(pageIds, 'page-a', 1)).toBe(1);
    expect(getAdjacentRecipePageIndex(pageIds, 'page-b', 1)).toBe(2);
    expect(getAdjacentRecipePageIndex(pageIds, 'page-c', 1)).toBeNull();
    expect(getAdjacentRecipePageIndex(pageIds, 'page-a', -1)).toBeNull();
  });
});

describe('getReaderPageIndex', () => {
  const pageIds = ['page-a', 'page-b', 'page-c'];

  it('accounts for the cover and table of contents before recipe pages', () => {
    expect(getReaderPageIndex(pageIds, 'page-a')).toBe(2);
    expect(getReaderPageIndex(pageIds, 'page-c')).toBe(4);
  });

  it('does not redirect the reader for a missing target', () => {
    expect(getReaderPageIndex(pageIds, 'missing')).toBeNull();
    expect(getReaderPageIndex(pageIds, undefined)).toBeNull();
  });
});

describe('buildCookbookSpreads', () => {
  it('keeps the bookplate and contents together as the opening spread', () => {
    const [opening] = buildCookbookSpreads(['page-a']);

    expect(opening.left).toEqual({ type: 'bookplate', id: 'bookplate' });
    expect(opening.right).toEqual({ type: 'contents', id: 'contents' });
  });

  it('pairs recipe pages and pads the final spread with a blank leaf', () => {
    const spreads = buildCookbookSpreads(['page-a', 'page-b', 'page-c']);

    expect(spreads).toHaveLength(3);
    expect(spreads[1].left.id).toBe('page-a');
    expect(spreads[1].right.id).toBe('page-b');
    expect(spreads[2].left.id).toBe('page-c');
    expect(spreads[2].right.type).toBe('blank');
  });

  it('finds the spread containing a requested recipe page', () => {
    const spreads = buildCookbookSpreads(['page-a', 'page-b', 'page-c']);

    expect(getSpreadIndexForPage(spreads, 'page-b')).toBe(1);
    expect(getSpreadIndexForPage(spreads, 'missing')).toBeNull();
  });
});
