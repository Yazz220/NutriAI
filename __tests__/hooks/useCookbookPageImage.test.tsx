import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PageImageLoadingContext, useCookbookPageImageUrl } from '@/hooks/useCookbookPageImage';
import { resolveStoredPageImage } from '@/utils/cookbook/localPageImages';
import { setPageImageUser } from '@/utils/cookbook/pageImageSession';

jest.mock('@/utils/cookbook/localPageImages', () => ({ resolveStoredPageImage: jest.fn() }));
const resolveImage = jest.mocked(resolveStoredPageImage);

beforeEach(() => {
  setPageImageUser('user-a');
  resolveImage.mockReset().mockResolvedValue('file:///documents/original.png');
});
afterEach(() => {
  onlineManager.setOnline(true);
  setPageImageUser(null);
});

it('opens local bytes while React Query considers the device offline', async () => {
  onlineManager.setOnline(false);
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result, unmount } = renderHook(() => useCookbookPageImageUrl('user-a/book/page.png', 'full'), { wrapper });
  await waitFor(() => expect(result.current.data).toBe('file:///documents/original.png'));
  expect(resolveImage).toHaveBeenCalledTimes(1);
  unmount();
  client.clear();
});

it('does not resolve hidden leaves in a closed book, then resolves on opening', async () => {
  const client = new QueryClient();
  let visible = false;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>
      <PageImageLoadingContext.Provider value={visible}>{children}</PageImageLoadingContext.Provider>
    </QueryClientProvider>
  );
  const { result, rerender, unmount } = renderHook(() => useCookbookPageImageUrl('user-a/book/page.png', 'full'), {
    wrapper,
  });
  expect(resolveImage).not.toHaveBeenCalled();
  visible = true;
  rerender({});
  await waitFor(() => expect(result.current.data).toContain('file:///'));
  act(() => setPageImageUser(null));
  expect(result.current.data).toBeUndefined();
  unmount();
  client.clear();
});
