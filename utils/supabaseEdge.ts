import { supabase } from '@/lib/supabase';

const DEFAULT_FUNCTION_TIMEOUT_MS = 60_000;

function getSupabaseFunctionConfig() {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

interface FunctionCallOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export class FunctionTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    this.name = 'FunctionTimeoutError';
  }
}

export class FunctionNetworkError extends Error {
  constructor() {
    super('The request could not reach the server. Check your connection and try again.');
    this.name = 'FunctionNetworkError';
  }
}

export class FunctionCanceledError extends Error {
  constructor() {
    super('The action was canceled.');
    this.name = 'FunctionCanceledError';
  }
}

export class FunctionResponseError extends Error {
  constructor(
    public readonly status: number,
    functionName: string,
    responseText: string,
  ) {
    super(`${functionName} failed (${status}): ${responseText}`);
    this.name = 'FunctionResponseError';
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const abortFromExternal = () => controller.abort();
  if (externalSignal?.aborted) controller.abort();
  externalSignal?.addEventListener('abort', abortFromExternal, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (externalSignal?.aborted) throw new FunctionCanceledError();
      throw new FunctionTimeoutError(timeoutMs);
    }
    if (error instanceof TypeError) {
      throw new FunctionNetworkError();
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromExternal);
  }
}

export async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in to use this feature.');
  return token;
}

export async function callAuthenticatedFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  options: FunctionCallOptions = {},
): Promise<T> {
  const { url: supabaseUrl, anonKey } = getSupabaseFunctionConfig();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase is not configured.');
  }

  const token = await getAccessToken();
  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: options.signal,
    },
    options.timeoutMs ?? DEFAULT_FUNCTION_TIMEOUT_MS,
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new FunctionResponseError(res.status, functionName, text);
  }

  return res.json() as Promise<T>;
}

export async function* streamAuthenticatedFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  options: FunctionCallOptions = {},
): AsyncGenerator<T> {
  const { url: supabaseUrl, anonKey } = getSupabaseFunctionConfig();
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase is not configured.');
  }

  const token = await getAccessToken();
  const url = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/${functionName}`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_FUNCTION_TIMEOUT_MS;
  const controller = new AbortController();
  const abortFromExternal = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abortFromExternal, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (options.signal?.aborted) throw new FunctionCanceledError();
        throw new FunctionTimeoutError(timeoutMs);
      }
      if (error instanceof TypeError) throw new FunctionNetworkError();
      throw error;
    }

    if (!res.ok) {
      const responseText = await res.text().catch(() => '');
      throw new FunctionResponseError(res.status, functionName, responseText);
    }

    const contentType = res.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      yield await res.json() as T;
      return;
    }

    if (!res.body || typeof res.body.getReader !== 'function') {
      const responseText = await res.text();
      for (const line of responseText.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) yield JSON.parse(trimmed) as T;
      }
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) yield JSON.parse(trimmed) as T;
      }
      if (done) break;
    }

    if (buffer.trim()) yield JSON.parse(buffer.trim()) as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      if (options.signal?.aborted) throw new FunctionCanceledError();
      throw new FunctionTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromExternal);
  }
}
