import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ActionSheetIOS, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CookbookPageGrid } from '@/components/cookbook/CookbookPageGrid';
import { buildRecipeContextActions } from '@/utils/cookbook/contextActions';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

jest.mock('react-native-sortables', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      Grid: ({
        data,
        renderItem,
      }: {
        data: unknown[];
        renderItem: (input: { item: unknown; index: number }) => unknown;
      }) =>
        ReactModule.createElement(
          View,
          null,
          data.map((item, index) => ReactModule.createElement(View, { key: index }, renderItem({ item, index }))),
        ),
      Handle: ({ children }: { children: unknown }) => ReactModule.createElement(View, null, children),
    },
  };
});

jest.mock('@/components/cookbook/PageCanvas', () => ({
  PageCanvas: () => null,
}));

describe('CookbookPageGrid contextual actions', () => {
  it('uses the canonical action list and keeps a visible 44-point More target', () => {
    const page = SAMPLE_COOKBOOK_PAGES[0];
    const onContextAction = jest.fn();
    const haptic = jest.spyOn(Haptics, 'selectionAsync').mockResolvedValue();
    const actionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
    const screen = render(
      <CookbookPageGrid
        cookbookId={SAMPLE_COOKBOOK.id}
        pageSlots={[page]}
        contextActionsFor={() => buildRecipeContextActions({ canShare: true, canMove: true, canRemove: true })}
        onContextAction={onContextAction}
        onPageActions={jest.fn()}
      />,
    );

    const menu = screen.getByTestId(`page-context-menu-${page.id}`);
    const visibleTrigger = screen.getByRole('button', { name: `Actions for ${page.title}` });
    expect(StyleSheet.flatten(visibleTrigger.props.style)).toMatchObject({ width: 44, height: 44 });

    fireEvent.press(menu);
    expect(actionSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        options: ['Share recipe', 'Move to another cookbook', 'Remove from cookbook', 'Cancel'],
        destructiveButtonIndex: [2],
        cancelButtonIndex: 3,
      }),
      expect.any(Function),
    );
    actionSheet.mock.calls[0]?.[1](0);
    expect(onContextAction).toHaveBeenCalledWith(page, 'share_recipe');
    expect(haptic).toHaveBeenCalledTimes(1);
    actionSheet.mockRestore();
    haptic.mockRestore();
  });

  it('opens an unresolved capture without assigning it a page number', () => {
    const onOpenCapture = jest.fn();
    const unresolvedCapture: RecipeCapture = {
      id: 'capture-unresolved',
      userId: 'user-1',
      destinationCookbookId: SAMPLE_COOKBOOK.id,
      sourceType: 'text',
      sourcePayload: {},
      status: 'needs_attention',
      extractionNotes: [],
      inferredFields: [],
      recipeGraph: { title: 'Tomato Soup' } as RecipeCapture['recipeGraph'],
      pageStatus: 'not_started',
      failureCode: 'extraction_failed',
      idempotencyKey: 'capture-unresolved',
      processingAttempt: 1,
      createdAt: '2026-09-01T12:00:00.000Z',
      updatedAt: '2026-09-01T12:00:00.000Z',
    };
    const screen = render(
      <CookbookPageGrid
        cookbookId={SAMPLE_COOKBOOK.id}
        pageSlots={[SAMPLE_COOKBOOK_PAGES[0]]}
        captures={[unresolvedCapture]}
        onOpenCapture={onOpenCapture}
      />,
    );

    fireEvent.press(screen.getByRole('button', { name: 'Tomato Soup. Try again.' }));

    expect(onOpenCapture).toHaveBeenCalledWith(unresolvedCapture);
    expect(screen.getByText(String(SAMPLE_COOKBOOK_PAGES[0].pageNumber))).toBeTruthy();
    expect(screen.queryByText(String(SAMPLE_COOKBOOK_PAGES[0].pageNumber + 1))).toBeNull();
  });
});
