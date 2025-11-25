/**
 * Network timeout utilities for handling slow/unreliable connections
 */

export interface TimeoutOptions {
  timeoutMs?: number;
  onTimeout?: () => void;
}

/**
 * Wraps a promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 30000)
 * @param onTimeout - Optional callback when timeout occurs
 * @returns Promise that rejects with timeout error if exceeded
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000,
  onTimeout?: () => void
): Promise<T> {
  let timeoutId: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      onTimeout?.();
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param initialDelayMs - Initial delay between retries (default: 1000)
 * @param maxDelayMs - Maximum delay between retries (default: 10000)
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000,
  maxDelayMs: number = 10000
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Exponential backoff with jitter
        delay = Math.min(delay * 1.5 + Math.random() * 1000, maxDelayMs);
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('offline') ||
    message.includes('econnrefused') ||
    message.includes('enotfound')
  );
}

/**
 * Check if an error is a retryable error
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  
  // Network errors are retryable
  if (isNetworkError(error)) return true;

  // Server errors (5xx) are retryable
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true;
  }

  // Rate limiting is retryable
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  return false;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'An unexpected error occurred. Please try again.';
  }

  const message = error.message.toLowerCase();

  if (message.includes('timeout')) {
    return 'Connection timeout. Please check your internet and try again.';
  }

  if (message.includes('network') || message.includes('offline')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  if (message.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  if (message.includes('password')) {
    return 'Password must be at least 6 characters.';
  }

  if (message.includes('already registered') || message.includes('user already exists')) {
    return 'This email is already registered. Please sign in instead.';
  }

  if (message.includes('invalid credentials') || message.includes('incorrect password')) {
    return 'Invalid email or password. Please try again.';
  }

  if (message.includes('user not found')) {
    return 'No account found with this email. Please sign up first.';
  }

  if (message.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  return error.message || 'An error occurred. Please try again.';
}
