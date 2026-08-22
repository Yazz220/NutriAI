import {
  fetchWithTimeout,
  FunctionCanceledError,
  FunctionNetworkError,
  FunctionTimeoutError,
} from '@/utils/supabaseEdge';

jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn() } },
}));

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('aborts a request after the configured timeout', async () => {
    const fetchImpl = jest.fn((_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      }),
    );

    const request = fetchWithTimeout('https://example.com', {}, 500, fetchImpl as typeof fetch);
    const expectation = expect(request).rejects.toBeInstanceOf(FunctionTimeoutError);
    await jest.advanceTimersByTimeAsync(500);

    await expectation;
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns a response that finishes before the timeout', async () => {
    const response = new Response('{}', { status: 200 });
    const fetchImpl = jest.fn().mockResolvedValue(response);

    await expect(fetchWithTimeout('https://example.com', {}, 500, fetchImpl)).resolves.toBe(response);
  });

  it('propagates explicit cancellation separately from a timeout', async () => {
    const external = new AbortController();
    const fetchImpl = jest.fn((_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      }),
    );

    const request = fetchWithTimeout(
      'https://example.com',
      { signal: external.signal },
      5_000,
      fetchImpl as typeof fetch,
    );
    external.abort();

    await expect(request).rejects.toBeInstanceOf(FunctionCanceledError);
  });

  it('distinguishes an uncertain network failure from a server rejection', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    await expect(fetchWithTimeout('https://example.com', {}, 500, fetchImpl)).rejects.toBeInstanceOf(
      FunctionNetworkError,
    );
  });
});
