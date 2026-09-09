import type { CookbookPage } from '@/types/cookbook';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';
import { buildCookbookPageGridItems } from '@/utils/cookbook/pageGrid';

function page(id: string, sortOrder: number, lifecycleStatus: 'processing' | 'approved'): CookbookPage {
  return {
    id,
    cookbookId: 'book-1',
    recipeId: `recipe-${id}`,
    title: id,
    section: 'dinner',
    pageNumber: sortOrder + 1,
    sortOrder,
    lifecycleStatus,
    captureId: `capture-${id}`,
  };
}

function capture(id: string, pageId?: string): RecipeCapture {
  return {
    id: `capture-${id}`,
    userId: 'user-1',
    destinationCookbookId: 'book-1',
    sourceType: 'text',
    sourcePayload: {},
    status: 'processing',
    extractionNotes: [],
    inferredFields: [],
    pageId,
    pageStatus: pageId ? 'generating' : 'not_started',
    idempotencyKey: `capture-${id}`,
    processingAttempt: 1,
    createdAt: '2026-08-29T12:00:00.000Z',
    updatedAt: '2026-08-29T12:00:00.000Z',
  };
}

describe('cookbook page grid projection', () => {
  it('keeps the same capture key while a reserved page is being generated', () => {
    expect(buildCookbookPageGridItems({
      cookbookId: 'book-1',
      pageSlots: [page('pasta', 0, 'processing')],
      captures: [capture('pasta', 'pasta')],
    })[0]).toEqual(expect.objectContaining({
      key: 'capture:capture-pasta',
      phase: 'designing',
      isDraggable: false,
    }));
  });

  it('appends an unplaced capture without duplicating placed pages', () => {
    const items = buildCookbookPageGridItems({
      cookbookId: 'book-1',
      pageSlots: [page('pasta', 0, 'approved')],
      captures: [capture('pasta', 'pasta'), capture('soup')],
    });

    expect(items.map((item) => item.key)).toEqual([
      'capture:capture-pasta',
      'capture:capture-soup',
    ]);
    expect(items[0].isDraggable).toBe(true);
    expect(items[1].isDraggable).toBe(false);
  });

  it('includes destinationless work only in the main composer projection', () => {
    const unassigned = {
      ...capture('unassigned'),
      destinationCookbookId: undefined,
      status: 'needs_destination' as const,
    };

    expect(buildCookbookPageGridItems({
      cookbookId: 'book-1',
      pageSlots: [],
      captures: [unassigned],
    })).toHaveLength(0);

    expect(buildCookbookPageGridItems({
      cookbookId: 'book-1',
      pageSlots: [],
      captures: [unassigned],
      includeUnassignedCaptures: true,
    })[0]).toEqual(expect.objectContaining({
      key: 'capture:capture-unassigned',
      phase: 'destination',
      isDraggable: false,
    }));
  });

  it('keeps active generation beside ready pages before recovery items', () => {
    const failedCapture = {
      ...capture('failed'),
      status: 'needs_attention' as const,
    };

    const items = buildCookbookPageGridItems({
      cookbookId: 'book-1',
      pageSlots: [page('pasta', 0, 'approved')],
      captures: [capture('pasta', 'pasta'), failedCapture, capture('working')],
    });

    expect(items.map((item) => item.key)).toEqual([
      'capture:capture-pasta',
      'capture:capture-working',
      'capture:capture-failed',
    ]);
  });
});
