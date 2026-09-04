/**
 * Fetch with retry and exponential backoff for external API calls.
 *
 * Retries on:
 *   - 429 (rate limit) — exponential backoff: 2s, 4s, 8s
 *   - 5xx (server error) — linear backoff: 0.5s, 1s, 1.5s
 *
 * Does NOT retry on 4xx (except 429) — those are client errors that won't
 * succeed on retry.
 */

const MAX_RETRIES = 3;

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    options.signal?.throwIfAborted();
    try {
      const res = await fetch(url, options);

      if (res.status === 429 && attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt) * 1000;
        await sleep(waitMs, options.signal);
        continue;
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(attempt * 500, options.signal);
        continue;
      }

      return res;
    } catch (error) {
      if (options.signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await sleep(attempt * 500, options.signal);
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
