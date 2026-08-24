import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookReader } from '@/components/cookbook/BookReader';
import { NoshConversationProvider } from '@/contexts/NoshConversationContext';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';
import {
  loadFirstRunOnboardingState,
  markFirstPageReaderCueSeen,
  recordFirstCookbookCreated,
  recordFirstReadyRecipeOpened,
} from '@/utils/cookbook/firstRunOnboarding';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, right: 0, bottom: 34, left: 0 }),
}));

jest.mock('@/components/cookbook/NoshAssistantChat', () => ({
  NoshAssistantChatButton: () => null,
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/utils/analytics', () => ({ trackEvent: jest.fn() }));

jest.mock('@/components/cookbook/Cookbook3DScene', () => {
  const ReactModule = require('react');
  const { Pressable, Text } = require('react-native');
  return {
    Cookbook3DScene: ({
      isOpen,
      onOpen,
      pages,
      onOpenRecipe,
    }: {
      isOpen: boolean;
      onOpen: () => void;
      pages: unknown[];
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
            accessibilityLabel: 'Open focused recipe',
            onPress: () => onOpenRecipe(pages[0]),
          },
          ReactModule.createElement(Text, null, 'Recipe spread'),
        ),
      ),
  };
});

beforeEach(async () => {
  await AsyncStorage.clear();
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

  it('marks the sample as read-only and hides recipe capture actions', async () => {
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
      readOnly: true,
    });

    expect(screen.getByText('SAMPLE COOKBOOK')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add a page to/ })).toBeNull();
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

    expect(
      screen.getByRole('button', { name: `Add the first recipe to ${SAMPLE_COOKBOOK.title}` }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add a page to/ })).toBeNull();
    jest.useRealTimers();
  });

  it('introduces the first finished page once, then opens reading view', async () => {
    await recordFirstCookbookCreated('user-1', SAMPLE_COOKBOOK.id);
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
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

  it('defers the contextual Nosh introduction until a later book visit', async () => {
    await recordFirstCookbookCreated('user-1', SAMPLE_COOKBOOK.id);
    await recordFirstReadyRecipeOpened(
      'user-1',
      SAMPLE_COOKBOOK.id,
      SAMPLE_COOKBOOK_PAGES[0].id,
    );
    await markFirstPageReaderCueSeen('user-1');

    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    expect(await screen.findByText('NOSH IS HERE, TOO')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Dismiss Ask Nosh introduction' }));

    expect(screen.queryByText('NOSH IS HERE, TOO')).toBeNull();
    await waitFor(async () => {
      expect((await loadFirstRunOnboardingState('user-1')).noshTipSeen).toBe(true);
    });
  });
});

describe('BookReader focused recipe', () => {
  it('keeps clear return controls available and returns to the open cookbook', async () => {
    const screen = await renderReader({
      cookbook: SAMPLE_COOKBOOK,
      pages: SAMPLE_COOKBOOK_PAGES,
      initialPageId: SAMPLE_COOKBOOK_PAGES[0].id,
      onSelectPage: jest.fn(),
      onShare: jest.fn(),
    });

    fireEvent.press(screen.getByRole('button', { name: 'Open focused recipe' }));

    expect(screen.getByRole('button', { name: 'Return to open cookbook' })).toBeTruthy();
    const bottomReturn = screen.getByRole('button', { name: 'Back to open cookbook' });
    expect(bottomReturn).toBeTruthy();

    fireEvent.press(bottomReturn);
    expect(screen.queryByRole('button', { name: 'Back to open cookbook' })).toBeNull();
    expect(screen.getByText('Recipe spread')).toBeTruthy();
  });
});
