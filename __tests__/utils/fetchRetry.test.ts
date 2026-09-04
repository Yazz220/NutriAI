import { fetchWithRetry } from '../../supabase/functions/_shared/fetchRetry';

describe('provider retry cancellation', () => {
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });
  it('does not retry an aborted provider request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(fetchWithRetry('https://example.com', { signal: controller.signal })).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
  it('interrupts rate-limit backoff without another provider call', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 429 }));
    const pending = fetchWithRetry('https://example.com', { signal: controller.signal });
    const check = expect(pending).rejects.toThrow();
    await jest.advanceTimersByTimeAsync(1);
    controller.abort();
    await check;
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
});
