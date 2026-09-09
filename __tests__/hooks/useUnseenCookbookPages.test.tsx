import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useUnseenCookbookPages } from '@/hooks/useUnseenCookbookPages';
import type { CookbookPage } from '@/types/cookbook';

function page(id: string, lifecycleStatus: 'processing' | 'approved' = 'approved'): CookbookPage {
  return {
    id,
    cookbookId: 'book-1',
    recipeId: `recipe-${id}`,
    title: id,
    section: 'dinner',
    pageNumber: 1,
    sortOrder: 0,
    lifecycleStatus,
  };
}

describe('useUnseenCookbookPages', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('marks a processing page when it becomes ready and clears it on open', async () => {
    const hook = renderHook(
      ({ pages }: { pages: CookbookPage[] }) =>
        useUnseenCookbookPages({
          userId: 'user-1',
          cookbookId: 'book-1',
          pages,
        }),
      { initialProps: { pages: [page('page-1'), page('page-2', 'processing')] } },
    );

    await waitFor(() => expect(hook.result.current.isReady).toBe(true));
    expect([...hook.result.current.unseenPageIds]).toEqual([]);

    hook.rerender({ pages: [page('page-1'), page('page-2')] });
    await waitFor(() => expect([...hook.result.current.unseenPageIds]).toEqual(['page-2']));

    await act(async () => {
      await hook.result.current.markPageSeen('page-2');
    });
    expect([...hook.result.current.unseenPageIds]).toEqual([]);
  });
});
