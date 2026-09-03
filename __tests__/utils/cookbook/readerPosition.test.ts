import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearCookbookReaderPosition,
  clearCookbookReaderPositions,
  loadCookbookReaderPosition,
  resolveCookbookReaderPageId,
  saveCookbookReaderPosition,
} from '@/utils/cookbook/readerPosition';

describe('cookbook reader position', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('keeps the last page independently for each user and cookbook', async () => {
    await saveCookbookReaderPosition('user-a', 'book-a', 'page-2', 1, 'spread');
    await saveCookbookReaderPosition('user-a', 'book-b', 'page-7', 6, 'page');

    await expect(loadCookbookReaderPosition('user-a', 'book-a')).resolves.toMatchObject({
      pageId: 'page-2',
      pageIndex: 1,
      viewMode: 'spread',
    });
    await expect(loadCookbookReaderPosition('user-a', 'book-b')).resolves.toMatchObject({
      pageId: 'page-7',
      pageIndex: 6,
      viewMode: 'page',
    });
    await expect(loadCookbookReaderPosition('user-b', 'book-a')).resolves.toBeNull();
  });

  it('follows page identity across reordering and uses its former slot after deletion', () => {
    const position = { pageId: 'page-2', pageIndex: 1, updatedAt: '2026-09-03T00:00:00.000Z' };

    expect(resolveCookbookReaderPageId(position, ['page-3', 'page-2', 'page-1'])).toBe('page-2');
    expect(resolveCookbookReaderPageId(position, ['page-1', 'page-3'])).toBe('page-3');
    expect(resolveCookbookReaderPageId(position, ['page-1'])).toBe('page-1');
    expect(resolveCookbookReaderPageId(position, [])).toBeNull();
  });

  it('clears one deleted cookbook without clearing the rest of the account', async () => {
    await saveCookbookReaderPosition('user-a', 'book-a', 'page-1', 0, 'page');
    await saveCookbookReaderPosition('user-a', 'book-b', 'page-2', 0, 'spread');

    await clearCookbookReaderPosition('user-a', 'book-a');
    await expect(loadCookbookReaderPosition('user-a', 'book-a')).resolves.toBeNull();
    await expect(loadCookbookReaderPosition('user-a', 'book-b')).resolves.toMatchObject({ pageId: 'page-2' });

    await clearCookbookReaderPositions('user-a');
    await expect(loadCookbookReaderPosition('user-a', 'book-b')).resolves.toBeNull();
  });
});
