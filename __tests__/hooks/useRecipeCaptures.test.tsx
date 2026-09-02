import React, { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRecipeCaptures } from '@/hooks/useRecipeCaptures';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import { fetchPageById, listRecipeCaptures } from '@/utils/cookbook/api';

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/utils/cookbook/cache', () => ({
  loadCachedCaptures: jest.fn().mockResolvedValue(null),
  saveCachedCaptures: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/utils/cookbook/api', () => ({
  correctRecipeCapture: jest.fn(),
  discardRecipeCapture: jest.fn(),
  fetchPageById: jest.fn(),
  listRecipeCaptures: jest.fn(),
  prepareRecipeCaptureDestination: jest.fn(),
  retryRecipeCapture: jest.fn(),
  startRecipeCapture: jest.fn(),
}));

function readyCapture(index: number): RecipeCapture {
  return {
    id: `capture-${index}`,
    userId: 'user-1',
    destinationCookbookId: 'book-1',
    sourceType: 'url',
    sourcePayload: {},
    status: 'ready',
    extractionNotes: [],
    inferredFields: [],
    pageId: `page-${index}`,
    pageStatus: 'ready',
    stageCheckpoints: {},
    idempotencyKey: `request-${index}`,
    processingAttempt: 1,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:01:00.000Z',
  };
}

describe('useRecipeCaptures page synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fetchPageById).mockResolvedValue(null);
  });

  it('does not refetch every historical page when the capture feed loads', async () => {
    jest.mocked(listRecipeCaptures).mockResolvedValue(
      Array.from({ length: 22 }, (_, index) => readyCapture(index)),
    );
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const hook = renderHook(() => useRecipeCaptures(), { wrapper });

    await waitFor(() => expect(hook.result.current.captures).toHaveLength(22));
    expect(fetchPageById).not.toHaveBeenCalled();
  });
});
