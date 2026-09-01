import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActionSheetIOS } from 'react-native';
import { BookReader } from '@/components/cookbook/BookReader';
import { NoshConversationProvider } from '@/contexts/NoshConversationContext';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';
import {
  loadFirstRunOnboardingState,
  markFirstPageReaderCueSeen,
  recordFirstCookbookCreated,
  recordFirstReadyRecipeOpened,
} from '@/utils/cookbook/firstRunOnboarding';
import { shouldUseTouchPaging } from '@/utils/cookbook/reader';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('@/components/cookbook/NoshAssistantChat', () => ({
  NoshAssistantChatButton: ({ page }: { page: { title: string } }) => {
    const ReactModule = require('react');
    const { Pressable, Text } = require('react-native');
    return ReactModule.createElement(
      Pressable,
      { accessibilityRole: 'button', accessibilityLabel: `Ask Folio about ${page.title}` },
      ReactModule.createElement(Text, null, 'Ask Folio'),
    );
  },
}));

jest.mock('@/utils/cookbook/reader', () => ({
  ...jest.requireActual('@/utils/cookbook/reader'),
  shouldUseTouchPaging: jest.fn(() => true),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));

jest.mock('@/components/subscription/SubscriptionHost', () => ({
  useSubscriptionUi: () => ({ requestPageAccess: jest.fn().mockResolvedValue(true) }),
}));

jest.mock('@/contexts/NoshSubscriptionContext', () => ({
  useNoshSubscription: () => ({
    access: { features: { designedPages: { remaining: 4 } } },
    refresh: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('@/components/cookbook/Cookbook3DScene', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Cookbook3DScene: ({
      isOpen,
      onOpen,
      pages,
      readingView,
      turnRequest,
      onNext,
      onPrevious,
      onEnterReadingView,
      onOpenRecipe,
    }: {
      isOpen: boolean;
      onOpen: () => void;
      pages: unknown[];
      readingView: 'spread' | 'page';
      turnRequest?: { id: number; direction: -1 | 1 };
      onNext: () => void;
      onPrevious: () => void;
      onEnterReadingView: (page: unknown) => void;
      onOpenRecipe: (page: unknown) => void;
    }) =>
      ReactModule.createElement(
        ReactModule.Fragment,
        null,
        ReactModule.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: 'Open cookbook cover',
            onPress: onOpen,
          },
          ReactModule.createElement(Text, null, isOpen ? 'Cookbook open' : 'Cookbook closed'),
        ),
        ReactModule.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: readingView === 'spread' ? 'Open recipe page' : 'Tap reading page',
            onPress: () => (readingView === 'spread' ? onEnterReadingView(pages[0]) : onOpenRecipe(pages[0])),
          },
          ReactModule.createElement(Text, null, readingView === 'spread' ? 'Recipe spread' : 'Recipe reading page'),
        ),
        ReactModule.createElement(
          Text,
          { testID: 'native-turn-request' },
          turnRequest ? `${turnRequest.id}:${turnRequest.direction}` : 'none',
        ),
        ReactModule.createElement(
          Pressable,
          {
            accessibilityRole: 'button',
            accessibilityLabel: 'Complete native page turn',
            disabled: !turnRequest,
            onPress: () => (turnRequest?.direction === 1 ? onNext() : onPrevious()),
          },
          ReactModule.createElement(Text, null, 'Complete turn'),
        ),
      ),
  };
});

