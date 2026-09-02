import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { RecipeCaptureCompletionObserver } from '@/components/cookbook/RecipeCaptureCompletionObserver';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const mockRouter = { push: jest.fn() };
const mockShowToast = jest.fn();
const mockSetQueryData = jest.fn();
const mockGetQueryData = jest.fn();
const mockFetchPageById = jest.fn();
let mockCaptures: RecipeCapture[] = [];
let mockHasData = true;
let mockPathname = '/';
let mockConversationVisible = false;
let mockConversationTask = 'collection';

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouter.push(...args) },
  usePathname: () => mockPathname,
}));
jest.mock('@/contexts/NoshConversationContext', () => ({
  useNoshConversation: () => ({
    visible: mockConversationVisible,
    interaction: { task: mockConversationTask },
  }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ getQueryData: mockGetQueryData, setQueryData: mockSetQueryData }),
}));
jest.mock('@/utils/cookbook/api', () => ({
  fetchPageById: (...args: unknown[]) => mockFetchPageById(...args),
}));
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));
jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => ({ cookbooks: [{ id: 'book-1', title: 'Family Table' }] }),
}));
jest.mock('@/hooks/useRecipeCaptures', () => ({
  useRecipeCaptureFeed: () => ({ captures: mockCaptures, hasData: mockHasData, isLoading: false }),
}));

function capture(overrides: Partial<RecipeCapture> = {}): RecipeCapture {
  return {
    id: 'capture-1',
    userId: 'user-1',
    destinationCookbookId: 'book-1',
    sourceType: 'url',
    sourcePayload: { input: 'https://example.com/recipe' },
    status: 'processing',
    recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    extractionNotes: [],
    inferredFields: [],
    pageStatus: 'generating',
    stageCheckpoints: {},
    idempotencyKey: 'capture-request-123456',
    processingAttempt: 1,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    ...overrides,
  };
}

describe('RecipeCaptureCompletionObserver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptures = [];
    mockHasData = true;
    mockPathname = '/';
    mockConversationVisible = false;
    mockConversationTask = 'collection';
    mockGetQueryData.mockReturnValue([]);
    mockFetchPageById.mockResolvedValue({
      id: 'page-1',
      cookbookId: 'book-1',
      recipeId: 'recipe-1',
      title: 'Tomato Pasta',
      section: 'dinner',
      pageNumber: 1,
      sortOrder: 0,
    });
  });

  it('does not announce historical ready pages when the observer mounts', async () => {
    mockHasData = false;
    const screen = render(<RecipeCaptureCompletionObserver />);
    await act(async () => {});

    mockHasData = true;
    mockCaptures = [capture({ status: 'ready', pageStatus: 'ready', pageId: 'page-1' })];
    screen.rerender(<RecipeCaptureCompletionObserver />);

    await act(async () => {});

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockFetchPageById).not.toHaveBeenCalled();
  });

  it('announces a newly ready page with its destination and opens it directly', async () => {
    mockCaptures = [capture()];
    const screen = render(<RecipeCaptureCompletionObserver />);
    await act(async () => {});

    mockCaptures = [capture({
      status: 'ready',
      pageStatus: 'ready',
      pageId: 'page-1',
      updatedAt: '2026-09-02T10:01:00.000Z',
    })];
    screen.rerender(<RecipeCaptureCompletionObserver />);

    await waitFor(() => expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      message: 'Tomato Pasta is ready in Family Table.',
      action: expect.objectContaining({ label: 'Open page' }),
    })));
    await waitFor(() => expect(mockFetchPageById).toHaveBeenCalledTimes(1));
    expect(mockFetchPageById).toHaveBeenCalledWith('page-1');
    expect(mockSetQueryData).toHaveBeenCalledTimes(1);

    const toast = mockShowToast.mock.calls[0][0];
    toast.action.onPress();
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(book)/[cookbookId]',
      params: {
        cookbookId: 'book-1',
        pageId: 'page-1',
        returnTo: 'previous',
      },
    });
  });

  it.each([
    ['the full Composer', '/save', false, 'collection'],
    ['a book Composer', '/book-1/add', false, 'collection'],
    ['a Folio capture sheet', '/book-1', true, 'capture'],
  ])('stays quiet while %s is already presenting capture progress', async (
    _surface,
    pathname,
    conversationVisible,
    conversationTask,
  ) => {
    mockPathname = pathname;
    mockConversationVisible = conversationVisible;
    mockConversationTask = conversationTask;
    mockCaptures = [capture()];
    const screen = render(<RecipeCaptureCompletionObserver />);
    await act(async () => {});

    mockCaptures = [capture({
      status: 'ready',
      pageStatus: 'ready',
      pageId: 'page-1',
      updatedAt: '2026-09-02T10:01:00.000Z',
    })];
    screen.rerender(<RecipeCaptureCompletionObserver />);

    await act(async () => {});
    expect(mockShowToast).not.toHaveBeenCalled();
    await waitFor(() => expect(mockFetchPageById).toHaveBeenCalledTimes(1));
  });
});
