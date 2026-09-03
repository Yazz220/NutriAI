import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCookbookReaderPosition } from '@/hooks/useCookbookReaderPosition';
import {
  loadCookbookReaderPosition,
  saveCookbookReaderPosition,
} from '@/utils/cookbook/readerPosition';

describe('useCookbookReaderPosition', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('hydrates the saved page before declaring the reader ready', async () => {
    await saveCookbookReaderPosition('user-1', 'book-1', 'page-2', 1, 'spread');

    const hook = renderHook(() => useCookbookReaderPosition({
      userId: 'user-1',
      cookbookId: 'book-1',
      pageIds: ['page-1', 'page-2', 'page-3'],
    }));

    expect(hook.result.current.isReady).toBe(false);
    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    expect(hook.result.current.pageId).toBe('page-2');
    expect(hook.result.current.viewMode).toBe('spread');
  });

  it('lets an explicit page win and records later reading progress', async () => {
    await saveCookbookReaderPosition('user-1', 'book-1', 'page-2', 1, 'spread');
    const hook = renderHook(() => useCookbookReaderPosition({
      userId: 'user-1',
      cookbookId: 'book-1',
      pageIds: ['page-1', 'page-2', 'page-3'],
      requestedPageId: 'page-1',
    }));

    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    expect(hook.result.current.pageId).toBe('page-1');
    expect(hook.result.current.viewMode).toBeUndefined();

    await act(async () => {
      await hook.result.current.recordPage('page-3', 'page');
    });
    await expect(loadCookbookReaderPosition('user-1', 'book-1')).resolves.toMatchObject({
      pageId: 'page-3',
      pageIndex: 2,
      viewMode: 'page',
    });
  });
});
