import {
  buildCookbookSpreads,
  getAdjacentRecipePageIndex,
  getReaderPageIndex,
  getSpreadIndexForPage,
  shouldAutoHideReaderChrome,
  shouldUseTouchPaging,
} from '@/utils/cookbook/reader';

describe('reader chrome visibility', () => {
  it('auto-hides on every platform; turns and taps restore it', () => {
    expect(shouldAutoHideReaderChrome('web')).toBe(true);
    expect(shouldAutoHideReaderChrome('ios')).toBe(true);
    expect(shouldAutoHideReaderChrome('android')).toBe(true);
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

describe('reader page mapping without a table of contents', () => {
  const pageIds = ['page-a', 'page-b', 'page-c'];

  it('places recipes immediately after the bookplate', () => {
    expect(getReaderPageIndex(pageIds, 'page-a')).toBe(1);
    expect(getReaderPageIndex(pageIds, 'page-c')).toBe(3);
  });

  it('does not redirect the reader for a missing target', () => {
    expect(getReaderPageIndex(pageIds, 'missing')).toBeNull();
    expect(getReaderPageIndex(pageIds, undefined)).toBeNull();
  });
});

describe('physical cookbook spreads', () => {
  it('opens with the bookplate on the left and first recipe on the right', () => {
    const [opening] = buildCookbookSpreads(['page-a']);
    expect(opening.left).toEqual({ type: 'bookplate', id: 'bookplate' });
    expect(opening.right).toEqual({ type: 'recipe', id: 'page-a', pageIndex: 0 });
  });

  it('pairs subsequent recipe pages without inserting a contents surface', () => {
    const spreads = buildCookbookSpreads(['page-a', 'page-b', 'page-c']);
    expect(spreads).toHaveLength(2);
    expect(spreads[1].left.id).toBe('page-b');
    expect(spreads[1].right.id).toBe('page-c');
  });

  it('pads an even recipe count with a final blank leaf', () => {
    const spreads = buildCookbookSpreads(['page-a', 'page-b']);
    expect(spreads[1].left.id).toBe('page-b');
    expect(spreads[1].right.type).toBe('blank');
  });

  it('finds the spread containing a requested recipe page', () => {
    const spreads = buildCookbookSpreads(['page-a', 'page-b', 'page-c']);
    expect(getSpreadIndexForPage(spreads, 'page-b')).toBe(1);
    expect(getSpreadIndexForPage(spreads, 'missing')).toBeNull();
  });
});
