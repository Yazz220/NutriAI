import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CookbooksProvider, useCookbooks } from '@/hooks/useCookbooks';
import type { Cookbook } from '@/types/cookbook';
import {
  listCookbooks,
  updateCookbookAppearance,
} from '@/utils/cookbook/api';
import { saveCachedShelf } from '@/utils/cookbook/cache';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/utils/cookbook/api', () => ({
  createCookbook: jest.fn(),
  deleteCookbook: jest.fn(),
  listCookbooks: jest.fn(),
  retryReaderStorageCleanup: jest.fn().mockResolvedValue(undefined),
  updateCookbookAppearance: jest.fn(),
}));
jest.mock('@/utils/cookbook/cache', () => ({
  loadCachedShelf: jest.fn().mockResolvedValue(null),
  saveCachedShelf: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/utils/cookbook/cacheStatus', () => ({
  isStaleCachedData: () => false,
}));
jest.mock('@/utils/cookbook/sampleCookbook', () => ({
  SAMPLE_COOKBOOK: {},
  shouldShowSampleCookbook: () => false,
}));
jest.mock('@/utils/cookbook/readerPosition', () => ({
  clearCookbookReaderPosition: jest.fn().mockResolvedValue(undefined),
}));

const originalCookbook: Cookbook = {
  id: 'book-1',
  userId: 'user-1',
  title: 'Family Table',
  theme: { name: 'Warm', prompt: 'warm cookbook' },
  sectionOrder: [],
  coverStyle: 'sage-linen',
  coverFinishId: 'fine-cloth',
  coverColorId: 'sage',
  coverTitleColorId: 'gilt',
  coverTitlePlacementId: 'center',
  pageStyleId: 'illustrated',
  styleRevision: 1,
  isDefault: true,
  pageTemplateId: 'clean-cream',
  sections: [],
  pageCount: 4,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const mockedListCookbooks = listCookbooks as jest.MockedFunction<typeof listCookbooks>;
const mockedUpdateCookbook = updateCookbookAppearance as jest.MockedFunction<typeof updateCookbookAppearance>;
const mockedSaveCachedShelf = saveCachedShelf as jest.MockedFunction<typeof saveCachedShelf>;
let queryClients: QueryClient[] = [];

describe('useCookbooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClients = [];
    mockedListCookbooks.mockResolvedValue([originalCookbook]);
  });

  afterEach(() => {
    queryClients.forEach((queryClient) => queryClient.clear());
  });

  it('keeps a saved rename when an older shelf refresh completes afterward', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    queryClients.push(queryClient);
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <CookbooksProvider>{children}</CookbooksProvider>
      </QueryClientProvider>
    );
    const hook = renderHook(() => useCookbooks(), { wrapper });
    await waitFor(() => expect(hook.result.current.cookbooks[0]?.title).toBe('Family Table'));

    let finishStaleRefresh!: (cookbooks: Cookbook[]) => void;
    mockedListCookbooks.mockImplementationOnce(() => new Promise((resolve) => {
      finishStaleRefresh = resolve;
    }));
    let refreshPromise!: Promise<unknown>;
    act(() => {
      refreshPromise = hook.result.current.refresh();
    });
    await waitFor(() => expect(mockedListCookbooks).toHaveBeenCalledTimes(2));

    const renamedCookbook = {
      ...originalCookbook,
      title: 'Sunday Suppers',
      updatedAt: '2026-09-03T00:00:00.000Z',
    };
    mockedUpdateCookbook.mockResolvedValue(renamedCookbook);
    await act(async () => {
      await hook.result.current.updateCookbookAppearance({
        cookbookId: originalCookbook.id,
        details: {
          title: renamedCookbook.title,
          coverFinishId: renamedCookbook.coverFinishId,
          coverColorId: renamedCookbook.coverColorId,
          coverTitleColorId: renamedCookbook.coverTitleColorId,
          coverTitlePlacementId: renamedCookbook.coverTitlePlacementId,
        },
      });
    });

    expect(hook.result.current.cookbooks[0]?.title).toBe('Sunday Suppers');
    await act(async () => {
      finishStaleRefresh([originalCookbook]);
      await refreshPromise;
    });

    expect(hook.result.current.cookbooks[0]?.title).toBe('Sunday Suppers');
    expect(mockedSaveCachedShelf).toHaveBeenCalledWith(
      'user-1',
      expect.arrayContaining([expect.objectContaining({ title: 'Sunday Suppers' })]),
    );
    hook.unmount();
  });

  it('does not report a saved server rename as failed when the device cache cannot write', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    queryClients.push(queryClient);
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>
        <CookbooksProvider>{children}</CookbooksProvider>
      </QueryClientProvider>
    );
    const hook = renderHook(() => useCookbooks(), { wrapper });
    await waitFor(() => expect(hook.result.current.cookbooks[0]?.title).toBe('Family Table'));

    const renamedCookbook = { ...originalCookbook, title: 'Weeknight Favorites' };
    mockedUpdateCookbook.mockResolvedValue(renamedCookbook);
    mockedSaveCachedShelf.mockRejectedValueOnce(new Error('Storage unavailable'));

    await act(async () => {
      await expect(hook.result.current.updateCookbookAppearance({
        cookbookId: originalCookbook.id,
        details: {
          title: renamedCookbook.title,
          coverFinishId: renamedCookbook.coverFinishId,
          coverColorId: renamedCookbook.coverColorId,
          coverTitleColorId: renamedCookbook.coverTitleColorId,
          coverTitlePlacementId: renamedCookbook.coverTitlePlacementId,
        },
      })).resolves.toMatchObject({ title: 'Weeknight Favorites' });
    });

    expect(hook.result.current.cookbooks[0]?.title).toBe('Weeknight Favorites');
    hook.unmount();
  });
});
