import type { CookbookPage, RecipeSourceType } from '@/types/cookbook';
import type { RecipeGraphDraft } from '@/types/recipeGraph';
import type {
  CaptureCheckpointName,
  CaptureStageCheckpoints,
} from '@/supabase/functions/_shared/captureStages';

export type RecipeCaptureStatus =
  | 'processing'
  | 'needs_destination'
  | 'ready'
  | 'needs_attention';

export type RecipeCapturePageStatus = 'not_started' | 'generating' | 'ready' | 'failed';
export type RecipeCaptureFailedStage = CaptureCheckpointName | 'destination';

const DATABASE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  failedStage?: RecipeCaptureFailedStage;
  stageCheckpoints: CaptureStageCheckpoints;
  idempotencyKey: string;
  processingAttempt: number;
  processingStartedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RecipeCaptureSource =
  | { type: 'url' | 'text' | 'video'; input: string }
  | { type: 'image'; storagePath: string; mimeType: string; notes?: string }
  | {
      type: 'audio';
      storagePath: string;
      mimeType: string;
      fileName: string;
      byteSize: number;
      notes?: string;
    };

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

/**
 * Cookbook ids sent to the capture RPC must be database UUIDs. Local visual-QA
 * fixtures (for example `demo-cookbook`) deliberately never cross this seam.
 */
export function normalizeCaptureDestinationCookbookId(
  cookbookId?: string | null,
): string | undefined {
  return cookbookId && DATABASE_ID_PATTERN.test(cookbookId) ? cookbookId : undefined;
}

export function normalizeRecipeCapturePageStatus(value: unknown): RecipeCapturePageStatus {
  return value === 'generating' || value === 'ready' || value === 'failed'
    ? value
    : 'not_started';
}

/**
 * Compatibility boundary for captures created before the simplified lifecycle
 * migration. This keeps stale server/cache values from becoming UI success.
 */
export function normalizeRecipeCaptureStatus(input: {
  status: unknown;
  pageStatus: RecipeCapturePageStatus;
  pageId?: string;
  destinationCookbookId?: string;
}): RecipeCaptureStatus {
  const hasPublishedPage = input.pageStatus === 'ready' && Boolean(input.pageId);

  if (input.status === 'ready') {
    if (hasPublishedPage) return 'ready';
    return input.pageStatus === 'failed' ? 'needs_attention' : 'processing';
  }
  if (input.status === 'processing' || input.status === 'saved' || input.status === 'reading') {
    return 'processing';
  }
  if (input.status === 'needs_destination') return 'needs_destination';
  if (input.status === 'needs_attention' || input.status === 'needs_help') return 'needs_attention';
  if (input.status === 'ready_to_review') {
    if (!input.destinationCookbookId) return 'needs_destination';
    if (hasPublishedPage) return 'ready';
    return input.pageStatus === 'failed' ? 'needs_attention' : 'processing';
  }
  if (input.status === 'added') {
    return hasPublishedPage ? 'ready' : 'needs_attention';
  }
  return 'needs_attention';
}

export function isCaptureReadyToOpen(
  capture: Pick<RecipeCapture, 'status' | 'destinationCookbookId' | 'pageId' | 'pageStatus'>,
): boolean {
  return capture.status === 'ready'
    && capture.pageStatus === 'ready'
    && Boolean(capture.destinationCookbookId)
    && Boolean(capture.pageId);
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
  capture: Pick<RecipeCapture, 'status' | 'processingStartedAt'> & Partial<Pick<RecipeCapture, 'updatedAt'>>,
  now = Date.now(),
  timeoutMs = 10 * 60_000,
): boolean {
  if (capture.status !== 'processing') return false;
  const leaseTimestamp = capture.processingStartedAt ?? capture.updatedAt;
  if (!leaseTimestamp) return false;
  const leaseStartedAt = new Date(leaseTimestamp).getTime();
  return Number.isFinite(leaseStartedAt) && now - leaseStartedAt > timeoutMs;
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
