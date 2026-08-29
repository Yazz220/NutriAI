import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import type { CookbookPage } from '@/types/cookbook';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import {
  loadFirstRunOnboardingState,
  recordFirstCaptureStarted,
  recordFirstCookbookCreated,
} from '@/utils/cookbook/firstRunOnboarding';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockCaptures: RecipeCapture[] = [];
let mockPageSlots: CookbookPage[] = [];
const mockRetryCapture = jest.fn();
const mockStartCapture = jest.fn();
const mockUploadRecipeCaptureImage = jest.fn();
const mockTrackEvent = jest.fn();
const mockCloseNoshConversation = jest.fn();
const mockRequestConsent = jest.fn().mockResolvedValue(true);

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/utils/cookbook/api', () => ({
  uploadRecipeCaptureImage: (...args: unknown[]) => mockUploadRecipeCaptureImage(...args),
}));
jest.mock('@/utils/analytics', () => ({ trackEvent: (...args: unknown[]) => mockTrackEvent(...args) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/contexts/NoshConversationContext', () => ({
  useNoshConversation: () => ({ close: mockCloseNoshConversation }),
}));
jest.mock('@/contexts/AiDataConsentContext', () => ({
  useAiDataConsent: () => ({ requestConsent: mockRequestConsent }),
}));
jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => ({
    cookbooks: [{
      id: 'book-1',
      userId: 'user-1',
      title: 'Family Table',
      coverStyle: 'sage-linen',
    }],
  }),
}));
jest.mock('@/hooks/useRecipeCaptures', () => ({
  useRecipeCaptures: () => ({
    captures: mockCaptures,
    isLoading: false,
    isStale: false,
    error: null,
    refresh: jest.fn(),
    startCapture: (...args: unknown[]) => mockStartCapture(...args),
    retryCapture: mockRetryCapture,
    prepareDestination: jest.fn(),
    isStarting: false,
    isRetrying: false,
    isPreparingDestination: false,
  }),
}));
jest.mock('@/hooks/useCookbook', () => ({
  useCookbook: () => ({
    cookbook: { id: 'book-1', title: 'Family Table' },
    pageSlots: mockPageSlots,
  }),
}));
jest.mock('@/hooks/useCookbookPageOrder', () => ({
  useCookbookPageOrder: () => ({ movePage: jest.fn(), isReordering: false, error: null }),
}));
jest.mock('@/components/cookbook/CookbookPageGrid', () => {
  const mockReact = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    CookbookPageGrid: ({ pageSlots, captures, onOpenPage }: {
      pageSlots: CookbookPage[];
      captures: RecipeCapture[];
      onOpenPage: (page: CookbookPage) => void;
    }) => mockReact.createElement(
      View,
      null,
      mockReact.createElement(Text, null, `Cookbook grid: ${pageSlots.length} pages`),
      mockReact.createElement(Text, null, `Grid activity: ${captures.map((item) => item.status).join(',')}`),
      ...pageSlots.map((item) => mockReact.createElement(
        Pressable,
        {
          key: item.id,
          accessibilityRole: 'button',
          accessibilityLabel: `Open grid page ${item.title}`,
          onPress: () => onOpenPage(item),
        },
        mockReact.createElement(Text, null, item.title),
      )),
    ),
  };
});
jest.mock('@/components/cookbook/UnifiedIntakeComposer', () => {
  const mockReact = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    UnifiedIntakeComposer: ({ isSubmitting, onSubmit }: {
      isSubmitting?: boolean;
      onSubmit: (payload: unknown) => Promise<void>;
    }) => mockReact.createElement(
      View,
      null,
      mockReact.createElement(Text, null, 'Recipe composer'),
      mockReact.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Submit test image',
          disabled: isSubmitting,
          onPress: () => onSubmit({
            type: 'image',
            imageUri: 'file:///recipe.jpg',
            mimeType: 'image/jpeg',
          }),
        },
        mockReact.createElement(Text, null, isSubmitting ? 'Starting page' : 'Create page'),
      ),
    ),
  };
});
jest.mock('@/components/ui/Button', () => {
  const mockReact = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ title, onPress }: { title: string; onPress: () => void }) => mockReact.createElement(
      Pressable,
      { accessibilityRole: 'button', accessibilityLabel: title, onPress },
      mockReact.createElement(Text, null, title),
    ),
  };
});

function capture(overrides: Partial<RecipeCapture> = {}): RecipeCapture {
  return {
    id: 'capture-1',
    userId: 'user-1',
    destinationCookbookId: 'book-1',
    sourceType: 'url',
    sourcePayload: { input: 'https://example.com/recipe' },
    status: 'processing',
    extractionNotes: [],
    inferredFields: [],
    pageStatus: 'not_started',
    idempotencyKey: 'capture-request-123456',
    processingAttempt: 1,
    createdAt: '2026-08-23T10:00:00.000Z',
    updatedAt: '2026-08-23T10:00:00.000Z',
    ...overrides,
  };
}

async function renderWorkspace(
  props: React.ComponentProps<typeof NoshCaptureWorkspace> = {},
) {
  const screen = render(<NoshCaptureWorkspace {...props} />);
  await act(async () => {});
  return screen;
}

