import type { CookbookPage, RecipeSourceType } from '@/types/cookbook';
import type { RecipeGraphDraft } from '@/types/recipeGraph';

export type RecipeCaptureStatus =
  | 'processing'
  | 'needs_destination'
  | 'ready'
  | 'needs_attention';

export type RecipeCapturePageStatus = 'not_started' | 'generating' | 'ready' | 'failed';

export interface RecipeCapture {
  id: string;
  userId: string;
  destinationCookbookId?: string;
  sourceType: RecipeSourceType;
  sourcePayload: Record<string, unknown>;
  sourceStoragePath?: string;
  status: RecipeCaptureStatus;
  recipeGraph?: RecipeGraphDraft;
  confidence?: number;
  extractionNotes: string[];
  inferredFields: string[];
  pageId?: string;
  pageStatus: RecipeCapturePageStatus;
  pageWarning?: string;
  failureCode?: string;
  failureMessage?: string;
  idempotencyKey: string;
  processingAttempt: number;
  processingStartedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecipeCaptureSource =
  | { type: 'url' | 'text' | 'video'; input: string }
  | { type: 'image'; storagePath: string; mimeType: string; notes?: string };

const NEXT_STATES: Record<RecipeCaptureStatus, readonly RecipeCaptureStatus[]> = {
  processing: ['needs_destination', 'ready', 'needs_attention'],
  needs_destination: ['processing'],
  needs_attention: ['processing'],
  ready: [],
};

export function createCaptureRequestKey(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2);
  return `capture-${timestamp}-${random}`;
}

export function canTransitionCapture(
  from: RecipeCaptureStatus,
  to: RecipeCaptureStatus,
): boolean {
  return from === to || NEXT_STATES[from].includes(to);
}

export function isCaptureProcessing(status: RecipeCaptureStatus): boolean {
  return status === 'processing';
}

export function isCaptureStale(
  capture: Pick<RecipeCapture, 'status' | 'processingStartedAt'>,
  now = Date.now(),
  timeoutMs = 10 * 60_000,
): boolean {
  if (capture.status !== 'processing' || !capture.processingStartedAt) return false;
  return now - new Date(capture.processingStartedAt).getTime() > timeoutMs;
}

export function reconcileCapturePage(
  pages: CookbookPage[],
  pendingPage?: CookbookPage | null,
): CookbookPage[] {
  if (!pendingPage) return pages;
  return [...pages.filter((page) => page.id !== pendingPage.id), pendingPage]
    .sort((left, right) => left.sortOrder - right.sortOrder || left.pageNumber - right.pageNumber);
}

export function approvedPages(pages: CookbookPage[]): CookbookPage[] {
  return pages.filter((page) => page.lifecycleStatus !== 'processing');
}
