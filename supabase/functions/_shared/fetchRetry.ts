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
    try {
      const res = await fetch(url, options);

      if (res.status === 429 && attempt < maxRetries) {
        const waitMs = Math.pow(2, attempt) * 1000;
        await sleep(waitMs);
        continue;
      }

      if (res.status >= 500 && attempt < maxRetries) {
        await sleep(attempt * 500);
        continue;
      }

      return res;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await sleep(attempt * 500);
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
