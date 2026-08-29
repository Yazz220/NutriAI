import type { CookbookPage } from '@/types/cookbook';
import {
  getCapturePresentation,
  type CapturePresentationPhase,
} from '@/utils/cookbook/capturePresentation';
import type { RecipeCapture } from '@/utils/cookbook/captureLifecycle';

export interface CookbookPageGridItem {
  key: string;
  page?: CookbookPage;
  capture?: RecipeCapture;
  title: string;
  phase: CapturePresentationPhase | 'ready';
  statusLabel?: string;
  isDraggable: boolean;
}

export function buildCookbookPageGridItems(input: {
  cookbookId: string;
  pageSlots: CookbookPage[];
  captures?: RecipeCapture[];
}): CookbookPageGridItem[] {
  const captures = input.captures ?? [];
  const capturesById = new Map(captures.map((capture) => [capture.id, capture]));
  const capturesByPageId = new Map(
    captures
      .filter((capture) => capture.pageId)
      .map((capture) => [capture.pageId!, capture]),
  );

  const placedCaptureIds = new Set<string>();
  const pageItems = [...input.pageSlots]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.pageNumber - right.pageNumber)
    .map<CookbookPageGridItem>((page) => {
      const capture = (page.captureId ? capturesById.get(page.captureId) : undefined)
        ?? capturesByPageId.get(page.id);
      if (capture) placedCaptureIds.add(capture.id);

      const isReady = page.lifecycleStatus !== 'processing';
      const presentation = capture ? getCapturePresentation(capture) : null;
      return {
        key: capture ? `capture:${capture.id}` : `page:${page.id}`,
        page,
        capture,
        title: page.title || presentation?.title || 'Cookbook page',
        phase: isReady ? 'ready' : (presentation?.phase ?? 'designing'),
        statusLabel: isReady ? undefined : (presentation?.label ?? 'Designing page'),
        isDraggable: isReady,
      };
    });

  const unplacedCaptureItems = captures
    .filter((capture) =>
      capture.destinationCookbookId === input.cookbookId
      && !placedCaptureIds.has(capture.id)
      && capture.status !== 'ready'
      && !capture.pageId,
    )
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
    .map<CookbookPageGridItem>((capture) => {
      const presentation = getCapturePresentation(capture);
      return {
        key: `capture:${capture.id}`,
        capture,
        title: capture.recipeGraph?.title ?? presentation.title,
        phase: presentation.phase,
        statusLabel: presentation.label,
        isDraggable: false,
      };
    });

  return [...pageItems, ...unplacedCaptureItems];
}
