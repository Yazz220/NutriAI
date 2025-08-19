// Lightweight analytics shim for app events.
// Central place to call for product events. For now it logs to console and
// can be extended to forward to a real analytics backend later.

export type AppAnalyticsEvent = {
  type: string;
  step?: number;
  data?: Record<string, any> | null;
  timestamp?: string;
};

export function trackEvent(event: Omit<AppAnalyticsEvent, 'timestamp'>) {
  try {
    const withTime: AppAnalyticsEvent = { ...event, timestamp: new Date().toISOString() };
    // Minimal sink for now — console log and future hook-in point.
    // Replace or extend this to send events to Amplitude / Segment / GA / server.
    // Keeping it sync and lightweight avoids requiring React context in utility code.
    // eslint-disable-next-line no-console
    console.log('[ANALYTICS]', withTime);
  } catch (err) {
    // swallow analytics errors
  }
}

// React hook wrapper (keeps API familiar for component authors)
export const useAnalytics = () => ({ trackEvent });
