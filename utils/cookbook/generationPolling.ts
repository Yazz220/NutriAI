import type { CookbookPage } from '@/types/cookbook';

export type GenerationPhase = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed';

export type CookbookGenerationResult =
  | { status: 'processing'; requestId: string }
  | { status: 'ready'; page: CookbookPage };

export class GenerationPollingTimeoutError extends Error {
  constructor() {
    super('Your page is still being created. Try again to keep checking the same generation.');
    this.name = 'GenerationPollingTimeoutError';
  }
}

export class GenerationPollingCancelledError extends Error {
  constructor() {
    super('Generation polling was cancelled.');
    this.name = 'GenerationPollingCancelledError';
  }
}

interface PollGenerationOptions {
  intervalMs?: number;
  maxProcessingResponses?: number;
  onPhase?: (phase: 'queued' | 'running') => void;
  isCancelled?: () => boolean;
  wait?: (milliseconds: number) => Promise<void>;
}

const waitFor = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function pollCookbookGeneration(
  request: () => Promise<CookbookGenerationResult>,
  options: PollGenerationOptions = {},
): Promise<CookbookPage> {
  const intervalMs = options.intervalMs ?? 2_000;
  const maxProcessingResponses = options.maxProcessingResponses ?? 90;
  const wait = options.wait ?? waitFor;

  for (let processingCount = 0; processingCount <= maxProcessingResponses; processingCount += 1) {
    if (options.isCancelled?.()) throw new GenerationPollingCancelledError();
    const result = await request();
    if (result.status === 'ready') return result.page;

    options.onPhase?.(processingCount === 0 ? 'queued' : 'running');
    if (processingCount === maxProcessingResponses) throw new GenerationPollingTimeoutError();
    await wait(intervalMs);
  }

  throw new GenerationPollingTimeoutError();
}
