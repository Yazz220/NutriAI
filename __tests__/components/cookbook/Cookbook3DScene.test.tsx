import React from 'react';
import { render } from '@testing-library/react-native';
import { Cookbook3DScene } from '@/components/cookbook/Cookbook3DScene';
import type { CookbookPage, GeneratedRecipePage } from '@/types/cookbook';
import type { RecipeGraph } from '@/types/recipeGraph';
import { buildCookbookSpreads } from '@/utils/cookbook/reader';

const mockTurningLeafSkia = jest.fn(() => null);

jest.mock('@/components/cookbook/TurningLeafSkia', () => ({
  TurningLeafSkia: (props: unknown) => mockTurningLeafSkia(props),
}));

jest.mock('@/components/cookbook/CookbookLeafPage', () => ({
  CookbookLeafPage: () => null,
}));

jest.mock('@/components/cookbook/OpenBookSpread', () => ({
  BOOK_GUTTER_WIDTH: 14,
  BookGutter: () => null,
  OpenBookSpread: ({ left, right }: { left: React.ReactNode; right: React.ReactNode }) => (
    <>{left}{right}</>
  ),
}));

jest.mock('@/components/physical-book/PhysicalBook', () => ({
  PhysicalBook: () => null,
}));

jest.mock('@/utils/cookbook/leafTexture', () => ({
  createLeafTexture: () => null,
}));

jest.mock('@shopify/react-native-skia', () => ({
  ...jest.requireActual('@shopify/react-native-skia/lib/module/mock'),
  useImage: (source: unknown) => source ? { width: () => 800, height: () => 1000 } : null,
}));

jest.mock('react-native-gesture-handler', () => {
  const chain = () => {
    const gesture: Record<string, jest.Mock> = {};
    for (const method of [
      'enabled', 'maxPointers', 'minDistance', 'activeOffsetX', 'failOffsetY', 'cancelsTouchesInView',
      'numberOfTaps', 'maxDuration', 'onBegin', 'onStart', 'onUpdate', 'onEnd', 'onFinalize',
    ]) {
      gesture[method] = jest.fn(() => gesture);
    }
    return gesture;
  };

  return {
    Gesture: {
      Pan: chain,
      Pinch: chain,
      Tap: chain,
      Exclusive: (...gestures: unknown[]) => gestures[0],
      Simultaneous: (...gestures: unknown[]) => gestures[0],
    },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});

const recipeGraph: RecipeGraph = {
  id: 'graph-1',
  title: 'Tomato Toast',
  servings: 2,
  category: 'breakfast',
  ingredientGroups: [],
  stepGroups: [],
  tags: [],
  provenance: { sourceType: 'text', confidence: 1 },
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
};

function makePage(index: number, kind: 'sample' | 'generated' | 'legacy'): CookbookPage {
  const page: CookbookPage = {
    id: `page-${index}`,
    cookbookId: 'cookbook-1',
    recipeId: `recipe-${index}`,
    title: `Recipe ${index}`,
    section: 'breakfast',
    pageNumber: index + 1,
    sortOrder: index,
  };

  if (kind === 'sample') return { ...page, imageAsset: index + 1 };
  if (kind === 'legacy') return { ...page, imageUrl: `https://example.com/art-${index}.png`, recipeGraph };

  const pageImage: GeneratedRecipePage = {
    id: `version-${index}`,
    pageId: page.id,
    imageUrl: `https://example.com/page-${index}.png`,
    styleId: 'illustrated',
    styleRevision: 1,
    generationPrompt: '',
    model: 'test-model',
    status: 'ready',
    creditCost: 0,
    createdAt: '2026-08-20T00:00:00.000Z',
  };
  return { ...page, imageUrl: pageImage.imageUrl, pageImage, recipeGraph };
}

function renderScene(kind: 'sample' | 'generated' | 'legacy') {
  const pages = Array.from({ length: 4 }, (_, index) => makePage(index, kind));
  const spreads = buildCookbookSpreads(pages.map((page) => page.id));
  render(
    <Cookbook3DScene
      cookbook={null}
      pages={pages}
      spreads={spreads}
      spreadIndex={1}
      isOpen
      onOpen={jest.fn()}
      onNext={jest.fn()}
      onPrevious={jest.fn()}
      onEnterReadingView={jest.fn()}
      onOpenRecipe={jest.fn()}
    />,
  );
  return mockTurningLeafSkia.mock.calls.at(-1)?.[0] as {
    forwardEnabled?: boolean;
    backwardEnabled?: boolean;
  };
}

describe('Cookbook3DScene canonical native page turn', () => {
  beforeEach(() => {
    mockTurningLeafSkia.mockClear();
  });

  it.each(['sample', 'generated', 'legacy'] as const)(
    'keeps the Skia curl enabled for %s recipe pages',
    (kind) => {
      const props = renderScene(kind);
      expect(props.forwardEnabled).not.toBe(false);
      expect(props.backwardEnabled).not.toBe(false);
    },
  );
});
