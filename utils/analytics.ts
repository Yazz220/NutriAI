// Lightweight analytics & error-reporting shim.
// Central place for product events and crash capture. For now it logs to console
// and can be extended to forward to a real backend (Sentry, Amplitude, etc.) later.

export type AppAnalyticsEvent = {
  type: string;
  step?: number;
  data?: Record<string, unknown> | null;
  timestamp?: string;
};

/**
 * Track a product event.
 * Replace the body with a real SDK call (e.g. Amplitude.track) when ready.
 */
export function trackEvent(event: Omit<AppAnalyticsEvent, 'timestamp'>) {
  try {
    const withTime: AppAnalyticsEvent = { ...event, timestamp: new Date().toISOString() };
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[ANALYTICS]', withTime);
    }
    // TODO: forward to Amplitude / Segment / PostHog
  } catch {
    // swallow — analytics must never crash the app
  }
}

/**
 * Capture an error for crash reporting.
 * Replace with Sentry.captureException (or similar) when ready.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  try {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ERROR_CAPTURE]', error, context);
    }
    // TODO: Sentry.captureException(error, { extra: context })
  } catch {
    // swallow — error reporting must never crash the app
  }
}

/**
 * Set the authenticated user for analytics + error scoping.
 * Call on sign-in; call with null on sign-out.
 */
export function identifyUser(userId: string | null, traits?: Record<string, unknown>) {
  try {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[IDENTIFY]', userId, traits);
    }
    // TODO: Sentry.setUser(userId ? { id: userId, ...traits } : null)
    // TODO: Amplitude.setUserId(userId)
  } catch {
    // swallow
  }
}

// React hook wrapper (keeps API familiar for component authors)
export const useAnalytics = () => ({ trackEvent, captureError, identifyUser });