describe('NoshCaptureWorkspace', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockCaptures = [];
    mockPageSlots = [];
    await AsyncStorage.clear();
  });

  it('keeps the source composer focused when activity is closed', async () => {
    mockCaptures = [
      capture({ id: 'working' }),
      capture({ id: 'failed', status: 'needs_attention', failureMessage: 'Could not read source.' }),
      capture({ id: 'ready', status: 'ready', pageStatus: 'ready', pageId: 'page-1' }),
    ];
    const screen = await renderWorkspace({ activityVisible: false });

    expect(screen.getByText('Recipe composer')).toBeTruthy();
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.queryByText('Recent')).toBeNull();
  });

  it('stays busy through photo upload and ignores a duplicate submission', async () => {
    let finishUpload!: (value: { storagePath: string; mimeType: string }) => void;
    mockUploadRecipeCaptureImage.mockImplementationOnce(() => new Promise((resolve) => {
      finishUpload = resolve;
    }));
    mockStartCapture.mockResolvedValueOnce({ capture: capture() });
    const screen = await renderWorkspace({ destinationCookbookId: 'book-1' });
    const submit = screen.getByRole('button', { name: 'Submit test image' });

    fireEvent.press(submit);
    await waitFor(() => expect(screen.getByText('Starting page')).toBeTruthy());
    fireEvent.press(submit);
    expect(mockUploadRecipeCaptureImage).toHaveBeenCalledTimes(1);
    expect(mockStartCapture).not.toHaveBeenCalled();

    await act(async () => {
      finishUpload({ storagePath: 'user-1/request.jpg', mimeType: 'image/jpeg' });
    });

    await waitFor(() => expect(mockStartCapture).toHaveBeenCalledTimes(1));
    expect(mockUploadRecipeCaptureImage).toHaveBeenCalledWith(expect.objectContaining({
      imageUri: 'file:///recipe.jpg',
      mimeType: 'image/jpeg',
    }));
  });

  it('keeps only unfinished work in recipe activity', async () => {
    mockCaptures = [
      capture({ id: 'working' }),
      capture({ id: 'failed', status: 'needs_attention', failureMessage: 'Could not read source.' }),
      capture({ id: 'ready', status: 'ready', pageStatus: 'ready', pageId: 'page-1' }),
    ];
    const screen = await renderWorkspace({ activityVisible: true });

    expect(screen.queryByText('Recipe composer')).toBeNull();
    expect(screen.getByText('Active')).toBeTruthy();
    expect(screen.queryByText('Recent')).toBeNull();
    expect(screen.getByText('Reading recipe')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.queryByText('Ready')).toBeNull();
  });

  it('frames the first capture around a recipe the user already loves', async () => {
    await recordFirstCookbookCreated('user-1', 'book-1');

    const screen = await renderWorkspace({ destinationCookbookId: 'book-1' });

    expect(await screen.findByText('Start with a recipe you already love.')).toBeTruthy();
    expect(screen.getByText('Recipe composer')).toBeTruthy();
  });

  it('keeps live generation inside the cookbook workspace', async () => {
    mockCaptures = [capture({
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
      pageStatus: 'generating',
    })];
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.getByText('Recipe composer')).toBeTruthy();
    expect(screen.getAllByText('Family Table').length).toBeGreaterThan(0);
    expect(screen.getByText('Grid activity: processing')).toBeTruthy();
    expect(screen.queryByText('Creating your cookbook page')).toBeNull();
  });

  it('keeps failure recovery in the same workspace', async () => {
    mockCaptures = [capture({
      status: 'needs_attention',
      failureMessage: 'The video could not be opened.',
    })];
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.getByText('This page needs another try')).toBeTruthy();
    expect(screen.getByText('The video could not be opened.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(mockRequestConsent).toHaveBeenCalledTimes(1);
      expect(mockRetryCapture).toHaveBeenCalledWith('capture-1');
    });
  });

  it('replaces completion cards with the finished page in the grid', async () => {
    mockCaptures = [capture({
      status: 'ready',
      pageStatus: 'ready',
      pageId: 'page-1',
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    })];
    mockPageSlots = [{
      id: 'page-1',
      cookbookId: 'book-1',
      recipeId: 'recipe-1',
      title: 'Tomato Pasta',
      section: 'dinner',
      pageNumber: 1,
      sortOrder: 0,
      lifecycleStatus: 'approved',
      captureId: 'capture-1',
    }];
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.queryByText('Your page is ready')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open grid page Tomato Pasta' })).toBeTruthy();
    expect(screen.getByText('Recipe composer')).toBeTruthy();
  });

  it('offers cookbook choice only when destination resolution needs it', async () => {
    mockCaptures = [capture({
      status: 'needs_destination',
      destinationCookbookId: undefined,
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    })];
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.getByText('Tomato Pasta')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add recipe to Family Table' })).toBeTruthy();
  });

  it('carries first-run guidance through ready-page activation', async () => {
    await recordFirstCookbookCreated('user-1', 'book-1');
    await recordFirstCaptureStarted('user-1', 'capture-1', 'book-1');
    mockCaptures = [capture({
      status: 'ready',
      pageStatus: 'ready',
      pageId: 'page-1',
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    })];
    mockPageSlots = [{
      id: 'page-1',
      cookbookId: 'book-1',
      recipeId: 'recipe-1',
      title: 'Tomato Pasta',
      section: 'dinner',
      pageNumber: 1,
      sortOrder: 0,
      lifecycleStatus: 'approved',
      captureId: 'capture-1',
    }];

    const screen = await renderWorkspace({
      destinationCookbookId: 'book-1',
      captureId: 'capture-1',
    });

    expect(await screen.findByText('Start with a recipe you already love.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open grid page Tomato Pasta' }));

    await waitFor(() => {
      expect(mockCloseNoshConversation).toHaveBeenCalledTimes(1);
      expect(mockRouter.replace).toHaveBeenCalledWith('/(book)/book-1?pageId=page-1');
    });
    expect((await loadFirstRunOnboardingState('user-1')).status).toBe('completed');
    expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'first_ready_recipe_opened',
    }));
  });
});
