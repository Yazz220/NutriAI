import {
  GenerationPollingCancelledError,
  GenerationPollingTimeoutError,
  pollCookbookGeneration,
} from '@/utils/cookbook/generationPolling';
import type { CookbookPage } from '@/types/cookbook';

const page = { id: 'page-1', title: 'Soup' } as CookbookPage;

describe('cookbook generation polling', () => {
  it('moves from queued to running and returns the ready page', async () => {
    const request = jest.fn()
      .mockResolvedValueOnce({ status: 'processing', requestId: 'request-1' })
      .mockResolvedValueOnce({ status: 'processing', requestId: 'request-1' })
      .mockResolvedValueOnce({ status: 'ready', page });
    const phases: string[] = [];

    await expect(pollCookbookGeneration(request, {
      intervalMs: 0,
      onPhase: (phase) => phases.push(phase),
      wait: async () => {},
    })).resolves.toBe(page);
    expect(phases).toEqual(['queued', 'running']);
  });

  it('stops after the bounded processing window', async () => {
    const request = jest.fn().mockResolvedValue({ status: 'processing', requestId: 'request-1' });

    await expect(pollCookbookGeneration(request, {
      maxProcessingResponses: 1,
      wait: async () => {},
    })).rejects.toBeInstanceOf(GenerationPollingTimeoutError);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('does not make another request after cancellation', async () => {
    const request = jest.fn();

    await expect(pollCookbookGeneration(request, {
      isCancelled: () => true,
    })).rejects.toBeInstanceOf(GenerationPollingCancelledError);
    expect(request).not.toHaveBeenCalled();
  });
});
