import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { ActionSheetIOS, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { CookbookPageGrid } from '@/components/cookbook/CookbookPageGrid';
import { buildCaptureContextActions, buildRecipeContextActions } from '@/utils/cookbook/contextActions';
import { SAMPLE_COOKBOOK, SAMPLE_COOKBOOK_PAGES } from '@/utils/cookbook/sampleCookbook';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

const mockPageCanvas = jest.fn(() => null);

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
  PageCanvas: (props: unknown) => mockPageCanvas(props),
}));

describe('CookbookPageGrid contextual actions', () => {
  beforeEach(() => {
    mockPageCanvas.mockClear();
  });

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
    const onCaptureContextAction = jest.fn();
    const actionSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(() => undefined);
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
        captureActionsFor={() => buildCaptureContextActions('Try again')}
        onCaptureContextAction={onCaptureContextAction}
        onCaptureActions={jest.fn()}
      />,
    );

    const unresolvedCard = screen.getByRole('button', { name: 'Tomato Soup. Try again.' });
    fireEvent.press(unresolvedCard);

    expect(onOpenCapture).toHaveBeenCalledWith(unresolvedCapture);
    expect(screen.getByText(String(SAMPLE_COOKBOOK_PAGES[0].pageNumber))).toBeTruthy();
    expect(screen.queryByText(String(SAMPLE_COOKBOOK_PAGES[0].pageNumber + 1))).toBeNull();

    fireEvent(unresolvedCard, 'longPress');
    expect(actionSheet).toHaveBeenCalledWith(
      expect.objectContaining({
        options: ['Try again', 'Remove', 'Cancel'],
        destructiveButtonIndex: [1],
      }),
      expect.any(Function),
    );
    actionSheet.mock.calls[0]?.[1](1);
    expect(onCaptureContextAction).toHaveBeenCalledWith(unresolvedCapture, 'remove_capture');
    expect(onOpenCapture).toHaveBeenCalledTimes(1);
    actionSheet.mockRestore();
  });

  it('keeps generation visual and presents live progress beneath it', () => {
    const processingCapture: RecipeCapture = {
      id: 'capture-processing',
      userId: 'user-1',
      destinationCookbookId: SAMPLE_COOKBOOK.id,
      sourceType: 'text',
      sourcePayload: {},
      status: 'processing',
      extractionNotes: [],
      inferredFields: [],
      recipeGraph: { title: 'Tomato Soup' } as RecipeCapture['recipeGraph'],
      pageStatus: 'not_started',
      idempotencyKey: 'capture-processing',
      processingAttempt: 1,
      createdAt: '2026-09-02T12:00:00.000Z',
      updatedAt: '2026-09-02T12:00:00.000Z',
    };
    const screen = render(
      <CookbookPageGrid cookbookId={SAMPLE_COOKBOOK.id} pageSlots={[]} captures={[processingCapture]} />,
    );

    expect(screen.getByTestId('folio-page-generation-preview')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Preparing page. Tomato Soup.' })).toBeTruthy();
    expect(screen.getByText('Preparing page')).toBeTruthy();
    expect(screen.getByText('Tomato Soup')).toBeTruthy();
  });

  it('marks a newly ready page without changing the page action system', () => {
    const page = SAMPLE_COOKBOOK_PAGES[0];
    const onOpenPage = jest.fn();
    const screen = render(
      <CookbookPageGrid
        cookbookId={SAMPLE_COOKBOOK.id}
        pageSlots={[page]}
        unseenPageIds={new Set([page.id])}
        onOpenPage={onOpenPage}
      />,
    );

    expect(
      screen.getByTestId(`new-page-marker-${page.id}`, { includeHiddenElements: true }),
    ).toBeTruthy();
    const newPage = screen.getByRole('button', {
      name: `${page.title}. New page. Page 1.`,
    });
    fireEvent.press(newPage);
    expect(onOpenPage).toHaveBeenCalledWith(page);
  });

  it('does not rerender unaffected page artwork when one page changes', () => {
    const firstPage = {
      ...SAMPLE_COOKBOOK_PAGES[0],
      imageAsset: undefined,
      imageUrl: undefined,
    };
    const secondPage = {
      ...SAMPLE_COOKBOOK_PAGES[1],
      imageAsset: undefined,
      imageUrl: undefined,
    };
    const screen = render(
      <CookbookPageGrid
        cookbookId={SAMPLE_COOKBOOK.id}
        pageSlots={[firstPage, secondPage]}
      />,
    );
    mockPageCanvas.mockClear();

    const updatedSecondPage = { ...secondPage, title: 'Updated second recipe' };
    screen.rerender(
      <CookbookPageGrid
        cookbookId={SAMPLE_COOKBOOK.id}
        pageSlots={[firstPage, updatedSecondPage]}
      />,
    );

    expect(mockPageCanvas).toHaveBeenCalledTimes(1);
    expect(mockPageCanvas).toHaveBeenCalledWith(expect.objectContaining({ page: updatedSecondPage }));
  });
});