jest.mock('@/components/cookbook/CookbookPageGrid', () => {
  const ReactModule = require('react');
  const { Pressable, Text, View } = require('react-native');
  return {
    CookbookPageGrid: ({
      pageSlots,
      onOpenPage,
      onMovePage,
    }: {
      pageSlots: Array<{ id: string; title: string }>;
      onOpenPage: (page: { id: string; title: string }) => void;
      onMovePage?: (input: { pageId: string; beforePageId: string | null }) => void;
    }) =>
      ReactModule.createElement(
        View,
        { testID: 'cookbook-page-grid' },
        ...pageSlots.map((page) =>
          ReactModule.createElement(
            Pressable,
            {
              key: page.id,
              accessibilityRole: 'button',
              accessibilityLabel: `Open ${page.title} from overview`,
              onPress: () => onOpenPage(page),
            },
            ReactModule.createElement(Text, null, page.title),
          ),
        ),
        onMovePage && pageSlots[0]
          ? ReactModule.createElement(
              Pressable,
              {
                accessibilityRole: 'button',
                accessibilityLabel: 'Move first overview page to end',
                onPress: () => onMovePage({ pageId: pageSlots[0].id, beforePageId: null }),
              },
              ReactModule.createElement(Text, null, 'Move page'),
            )
          : null,
      ),
  };
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.mocked(shouldUseTouchPaging).mockReturnValue(true);
});

async function renderReader(props: React.ComponentProps<typeof BookReader>) {
  const screen = render(
    <NoshConversationProvider>
      <BookReader {...props} />
    </NoshConversationProvider>,
  );
  await act(async () => {});
  return screen;
}

describe('BookReader cover entry', () => {
  it('shows the closed cover briefly, then opens it once on shelf entry', async () => {
    jest.useFakeTimers();
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    expect(screen.getByText('Cookbook closed')).toBeTruthy();
    act(() => jest.runAllTimers());
    expect(screen.getByText('Cookbook open')).toBeTruthy();
    jest.useRealTimers();
  });

  it('returns to the existing shelf screen instead of replacing it', async () => {
    const { router } = require('expo-router');
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    fireEvent.press(screen.getByRole('button', { name: 'Back to my collection' }));
    expect(router.dismissTo).toHaveBeenCalledWith('/(book)');
  });

  it('keeps the sample useful without exposing mutable recipe actions', async () => {
    const samplePage = {
      ...SAMPLE_COOKBOOK_PAGES[0],
      imageAsset: { uri: 'file:///sample-page.png' },
    };
    const destinationCookbook = {
      ...SAMPLE_COOKBOOK,
      id: 'cookbook-desserts',
      title: 'Desserts',
    };
    const onExportPage = jest.fn();
    const actionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: [samplePage, ...SAMPLE_COOKBOOK_PAGES.slice(1)],
      initialPageId: samplePage.id,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
      onExportPage,
      onVisitSource: jest.fn(),
      availableCookbooks: [destinationCookbook],
      onMoveRecipe: jest.fn(),
      onRemoveRecipe: jest.fn(),
      onGeneratePageCandidate: jest.fn(),
      onUsePageCandidate: jest.fn(),
      readOnly: true,
    });

    expect(screen.getByText(samplePage.title)).toBeTruthy();
    expect(screen.queryByText('SAMPLE COOKBOOK')).toBeNull();
    expect(screen.queryByRole('button', { name: /Add a page to/ })).toBeNull();
    expect(
      screen.getByRole('button', {
        name: `Ask Folio about ${samplePage.title}`,
      }),
    ).toBeTruthy();

    const recipeMenu = screen.getByTestId('recipe-context-menu');
    fireEvent.press(recipeMenu);
    expect(actionSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        options: ['Save page image', 'Share recipe', 'Cancel'],
        destructiveButtonIndex: [],
        cancelButtonIndex: 2,
      }),
      expect.any(Function),
    );
    act(() => actionSheet.mock.calls[0]?.[1](0));
    expect(onExportPage).toHaveBeenCalledWith(samplePage);
    expect(screen.queryByText('Recipe actions')).toBeNull();
    actionSheet.mockRestore();
  });

  it('gives an empty real book one clear first-recipe action', async () => {
    jest.useFakeTimers();
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: [],
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    act(() => jest.runAllTimers());

    expect(screen.getByRole('button', { name: `Add the first recipe to ${SAMPLE_COOKBOOK.title}` })).toBeTruthy();
    expect(screen.getByText('Turn a recipe you love into its first page.').props.maxFontSizeMultiplier).toBe(1.35);
    expect(screen.queryByRole('button', { name: /Add a page to/ })).toBeNull();
    jest.useRealTimers();
  });

  it('introduces the first finished page once, then opens reading view', async () => {
    await recordFirstCookbookCreated('user-1', SAMPLE_COOKBOOK.id);
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: [SAMPLE_COOKBOOK_PAGES[0]],
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    const readButton = await screen.findByRole('button', {
      name: `Read my first recipe, ${SAMPLE_COOKBOOK_PAGES[0].title}`,
    });
    fireEvent.press(readButton);

    expect(screen.queryByText('YOUR FIRST PAGE IS HOME')).toBeNull();
    expect(screen.queryByText('NOSH IS HERE, TOO')).toBeNull();
  });

  it('defers the contextual Folio introduction until a later book visit', async () => {
    await recordFirstCookbookCreated('user-1', SAMPLE_COOKBOOK.id);
    await recordFirstReadyRecipeOpened('user-1', SAMPLE_COOKBOOK.id, SAMPLE_COOKBOOK_PAGES[0].id);
    await markFirstPageReaderCueSeen('user-1');

    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    expect(await screen.findByText('Your chef knows this recipe.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss Ask Folio introduction' }));

    expect(screen.queryByText('Your chef knows this recipe.')).toBeNull();
    await waitFor(async () => {
      expect((await loadFirstRunOnboardingState('user-1')).noshTipSeen).toBe(true);
    });
  });
});

