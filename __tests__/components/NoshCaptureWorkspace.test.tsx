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
let mockCookbooks = [{
  id: 'book-1',
  userId: 'user-1',
  title: 'Family Table',
  coverStyle: 'sage-linen',
  coverFinishId: 'fine-cloth',
  coverColorId: 'sage',
}];
const mockRetryCapture = jest.fn();
const mockDiscardCapture = jest.fn();
const mockCorrectCapture = jest.fn();
const mockStartCapture = jest.fn();
const mockUploadRecipeCaptureImage = jest.fn();
const mockUploadRecipeCaptureImages = jest.fn();
const mockRemoveRecipeCaptureStoragePaths = jest.fn();
const mockTrackEvent = jest.fn();
const mockCloseNoshConversation = jest.fn();
const mockRequestConsent = jest.fn().mockResolvedValue(true);
const mockRequestPageAccess = jest.fn().mockResolvedValue(true);
const mockRefreshSubscription = jest.fn().mockResolvedValue(null);
const mockShowToast = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/utils/cookbook/api', () => ({
  applyRecipePageRevision: jest.fn(),
  fetchPageById: jest.fn(),
  removeRecipeCaptureStoragePaths: (...args: unknown[]) => mockRemoveRecipeCaptureStoragePaths(...args),
  updatePageSelectedVersion: jest.fn(),
  uploadRecipeCaptureImage: (...args: unknown[]) => mockUploadRecipeCaptureImage(...args),
  uploadRecipeCaptureImages: (...args: unknown[]) => mockUploadRecipeCaptureImages(...args),
}));
jest.mock('@/utils/cookbook/collectionActions', () => ({
  createCollectionActionRequestKey: () => 'collection:test',
  organizeRecipePage: jest.fn(),
  removeRecipePage: jest.fn(),
}));
jest.mock('@/utils/analytics', () => ({ trackEvent: (...args: unknown[]) => mockTrackEvent(...args) }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/contexts/NoshConversationContext', () => ({
  useNoshConversation: () => ({ close: mockCloseNoshConversation }),
}));
jest.mock('@/contexts/AiDataConsentContext', () => ({
  useAiDataConsent: () => ({ requestConsent: mockRequestConsent }),
}));
jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({ refresh: mockRefreshSubscription }),
}));
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));
jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => ({
    cookbooks: mockCookbooks,
    refresh: jest.fn().mockResolvedValue(undefined),
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
    discardCapture: mockDiscardCapture,
    correctCapture: mockCorrectCapture,
    prepareDestination: jest.fn(),
    isStarting: false,
    isRetrying: false,
    isCorrecting: false,
    isPreparingDestination: false,
    isDiscarding: false,
  }),
}));
jest.mock('@/components/subscription/SubscriptionHost', () => ({
  useSubscriptionUi: () => ({ requestPageAccess: mockRequestPageAccess }),
}));
jest.mock('@/components/cookbook/CookbookDestinationCarousel', () => {
  const mockReact = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    CookbookDestinationCarousel: ({ cookbooks, selectedCookbookId, onSelect }: {
      cookbooks: Array<{ id: string; title: string }>;
      selectedCookbookId?: string;
      onSelect: (cookbookId: string) => void;
    }) => mockReact.createElement(
      View,
      null,
      mockReact.createElement(
        Text,
        null,
        `Destination carousel: ${cookbooks.find((book) => book.id === selectedCookbookId)?.title ?? 'none'}`,
      ),
      ...cookbooks.map((book) => mockReact.createElement(
        Pressable,
        {
          key: book.id,
          accessibilityRole: 'button',
          accessibilityLabel: `Add recipes to ${book.title}`,
          onPress: () => onSelect(book.id),
        },
        mockReact.createElement(Text, null, book.title),
      )),
    ),
  };
});
jest.mock('@/components/nosh/capture/RecipeCorrectionSheet', () => {
  const mockReact = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    RecipeCorrectionSheet: ({ visible, recipeGraph, onSubmit }: {
      visible: boolean;
      recipeGraph: RecipeCapture['recipeGraph'];
      onSubmit: (recipeGraph: RecipeCapture['recipeGraph']) => Promise<void>;
    }) => visible ? mockReact.createElement(
      View,
      null,
      mockReact.createElement(Text, null, 'Recipe correction sheet'),
      mockReact.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Save corrected recipe',
          onPress: () => onSubmit(recipeGraph),
        },
        mockReact.createElement(Text, null, 'Save corrected recipe'),
      ),
    ) : null,
  };
});
jest.mock('@/hooks/useCookbook', () => ({
  useCookbook: () => ({
    cookbook: { id: 'book-1', title: 'Family Table' },
    pageSlots: mockPageSlots,
    hasPageData: true,
    refresh: jest.fn().mockResolvedValue(undefined),
    upsertPage: jest.fn(),
  }),
}));
jest.mock('@/hooks/useCookbookPageOrder', () => ({
  useCookbookPageOrder: () => ({ movePage: jest.fn(), isReordering: false, error: null }),
}));
jest.mock('@/components/cookbook/CookbookPageGrid', () => {
  const mockReact = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    CookbookPageGrid: ({
      pageSlots,
      captures,
      onOpenPage,
      onPageActions,
      contextActionsFor,
      onOpenCapture,
      onCaptureActions,
      onMovePage,
    }: {
      pageSlots: CookbookPage[];
      captures: RecipeCapture[];
      onOpenPage: (page: CookbookPage) => void;
      onPageActions?: (page: CookbookPage) => void;
      contextActionsFor?: (page: CookbookPage) => { actions: { title: string }[] }[];
      onOpenCapture?: (capture: RecipeCapture) => void;
      onCaptureActions?: (capture: RecipeCapture) => void;
      onMovePage?: (input: unknown) => void;
    }) => mockReact.createElement(
      View,
      null,
      mockReact.createElement(Text, null, `Cookbook grid: ${pageSlots.length} pages`),
      mockReact.createElement(Text, null, `Grid activity: ${captures.map((item) => item.status).join(',')}`),
      mockReact.createElement(Text, null, `Reordering: ${onMovePage ? 'enabled' : 'disabled'}`),
      ...pageSlots.map((item) => mockReact.createElement(
        View,
        { key: item.id },
        mockReact.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: `Open grid page ${item.title}`,
            onPress: () => onOpenPage(item),
          },
          mockReact.createElement(Text, null, item.title),
        ),
        onPageActions ? mockReact.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: `Actions for grid page ${item.title}`,
            onPress: () => onPageActions(item),
          },
          mockReact.createElement(Text, null, 'Page actions'),
        ) : null,
        ...(contextActionsFor?.(item).flatMap((group) => group.actions).map((action) =>
          mockReact.createElement(Text, { key: action.title }, action.title)
        ) ?? []),
      )),
      ...captures
        .filter((item) => item.status === 'needs_attention' || item.status === 'needs_destination')
        .map((item) => mockReact.createElement(
          View,
          { key: item.id },
          mockReact.createElement(
            Pressable,
            {
              accessibilityRole: 'button',
              accessibilityLabel: `Open capture ${item.id}`,
              onPress: () => onOpenCapture?.(item),
            },
            mockReact.createElement(Text, null, item.recipeGraph?.title ?? item.id),
          ),
          onCaptureActions ? mockReact.createElement(
            Pressable,
            {
              accessibilityRole: 'button',
              accessibilityLabel: `Quick actions for capture ${item.id}`,
              onPress: () => onCaptureActions(item),
            },
            mockReact.createElement(Text, null, 'Quick actions'),
          ) : null,
        )),
    ),
  };
});
jest.mock('@/components/cookbook/ReaderActionSheets', () => {
  const mockReact = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    RecipeActionsSheet: ({ visible, page, onClose, onEdit }: {
      visible: boolean;
      page: CookbookPage | null;
      onClose: () => void;
      onEdit?: (page: CookbookPage) => void;
    }) => visible && page ? mockReact.createElement(
      View,
      null,
      mockReact.createElement(Text, null, `Recipe actions for ${page.title}`),
      onEdit ? mockReact.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Edit recipe from actions',
          onPress: () => {
            onClose();
            onEdit(page);
          },
        },
        mockReact.createElement(Text, null, 'Edit recipe'),
      ) : null,
    ) : null,
  };
});
jest.mock('@/components/cookbook/RecipeRevisionSheet', () => {
  const mockReact = require('react');
  const { Text } = require('react-native');
  return {
    RecipeRevisionSheet: ({ visible, mode }: { visible: boolean; mode: string }) =>
      visible ? mockReact.createElement(Text, null, `Revision mode: ${mode}`) : null,
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
      mockReact.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          accessibilityLabel: 'Submit test image set',
          disabled: isSubmitting,
          onPress: () => onSubmit({
            type: 'image',
            imageUri: 'file:///page-1.jpg',
            mimeType: 'image/jpeg',
            additionalImages: [
              { uri: 'file:///page-2.jpg', mimeType: 'image/jpeg' },
            ],
          }),
        },
        mockReact.createElement(Text, null, 'Create image set'),
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
    stageCheckpoints: {},
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
    mockCookbooks = [{
      id: 'book-1',
      userId: 'user-1',
      title: 'Family Table',
      coverStyle: 'sage-linen',
      coverFinishId: 'fine-cloth',
      coverColorId: 'sage',
    }];
    mockRequestPageAccess.mockReset().mockResolvedValue(true);
    await AsyncStorage.clear();
  });

  it('keeps the source composer focused when activity is closed', async () => {
    mockCaptures = [
      capture({ id: 'working' }),
      capture({ id: 'failed', status: 'needs_attention', failureMessage: 'Could not read source.' }),
      capture({ id: 'ready', status: 'ready', pageStatus: 'ready', pageId: 'page-1' }),
    ];
    const screen = await renderWorkspace();

    expect(screen.getByText('Recipe composer')).toBeTruthy();
    expect(screen.queryByText('Active')).toBeNull();
    expect(screen.queryByText('Recent')).toBeNull();
  });

  it('keeps the page workspace and reordering beneath the simplified composer', async () => {
    const screen = await renderWorkspace();

    expect(screen.getByText('Destination carousel: Family Table')).toBeTruthy();
    expect(screen.getByText('Cookbook grid: 0 pages')).toBeTruthy();
    expect(screen.getByText('Reordering: enabled')).toBeTruthy();
    expect(screen.queryByText(/page creations left/i)).toBeNull();
    expect(screen.queryByText('COOKBOOK WORKSPACE')).toBeNull();
    expect(screen.queryByText('Tap a page to read it. Long-press and drag a finished page to reorder.')).toBeNull();
  });

  it('allows a new destination after the previous capture becomes ready', async () => {
    mockCookbooks = [
      mockCookbooks[0],
      {
        id: 'book-2',
        userId: 'user-1',
        title: 'Weeknight Book',
        coverStyle: 'sage-linen',
        coverFinishId: 'fine-cloth',
        coverColorId: 'sage',
      },
    ];
    mockCaptures = [capture({ status: 'ready', destinationCookbookId: 'book-1' })];
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    fireEvent.press(screen.getByRole('button', { name: 'Add recipes to Weeknight Book' }));

    await waitFor(() => expect(screen.getByText('Destination carousel: Weeknight Book')).toBeTruthy());
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

  it('opens unfinished work directly from the cookbook grid', async () => {
    mockCaptures = [
      capture({ id: 'failed', status: 'needs_attention', failureMessage: 'Could not read source.' }),
      capture({ id: 'ready', status: 'ready', pageStatus: 'ready', pageId: 'page-1' }),
    ];
    const screen = await renderWorkspace();

    expect(screen.getByText('Recipe composer')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Open capture failed' }));
    expect(screen.getByText('This recipe needs another try')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByText('Recipe composer')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close recipe recovery' })).toBeTruthy();
  });

  it('removes an abandoned capture from its recovery popup', async () => {
    mockCaptures = [capture({
      status: 'needs_attention',
      failureMessage: 'Could not read source.',
    })];
    mockDiscardCapture.mockResolvedValueOnce(undefined);
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    fireEvent.press(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByText('Remove this item?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Remove recipe item permanently' }));

    await waitFor(() => expect(mockDiscardCapture).toHaveBeenCalledWith('capture-1'));
    expect(screen.getByText('Recipe composer')).toBeTruthy();
  });

  it('opens terse quick actions for a failed capture without opening its detail card', async () => {
    mockCaptures = [capture({
      status: 'needs_attention',
      failureCode: 'blank_or_empty_source',
      failureMessage: 'This source appears blank.',
    })];
    const screen = await renderWorkspace();

    fireEvent.press(screen.getByRole('button', { name: 'Quick actions for capture capture-1' }));

    expect(screen.getByRole('button', { name: 'Choose another source' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeTruthy();
    expect(screen.queryByText(
      'This source appears blank or contains too little visible information. Choose a clearer source.',
    )).toBeNull();
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

    expect(screen.getByText('This recipe needs another try')).toBeTruthy();
    expect(screen.getByText('The video could not be opened.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(mockRequestConsent).toHaveBeenCalledTimes(1);
      expect(mockRetryCapture).toHaveBeenCalledWith('capture-1');
    });
  });

  it('uploads an ordered image set into one capture source', async () => {
    mockUploadRecipeCaptureImages.mockResolvedValueOnce({
      storagePath: 'user-1/request-1.jpg',
      mimeType: 'image/jpeg',
      additionalImagePaths: ['user-1/request-2.jpg'],
    });
    mockStartCapture.mockResolvedValueOnce({ capture: capture() });
    const screen = await renderWorkspace({ destinationCookbookId: 'book-1' });

    fireEvent.press(screen.getByRole('button', { name: 'Submit test image set' }));

    await waitFor(() => expect(mockStartCapture).toHaveBeenCalledWith(expect.objectContaining({
      source: expect.objectContaining({
        type: 'image',
        storagePath: 'user-1/request-1.jpg',
        additionalImagePaths: ['user-1/request-2.jpg'],
      }),
    })));
    expect(mockUploadRecipeCaptureImages).toHaveBeenCalledWith(expect.objectContaining({
      images: [
        expect.objectContaining({ imageUri: 'file:///page-1.jpg' }),
        expect.objectContaining({ imageUri: 'file:///page-2.jpg' }),
      ],
    }));
    expect(mockRemoveRecipeCaptureStoragePaths).not.toHaveBeenCalled();
  });

  it('removes uploaded images when durable capture creation fails', async () => {
    mockRemoveRecipeCaptureStoragePaths.mockResolvedValueOnce(undefined);
    mockUploadRecipeCaptureImages.mockResolvedValueOnce({
      storagePath: 'user-1/failed-1.jpg',
      mimeType: 'image/jpeg',
      additionalImagePaths: ['user-1/failed-2.jpg'],
    });
    mockStartCapture.mockRejectedValueOnce(new Error('Capture service unavailable'));
    const screen = await renderWorkspace({ destinationCookbookId: 'book-1' });

    fireEvent.press(screen.getByRole('button', { name: 'Submit test image set' }));

    await waitFor(() => expect(mockRemoveRecipeCaptureStoragePaths).toHaveBeenCalledWith([
      'user-1/failed-1.jpg',
      'user-1/failed-2.jpg',
    ]));
  });

  it('uses the subscription recovery path and retries the same durable capture after access returns', async () => {
    mockCaptures = [capture({
      status: 'needs_attention',
      failureCode: 'designed_page_limit_reached',
      failureMessage: 'designed_page_limit_reached',
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    })];
    mockRetryCapture.mockResolvedValueOnce({ capture: capture({ status: 'processing' }) });
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.getByText('This recipe is ready for its page')).toBeTruthy();
    expect(screen.queryByText('This recipe needs another try')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Continue page creation' }));

    await waitFor(() => {
      expect(mockRequestPageAccess).toHaveBeenCalledWith('page_capture', { refresh: true });
      expect(mockRetryCapture).toHaveBeenCalledWith('capture-1');
    });
  });

  it('keeps the source intact when page access is not available', async () => {
    mockRequestPageAccess.mockResolvedValueOnce(false);
    const screen = await renderWorkspace({ destinationCookbookId: 'book-1' });

    fireEvent.press(screen.getByRole('button', { name: 'Submit test image' }));

    await waitFor(() => expect(mockRequestPageAccess).toHaveBeenCalledWith('page_capture'));
    expect(mockUploadRecipeCaptureImage).not.toHaveBeenCalled();
    expect(mockStartCapture).not.toHaveBeenCalled();
    expect(screen.getByText('Create page')).toBeTruthy();
  });

  it('returns evidence failures to the composer instead of retrying the bad source', async () => {
    mockCaptures = [capture({
      status: 'needs_attention',
      failureCode: 'blank_or_empty_source',
      failureMessage: 'This source appears blank.',
    })];
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.getByText('This does not look like a recipe')).toBeTruthy();
    expect(screen.getByText(
      'This source appears blank or contains too little visible information. Choose a clearer source.',
    )).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Choose another source' }));

    await waitFor(() => expect(screen.getByText('Recipe composer')).toBeTruthy());
    expect(mockRetryCapture).not.toHaveBeenCalled();
  });

  it('retires the abandoned capture after a replacement source starts', async () => {
    mockCaptures = [capture({
      status: 'needs_attention',
      failureCode: 'blank_or_empty_source',
      failureMessage: 'This source appears blank.',
    })];
    mockUploadRecipeCaptureImage.mockResolvedValueOnce({
      storagePath: 'user-1/replacement.jpg',
      mimeType: 'image/jpeg',
    });
    mockStartCapture.mockResolvedValueOnce({ capture: capture({ id: 'capture-2', status: 'processing' }) });
    mockDiscardCapture.mockResolvedValueOnce(undefined);
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    fireEvent.press(screen.getByRole('button', { name: 'Choose another source' }));
    fireEvent.press(screen.getByRole('button', { name: 'Submit test image' }));

    await waitFor(() => expect(mockStartCapture).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockDiscardCapture).toHaveBeenCalledWith('capture-1'));
  });

  it('opens a focused correction surface for semantic quality issues', async () => {
    const recipeGraph = {
      title: 'Sheet Pan Chicken',
      ingredientGroups: [{ id: 'default', ingredients: [{ name: 'chicken', quantity: '1' }] }],
      stepGroups: [{ id: 'default', steps: [{ id: 'step-1', text: 'Bake for 25 minutes.' }] }],
      category: 'dinner',
      tags: [],
      provenance: {
        sourceType: 'text',
        confidence: 0.8,
        qualityAssessment: {
          version: 1,
          decision: 'needs_correction',
          issues: [{
            key: 'missing_baking_temperature:stepGroups.0.steps.0.text',
            code: 'missing_baking_temperature',
            severity: 'blocking',
            message: 'The method uses an oven but does not include an oven temperature.',
            fieldPaths: ['stepGroups.0.steps.0.text'],
            confirmed: false,
          }],
          metrics: {
            ingredientCount: 1,
            quantifiedIngredientCount: 1,
            stepCount: 1,
            hasYield: false,
            hasCookingTemperature: false,
            hasCookingDuration: true,
          },
        },
      },
    } as RecipeCapture['recipeGraph'];
    mockCaptures = [capture({
      status: 'needs_attention',
      failureCode: 'needs_recipe_correction',
      recipeGraph,
    })];
    mockCorrectCapture.mockResolvedValueOnce({ capture: capture({ status: 'processing' }) });
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.getByText('Check Sheet Pan Chicken')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Review recipe' }));
    expect(screen.getByText('Recipe correction sheet')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Save corrected recipe' }));

    await waitFor(() => expect(mockCorrectCapture).toHaveBeenCalledWith({
      captureId: 'capture-1',
      recipeGraph,
    }));
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

  it('gives ready Composer pages the cookbook organizer action system', async () => {
    mockCookbooks = [
      mockCookbooks[0],
      {
        id: 'book-2',
        userId: 'user-1',
        title: 'Weeknight Book',
        coverStyle: 'sage-linen',
        coverFinishId: 'fine-cloth',
        coverColorId: 'sage',
      },
    ];
    mockPageSlots = [{
      id: 'page-1',
      cookbookId: 'book-1',
      recipeId: 'recipe-1',
      title: 'Tomato Pasta',
      section: 'dinner',
      pageNumber: 1,
      sortOrder: 0,
      lifecycleStatus: 'approved',
      imageUrl: 'https://example.com/page.jpg',
      recipeGraph: {
        title: 'Tomato Pasta',
        provenance: { sourceUrl: 'https://example.com/recipe' },
      } as CookbookPage['recipeGraph'],
    }];

    const screen = await renderWorkspace({ destinationCookbookId: 'book-1' });

    expect(screen.getByText('Edit recipe')).toBeTruthy();
    expect(screen.getByText('Try another design')).toBeTruthy();
    expect(screen.getByText('Visit original source')).toBeTruthy();
    expect(screen.getByText('Save page image')).toBeTruthy();
    expect(screen.getByText('Share recipe')).toBeTruthy();
    expect(screen.getByText('Move to another cookbook')).toBeTruthy();
    expect(screen.getByText('Remove from cookbook')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Actions for grid page Tomato Pasta' }));
    expect(screen.getByText('Recipe actions for Tomato Pasta')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Edit recipe from actions' }));
    expect(screen.getByText('Revision mode: edit')).toBeTruthy();
  });

  it('offers cookbook choice only when destination resolution needs it', async () => {
    mockCaptures = [capture({
      status: 'needs_destination',
      destinationCookbookId: undefined,
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    })];
    const screen = await renderWorkspace({ captureId: 'capture-1' });

    expect(screen.getAllByText('Tomato Pasta')).toHaveLength(2);
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
      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/(book)/[cookbookId]',
        params: {
          cookbookId: 'book-1',
          pageId: 'page-1',
          returnTo: 'composer',
        },
      });
    });
    expect((await loadFirstRunOnboardingState('user-1')).status).toBe('completed');
    expect(mockTrackEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'first_ready_recipe_opened',
    }));
  });
});
