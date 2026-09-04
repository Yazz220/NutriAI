jest.mock('expo/fetch', () => ({ fetch: (...args: unknown[]) => global.fetch(...args as Parameters<typeof fetch>) }));
import {
  fetchWithTimeout,
  FunctionCanceledError,
  FunctionNetworkError,
  FunctionTimeoutError,
  streamAuthenticatedFunction,
} from '@/utils/supabaseEdge';
import { supabase } from '@/lib/supabase';

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

describe('streamAuthenticatedFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'test-access-token' } },
      error: null,
    });
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('reads a completed NDJSON response when native fetch has no readable stream', async () => {
    const responseText = [
      JSON.stringify({ type: 'text-delta', delta: 'Hello' }),
      JSON.stringify({
        type: 'result',
        result: { message: { role: 'assistant', content: 'Hello' }, toolCalls: [] },
      }),
    ].join('\n');
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/x-ndjson' }),
      body: null,
      text: jest.fn().mockResolvedValue(responseText),
    } as unknown as Response);

    const events: unknown[] = [];
    for await (const event of streamAuthenticatedFunction(
      'nosh-chat',
      { messages: [] },
      { timeoutMs: 1_000 },
    )) {
      events.push(event);
    }

    expect(events).toEqual([
      { type: 'text-delta', delta: 'Hello' },
      {
        type: 'result',
        result: { message: { role: 'assistant', content: 'Hello' }, toolCalls: [] },
      },
    ]);
  });
  it('cancels the reader when a terminal event ends consumption before EOF', async () => {
    const cancel = jest.fn().mockResolvedValue(undefined);
    const read = jest.fn().mockResolvedValueOnce({
      done: false, value: new TextEncoder().encode('{"type":"result"}\n'),
    });
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, headers: new Headers({ 'content-type': 'application/x-ndjson' }),
      body: { getReader: () => ({ read, cancel }) },
    } as unknown as Response);
    for await (const event of streamAuthenticatedFunction('nosh-chat', {})) {
      expect(event).toEqual({ type: 'result' });
      break;
    }
    expect(read).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('times out even when session loading never settles', async () => {
    jest.useFakeTimers();
    (supabase.auth.getSession as jest.Mock).mockReturnValue(new Promise(() => {}));
    const pending = streamAuthenticatedFunction('nosh-chat', {}, { timeoutMs: 100 }).next();
    let settled = false;
    const checked = pending.catch(error => { settled = true; expect(error).toBeInstanceOf(FunctionTimeoutError); });
    await jest.advanceTimersByTimeAsync(101);
    expect(settled).toBe(true);
    await checked;
    jest.useRealTimers();
  });
  it('settles a native read that ignores abort instead of leaving chat running', async () => {
    jest.useFakeTimers();
    const cancel = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true, headers: new Headers({ 'content-type': 'application/x-ndjson' }),
      body: { getReader: () => ({ read: () => new Promise(() => {}), cancel }) },
    } as unknown as Response);
    const pending = streamAuthenticatedFunction('nosh-chat', {}, { timeoutMs: 100 }).next();
    let settled = false;
    const checked = pending.catch(error => { settled = true; expect(error).toBeInstanceOf(FunctionTimeoutError); });
    await jest.advanceTimersByTimeAsync(101);
    expect(settled).toBe(true);
    await checked;
    expect(cancel).toHaveBeenCalled();
    jest.useRealTimers();
  });

});
