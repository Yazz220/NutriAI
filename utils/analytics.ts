// Lightweight analytics and error-reporting boundary. Product analytics remain
// local for now; diagnostics are forwarded to Sentry through privacy scrubbers.

import { Sentry, isSentryConfigured } from '@/utils/observability/sentry';
import { sanitizeForTelemetry } from '@/utils/observability/privacy';

export type AppAnalyticsEvent = {
  type: string;
  step?: number;
  data?: Record<string, unknown> | null;
  timestamp?: string;
};

/**
 * Track a product event and retain a minimal breadcrumb for error diagnosis.
 */
export function trackEvent(event: Omit<AppAnalyticsEvent, 'timestamp'>) {
  try {
    const withTime: AppAnalyticsEvent = { ...event, timestamp: new Date().toISOString() };
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[ANALYTICS]', withTime);
    }
    if (isSentryConfigured) {
      Sentry.addBreadcrumb({
        category: 'product',
        type: 'default',
        message: event.type,
        data: sanitizeForTelemetry(event.data) as Record<string, unknown> | undefined,
      });
    }
  } catch {
    // swallow: analytics must never crash the app
  }
}

/**
 * Capture an error for crash reporting without recipe/source content.
 */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  try {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error('[ERROR_CAPTURE]', error, context);
    }
    if (isSentryConfigured) {
      Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
        extra: sanitizeForTelemetry(context) as Record<string, unknown> | undefined,
      });
    }
  } catch {
    // swallow: error reporting must never crash the app
  }
}

/**
 * Set the authenticated user for analytics + error scoping.
 * Call on sign-in; call with null on sign-out.
 */
export function identifyUser(userId: string | null) {
  try {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[IDENTIFY]', userId);
    }
    if (isSentryConfigured) Sentry.setUser(userId ? { id: userId } : null);
  } catch {
    // swallow
  }
}

// React hook wrapper (keeps API familiar for component authors)
export const useAnalytics = () => ({ trackEvent, captureError, identifyUser });
