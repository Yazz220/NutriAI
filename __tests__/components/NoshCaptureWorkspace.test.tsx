import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { NoshCaptureWorkspace } from '@/components/nosh/capture/NoshCaptureWorkspace';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const mockRouter = { push: jest.fn(), replace: jest.fn() };
let mockCaptures: RecipeCapture[] = [];
const mockRetryCapture = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/utils/cookbook/api', () => ({ uploadRecipeCaptureImage: jest.fn() }));
jest.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
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
    startCapture: jest.fn(),
    retryCapture: mockRetryCapture,
    prepareDestination: jest.fn(),
    isStarting: false,
    isRetrying: false,
    isPreparingDestination: false,
  }),
}));
jest.mock('@/components/cookbook/UnifiedIntakeComposer', () => {
  const mockReact = require('react');
  const { Text, View } = require('react-native');
  return {
    UnifiedIntakeComposer: () => mockReact.createElement(
      View,
      null,
      mockReact.createElement(Text, null, 'Recipe composer'),
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

describe('NoshCaptureWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCaptures = [];
  });

  it('keeps recipe activity with the source composer', () => {
    mockCaptures = [
      capture({ id: 'working' }),
      capture({ id: 'failed', status: 'needs_attention', failureMessage: 'Could not read source.' }),
      capture({ id: 'ready', status: 'ready', pageStatus: 'ready', pageId: 'page-1' }),
    ];
    const screen = render(<NoshCaptureWorkspace />);

    expect(screen.getByText('Recipe composer')).toBeTruthy();
    expect(screen.getByText('Recipe activity')).toBeTruthy();
    expect(screen.getByText('Reading recipe')).toBeTruthy();
    expect(screen.getByText('Try again')).toBeTruthy();
    expect(screen.getByText('Ready')).toBeTruthy();
  });

  it('shows live background progress while a page is processing', () => {
    mockCaptures = [capture({
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
      pageStatus: 'generating',
    })];
    const screen = render(<NoshCaptureWorkspace captureId="capture-1" />);

    expect(screen.getByText('Creating your cookbook page')).toBeTruthy();
    expect(screen.getByText('Source saved')).toBeTruthy();
    expect(screen.getByText('Recipe understood')).toBeTruthy();
    expect(screen.getByText('Page added to cookbook')).toBeTruthy();
    expect(screen.getByText(/nothing will be lost/i)).toBeTruthy();
  });

  it('keeps failure recovery in the same workspace', () => {
    mockCaptures = [capture({
      status: 'needs_attention',
      failureMessage: 'The video could not be opened.',
    })];
    const screen = render(<NoshCaptureWorkspace captureId="capture-1" />);

    expect(screen.getByText('This page needs another try')).toBeTruthy();
    expect(screen.getByText('The video could not be opened.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRetryCapture).toHaveBeenCalledWith('capture-1');
  });

  it('shows completion before the user chooses to open the recipe', () => {
    mockCaptures = [capture({
      status: 'ready',
      pageStatus: 'ready',
      pageId: 'page-1',
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    })];
    const screen = render(<NoshCaptureWorkspace captureId="capture-1" />);

    expect(screen.getByText('Your page is ready')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open recipe' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save another recipe' })).toBeTruthy();
  });

  it('offers cookbook choice only when destination resolution needs it', () => {
    mockCaptures = [capture({
      status: 'needs_destination',
      destinationCookbookId: undefined,
      recipeGraph: { title: 'Tomato Pasta' } as RecipeCapture['recipeGraph'],
    })];
    const screen = render(<NoshCaptureWorkspace captureId="capture-1" />);

    expect(screen.getByText('Choose cookbook')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add recipe to Family Table' })).toBeTruthy();
  });
});
