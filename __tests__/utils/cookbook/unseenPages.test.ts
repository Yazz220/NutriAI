import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearUnseenCookbookPages,
  markCookbookPageSeen,
  observeReadyCookbookPages,
} from '@/utils/cookbook/unseenPages';

describe('unseen cookbook pages', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('treats existing pages as the baseline and marks only later pages as new', async () => {
    expect(await observeReadyCookbookPages('user-1', 'book-1', ['page-1'])).toEqual([]);

    expect(await observeReadyCookbookPages('user-1', 'book-1', ['page-1', 'page-2'])).toEqual(['page-2']);
    expect(await observeReadyCookbookPages('user-1', 'book-1', ['page-1', 'page-2'])).toEqual(['page-2']);
  });

  it('clears a new-page marker permanently when that page is opened', async () => {
    await observeReadyCookbookPages('user-1', 'book-1', ['page-1']);
    await observeReadyCookbookPages('user-1', 'book-1', ['page-1', 'page-2']);

    expect(await markCookbookPageSeen('user-1', 'book-1', 'page-2')).toEqual([]);
    expect(await observeReadyCookbookPages('user-1', 'book-1', ['page-1', 'page-2'])).toEqual([]);
  });

  it('keeps first-load baselines separate for each cookbook and user', async () => {
    await observeReadyCookbookPages('user-1', 'book-1', ['page-1']);
    expect(await observeReadyCookbookPages('user-1', 'book-2', ['page-2'])).toEqual([]);
    expect(await observeReadyCookbookPages('user-2', 'book-1', ['page-3'])).toEqual([]);

    await observeReadyCookbookPages('user-1', 'book-1', ['page-1', 'page-4']);
    expect(await observeReadyCookbookPages('user-1', 'book-1', ['page-1', 'page-4'])).toEqual(['page-4']);
    expect(await observeReadyCookbookPages('user-1', 'book-2', ['page-2'])).toEqual([]);
  });

  it('removes user-scoped marker state during local cleanup', async () => {
    await observeReadyCookbookPages('user-1', 'book-1', ['page-1']);
    await clearUnseenCookbookPages('user-1');

    expect(await observeReadyCookbookPages('user-1', 'book-1', ['page-1', 'page-2'])).toEqual([]);
  });
});
