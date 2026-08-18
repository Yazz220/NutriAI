import {
  buildCookbookSpreads,
  getAdjacentRecipePageIndex,
  getContentsEntryIndex,
  getContentsRowHeight,
  getReaderPageIndex,
  getSpreadIndexForPage,
  CONTENTS_ENTRIES_BOTTOM,
  CONTENTS_ENTRIES_TOP,
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

describe('contents entries', () => {
  it('shrinks rows to fit every recipe on one page', () => {
    expect(getContentsRowHeight(5)).toBe(80);
    expect(getContentsRowHeight(40)).toBeCloseTo(
      (CONTENTS_ENTRIES_BOTTOM - CONTENTS_ENTRIES_TOP) / 40,
    );
  });

  it('maps a canvas y position to the tapped entry', () => {
    expect(getContentsEntryIndex(CONTENTS_ENTRIES_TOP + 1, 3)).toBe(0);
    // 3 entries cap at 80px rows: the third row spans y 410..490.
    expect(getContentsEntryIndex(CONTENTS_ENTRIES_TOP + 2 * 80 + 40, 3)).toBe(2);
    expect(getContentsEntryIndex(CONTENTS_ENTRIES_TOP + 3 * 80 + 1, 3)).toBeNull();
    // Dense books fill the region: 40 rows of 23px reach the bottom edge.
    expect(getContentsEntryIndex(CONTENTS_ENTRIES_BOTTOM - 1, 40)).toBe(39);
    expect(getContentsEntryIndex(CONTENTS_ENTRIES_TOP - 1, 3)).toBeNull();
    expect(getContentsEntryIndex(CONTENTS_ENTRIES_BOTTOM + 1, 3)).toBeNull();
    expect(getContentsEntryIndex(CONTENTS_ENTRIES_TOP + 1, 0)).toBeNull();
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
