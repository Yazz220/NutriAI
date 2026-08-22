import { supabase } from '@/lib/supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DEFAULT_FUNCTION_TIMEOUT_MS = 60_000;

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
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase is not configured.');
  }

  const token = await getAccessToken();
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/${functionName}`;
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
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
