import { buildCookbookSpreads, getReaderPageIndex, getSpreadIndexForPage } from '@/utils/cookbook/reader';

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
