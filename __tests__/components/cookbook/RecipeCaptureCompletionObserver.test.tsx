import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { RecipeCaptureCompletionObserver } from '@/components/cookbook/RecipeCaptureCompletionObserver';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const mockRouter = { push: jest.fn() };
const mockShowToast = jest.fn();
let mockCaptures: RecipeCapture[] = [];
let mockHasData = true;

jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouter.push(...args) },
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
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
});