describe('BookReader compact reading flow', () => {
  it('opens the canonical page overview and jumps back into the selected recipe', async () => {
    const onSelectPage = jest.fn();
    const onReorderPage = jest.fn();
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      pageSlots: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage,
      onShare: jest.fn(),
      onReorderPage,
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open page overview' }));

    expect(screen.getByTestId('cookbook-page-grid')).toBeTruthy();
    expect(screen.queryByText('Recipe reading page')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Move first overview page to end' }));
    expect(onReorderPage).toHaveBeenCalledWith({
      pageId: SAMPLE_COOKBOOK_PAGES[0].id,
      beforePageId: null,
    });

    fireEvent.press(
      screen.getByRole('button', {
        name: `Open ${SAMPLE_COOKBOOK_PAGES[1].title} from overview`,
      }),
    );

    expect(screen.getByText('Recipe reading page')).toBeTruthy();
    expect(onSelectPage).toHaveBeenCalledWith(SAMPLE_COOKBOOK_PAGES[1].id);
  });

  it('opens a linked recipe directly in reading mode', async () => {
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    expect(screen.getByText('Recipe reading page')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to open cookbook' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Read this page' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Previous recipe' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next recipe' })).toBeEnabled();
    expect(screen.queryByText('RECIPE')).toBeNull();
    expect(screen.getByText(`1 / ${SAMPLE_COOKBOOK_PAGES.length}`)).toBeTruthy();
    expect(screen.getAllByTestId('page-overview-icon').length).toBeGreaterThan(0);
  });

  it('lets the native scene animate an arrow turn before committing navigation', async () => {
    const onSelectPage = jest.fn();
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage,
      onShare: jest.fn(),
    });
    onSelectPage.mockClear();

    fireEvent.press(screen.getByRole('button', { name: 'Next recipe' }));

    expect(screen.getByTestId('native-turn-request')).toHaveTextContent('1:1');
    expect(screen.getByText('1 / 10')).toBeTruthy();
    expect(onSelectPage).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Complete native page turn' }));

    expect(onSelectPage).toHaveBeenCalledWith(SAMPLE_COOKBOOK_PAGES[1].id);
    expect(screen.getByText('2 / 10')).toBeTruthy();
  });

  it('keeps direct navigation inside the focused one-page reader', async () => {
    jest.mocked(shouldUseTouchPaging).mockReturnValue(false);
    const onSelectPage = jest.fn();
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage,
      onShare: jest.fn(),
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open recipe page' }));
    expect(screen.getByRole('button', { name: 'Previous recipe' })).toBeDisabled();
    expect(
      screen.getByRole('button', {
        name: `Ask Folio about ${SAMPLE_COOKBOOK_PAGES[0].title}`,
      }),
    ).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Next recipe' }));
    expect(onSelectPage).toHaveBeenCalledWith(SAMPLE_COOKBOOK_PAGES[1].id);
    expect(screen.getByText('2 / 10')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: `Ask Folio about ${SAMPLE_COOKBOOK_PAGES[1].title}`,
      }),
    ).toBeTruthy();
  });

  it('uses page tap to enter reading mode and back to return to the same spread', async () => {
    jest.useFakeTimers();
    const { router } = require('expo-router');
    router.dismissTo.mockClear();
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    act(() => jest.runOnlyPendingTimers());
    fireEvent.press(screen.getByRole('button', { name: 'Open recipe page' }));

    expect(screen.getByText('Recipe reading page')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Back to open cookbook' }));

    expect(screen.getByText('Recipe spread')).toBeTruthy();
    expect(router.dismissTo).not.toHaveBeenCalled();
    jest.useRealTimers();
  });

  it('shows only book actions in a spread and recipe actions while reading', async () => {
    jest.useFakeTimers();
    const actionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    const onShare = jest.fn();
    const onExportPage = jest.fn();
    const onVisitSource = jest.fn();
    const onRenameCookbook = jest.fn();
    const onDeleteCookbook = jest.fn();
    const onExportCookbook = jest.fn();
    const onMoveRecipe = jest.fn();
    const onRemoveRecipe = jest.fn();
    const onGeneratePageCandidate = jest.fn();
    const onUsePageCandidate = jest.fn();
    const destinationCookbook = {
      ...SAMPLE_COOKBOOK,
      id: 'cookbook-desserts',
      title: 'Desserts',
      pageCount: 3,
    };
    const sourcedPage = {
      ...SAMPLE_COOKBOOK_PAGES[0],
      imageUrl: 'https://images.example.com/miso-salmon.png',
      recipeGraph: {
        id: 'graph-miso-salmon',
        title: SAMPLE_COOKBOOK_PAGES[0].title,
        servings: 2,
        category: 'dinner' as const,
        ingredientGroups: [{ id: 'main', ingredients: [{ name: 'salmon', quantity: '2', unit: 'fillets' }] }],
        stepGroups: [{ id: 'main', steps: [{ id: 'step-1', text: 'Roast the salmon.' }] }],
        tags: [],
        provenance: { sourceType: 'url' as const, sourceUrl: 'https://example.com/miso-salmon', confidence: 1 },
        createdAt: '2026-08-25T00:00:00.000Z',
        updatedAt: '2026-08-25T00:00:00.000Z',
      },
      recipe: {
        id: 'recipe-miso-salmon',
        title: SAMPLE_COOKBOOK_PAGES[0].title,
        ingredients: [],
        steps: [],
        sourceType: 'url' as const,
        sourceUrl: 'https://example.com/miso-salmon',
        tags: [],
        category: 'dinner' as const,
      },
    };
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: [sourcedPage, ...SAMPLE_COOKBOOK_PAGES.slice(1)],
      onSelectPage: jest.fn(),
      onShare,
      onExportPage,
      onVisitSource,
      availableCookbooks: [SAMPLE_COOKBOOK, destinationCookbook],
      onMoveRecipe,
      onRemoveRecipe,
      onGeneratePageCandidate,
      onUsePageCandidate,
      onRenameCookbook,
      onDeleteCookbook,
      onExportCookbook,
    });

    act(() => jest.runOnlyPendingTimers());
    expect(screen.getByRole('button', { name: `Add a page to ${SAMPLE_COOKBOOK.title}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Cookbook actions for ${SAMPLE_COOKBOOK.title}` })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Ask Folio about/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Recipe actions for/ })).toBeNull();

    const cookbookMenu = screen.getByTestId('cookbook-context-menu');
    fireEvent.press(cookbookMenu);
    expect(actionSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: ['Add recipe', 'Rename cookbook', 'Download cookbook PDF', 'Delete cookbook', 'Cancel'],
        destructiveButtonIndex: [3],
        cancelButtonIndex: 4,
      }),
      expect.any(Function),
    );

    act(() => actionSheet.mock.calls.at(-1)?.[1](1));
    expect(screen.getByText('Cookbook settings')).toBeTruthy();
    expect(screen.getByLabelText('Book name')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Close cookbook settings'));

    fireEvent.press(cookbookMenu);
    act(() => actionSheet.mock.calls.at(-1)?.[1](2));
    await act(async () => undefined);
    expect(onExportCookbook).toHaveBeenCalledTimes(1);

    fireEvent.press(cookbookMenu);
    act(() => actionSheet.mock.calls.at(-1)?.[1](3));
    expect(onDeleteCookbook).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByRole('button', { name: 'Open recipe page' }));

    expect(screen.getByRole('button', { name: `Recipe actions for ${sourcedPage.title}` })).toBeTruthy();
    expect(screen.getByRole('button', { name: `Ask Folio about ${SAMPLE_COOKBOOK_PAGES[0].title}` })).toBeTruthy();
    expect(screen.queryByRole('button', { name: `Add a page to ${SAMPLE_COOKBOOK.title}` })).toBeNull();

    const recipeMenu = screen.getByTestId('recipe-context-menu');
    fireEvent.press(recipeMenu);
    expect(actionSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({
        options: [
          'Edit recipe',
          'Try another design',
          'Visit original source',
          'Save page image',
          'Share recipe',
          'Move to another cookbook',
          'Remove from cookbook',
          'Cancel',
        ],
        destructiveButtonIndex: [6],
        cancelButtonIndex: 7,
      }),
      expect.any(Function),
    );

    act(() => actionSheet.mock.calls.at(-1)?.[1](2));
    await act(async () => undefined);
    expect(onVisitSource).toHaveBeenCalledWith(sourcedPage);

    fireEvent.press(recipeMenu);
    act(() => actionSheet.mock.calls.at(-1)?.[1](3));
    await act(async () => undefined);
    expect(onExportPage).toHaveBeenCalledWith(sourcedPage);

    fireEvent.press(recipeMenu);
    act(() => actionSheet.mock.calls.at(-1)?.[1](4));
    await act(async () => undefined);
    expect(onShare).toHaveBeenCalledWith(sourcedPage);

    fireEvent.press(recipeMenu);
    act(() => actionSheet.mock.calls.at(-1)?.[1](5));
    expect(screen.getByText('Choose a cookbook')).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: destinationCookbook.title }));
    });
    expect(onMoveRecipe).toHaveBeenCalledWith(sourcedPage, destinationCookbook);

    fireEvent.press(recipeMenu);
    act(() => actionSheet.mock.calls.at(-1)?.[1](6));
    expect(onRemoveRecipe).toHaveBeenCalledWith(sourcedPage);
    actionSheet.mockRestore();
    jest.useRealTimers();
  });

  it('keeps the same reading position when the active page is removed', async () => {
    const onSelectPage = jest.fn();
    const firstPage = SAMPLE_COOKBOOK_PAGES[0];
    const secondPage = SAMPLE_COOKBOOK_PAGES[1];
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: [firstPage, secondPage],
      initialPageId: firstPage.id,
      onSelectPage,
      onShare: jest.fn(),
    });

    screen.rerender(
      <NoshConversationProvider>
        <BookReader
          cookbook={SAMPLE_COOKBOOK}
          pages={[secondPage]}
          initialPageId={firstPage.id}
          onSelectPage={onSelectPage}
          onShare={jest.fn()}
        />
      </NoshConversationProvider>,
    );

    await waitFor(() => expect(onSelectPage).toHaveBeenCalledWith(secondPage.id));
    expect(screen.getByText(secondPage.title)).toBeTruthy();
  });
});
