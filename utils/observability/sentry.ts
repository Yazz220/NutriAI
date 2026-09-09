import * as Sentry from '@sentry/react-native';
import { sanitizeForTelemetry, sanitizeSentryEvent } from './privacy';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const environment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT?.trim()
  || (__DEV__ ? 'development' : 'production');

export const sentryNavigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
  ignoreEmptyBackNavigationTransactions: true,
});

export const isSentryConfigured = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    enabled: true,
    debug: __DEV__,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    enableLogs: true,
    tracesSampleRate: __DEV__ ? 1 : 0.1,
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    maxBreadcrumbs: 50,
    normalizeDepth: 3,
    integrations: [sentryNavigationIntegration],
    tracePropagationTargets: [
      /^https:\/\/fydixibsozngqiaekqii\.supabase\.co\/(?:auth|functions|rest|storage)\/v1\//,
      /^http:\/\/localhost(?::\d+)?\//,
    ],
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console' || breadcrumb.category?.startsWith('ui.')) return null;
      return sanitizeForTelemetry(breadcrumb) as typeof breadcrumb;
    },
    beforeSend(event) {
      return sanitizeSentryEvent(event, { retainUserId: true });
    },
    beforeSendTransaction(event) {
      return sanitizeSentryEvent(event, { retainUserId: true });
    },
    beforeSendLog(log) {
      return sanitizeForTelemetry(log) as typeof log;
    },
  });
}

export { Sentry };
