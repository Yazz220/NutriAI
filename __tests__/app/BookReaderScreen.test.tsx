import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import BookReaderScreen from '@/app/(book)/[cookbookId]';

const mockRequestConsent = jest.fn();
const mockFinishRecipePageCandidate = jest.fn();
const mockUseCookbook = jest.fn();
const mockUseCookbooks = jest.fn();
const mockRecordReaderPage = jest.fn().mockResolvedValue(undefined);
let mockReaderPositionPageId: string | undefined;
let mockReaderPositionViewMode: 'page' | 'spread' | undefined;

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ cookbookId: 'cookbook-1' }),
}));

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('@/contexts/AiDataConsentContext', () => ({
  useAiDataConsent: () => ({ requestConsent: mockRequestConsent }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/hooks/useCookbook', () => ({
  COOKBOOK_PAGES_QUERY_KEY: (id: string) => ['cookbook-pages', id],
  useCookbook: () => mockUseCookbook(),
}));

jest.mock('@/hooks/useCookbooks', () => ({
  useCookbooks: () => mockUseCookbooks(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/useCookbookReaderPosition', () => ({
  useCookbookReaderPosition: () => ({
    isReady: true,
    pageId: mockReaderPositionPageId,
    viewMode: mockReaderPositionViewMode,
    recordPage: mockRecordReaderPage,
  }),
}));

jest.mock('@/hooks/useRecipeCaptures', () => ({
  useRecipeCaptures: () => ({ captures: [] }),
}));

jest.mock('@/hooks/useCookbookPageOrder', () => ({
  useCookbookPageOrder: () => ({ movePage: jest.fn(), isReordering: false, error: null }),
}));

jest.mock('@/utils/cookbook/pageProduction', () => ({
  finishRecipePageCandidate: (...args: unknown[]) => mockFinishRecipePageCandidate(...args),
}));

jest.mock('@/utils/cookbook/api', () => ({
  applyRecipePageRevision: jest.fn(),
  fetchPageById: jest.fn(),
  updatePageSelectedVersion: jest.fn(),
}));

jest.mock('@/utils/cookbook/collectionActions', () => ({
  createCollectionActionRequestKey: () => 'collection-request-1',
  organizeRecipePage: jest.fn(),
  removeRecipePage: jest.fn(),
}));

jest.mock('@/utils/cookbook/share', () => ({
  exportCookbookPageImage: jest.fn(),
  shareCookbookPage: jest.fn(),
}));

jest.mock('@/utils/cookbook/cookbookExport', () => ({ exportCookbookPdf: jest.fn() }));
jest.mock('@/utils/cookbook/readerActions', () => ({ openRecipeSource: jest.fn() }));

jest.mock('@/components/cookbook/BookReader', () => {
  const mockReact = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    BookReader: ({ pages, initialPageId, initialReadingView, onGeneratePageCandidate, onReadingPositionChange }: {
      pages: Array<{ recipeGraph: object }>;
      initialPageId?: string;
      initialReadingView?: 'page' | 'spread';
      onGeneratePageCandidate: (
        page: { recipeGraph: object },
        recipeGraph: object,
        instruction: string,
        idempotencyKey: string,
      ) => Promise<unknown>;
      onReadingPositionChange?: (pageId: string, viewMode: 'page' | 'spread') => void;
    }) => {
      const [status, setStatus] = mockReact.useState('idle');
      const page = pages[0];
      return mockReact.createElement(
        View,
        null,
        mockReact.createElement(Text, { testID: 'reader-initial-page' }, initialPageId ?? 'none'),
        mockReact.createElement(Text, { testID: 'reader-initial-view' }, initialReadingView ?? 'none'),
        mockReact.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: 'Advance remembered page',
            onPress: () => onReadingPositionChange?.('page-next', 'spread'),
          },
          mockReact.createElement(Text, null, 'Advance remembered page'),
        ),
        mockReact.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: 'Try another design',
            onPress: () => {
              void onGeneratePageCandidate(
                page,
                page.recipeGraph,
                'Use a cleaner layout',
                'request-1',
              ).then(
                () => setStatus('generated'),
                () => setStatus('blocked'),
              );
            },
          },
          mockReact.createElement(Text, null, 'Try another design'),
        ),
        mockReact.createElement(Text, null, status),
      );
    },
  };
});

describe('BookReaderScreen AI data consent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } = require('@/utils/cookbook/sampleCookbook');
    mockReaderPositionPageId = SAMPLE_COOKBOOK_PAGES[0].id;
    mockReaderPositionViewMode = 'spread';
    mockUseCookbook.mockReturnValue({
      cookbook: SAMPLE_COOKBOOK,
      pages: [SAMPLE_COOKBOOK_PAGES[0]],
      pageSlots: [SAMPLE_COOKBOOK_PAGES[0]],
      setSelectedPageId: jest.fn(),
      isLoading: false,
      cookbookError: null,
      pagesError: null,
      hasPageData: true,
      isStale: false,
      refresh: jest.fn(),
    });
    mockUseCookbooks.mockReturnValue({
      cookbooks: [SAMPLE_COOKBOOK],
      deleteCookbook: jest.fn(),
      updateCookbookTitle: jest.fn(),
    });
  });

  it('opens at the restored page and records reader progress', () => {
    const screen = render(<BookReaderScreen />);

    expect(screen.getByTestId('reader-initial-page')).toHaveTextContent(mockReaderPositionPageId!);
    expect(screen.getByTestId('reader-initial-view')).toHaveTextContent('spread');
    fireEvent.press(screen.getByRole('button', { name: 'Advance remembered page' }));
    expect(mockRecordReaderPage).toHaveBeenCalledWith('page-next', 'spread');
  });

  it('does not generate a new page when the user declines AI processing', async () => {
    mockRequestConsent.mockResolvedValue(false);
    mockFinishRecipePageCandidate.mockResolvedValue({ id: 'version-2' });
    const screen = render(<BookReaderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Try another design' }));

    await waitFor(() => expect(screen.getByText('blocked')).toBeTruthy());
    expect(mockRequestConsent).toHaveBeenCalledTimes(1);
    expect(mockFinishRecipePageCandidate).not.toHaveBeenCalled();
  });

  it('generates a new page after the user allows AI processing', async () => {
    mockRequestConsent.mockResolvedValue(true);
    mockFinishRecipePageCandidate.mockResolvedValue({ id: 'version-2' });
    const screen = render(<BookReaderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Try another design' }));

    await waitFor(() => expect(screen.getByText('generated')).toBeTruthy());
    expect(mockRequestConsent).toHaveBeenCalledTimes(1);
    expect(mockFinishRecipePageCandidate).toHaveBeenCalledTimes(1);
  });
});
