import type { Event as SentryEvent } from '@sentry/react-native';

const SENSITIVE_KEY = /(?:authorization|cookie|password|secret|token|email|phone|source|prompt|recipe|transcript|content|body|payload|image|audio|video|file|attachment)/i;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~-]+/gi;
const DATA_URL = /data:[^;,\s]+(?:;base64)?,[A-Za-z0-9+/=_-]+/gi;

const MAX_STRING_LENGTH = 300;
const MAX_ARRAY_LENGTH = 20;
const MAX_DEPTH = 4;

function scrubPath(pathname: string): string {
  return pathname
    .replace(UUID, '[id]')
    .replace(/\/[0-9a-f]{24,}(?=\/|$)/gi, '/[id]')
    .replace(/\/{2,}/g, '/');
}

export function sanitizeTelemetryUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'data:' || parsed.protocol === 'blob:') return '[Filtered URL]';
    return `${parsed.origin}${scrubPath(parsed.pathname)}`;
  } catch {
    return value.replace(UUID, '[id]').slice(0, MAX_STRING_LENGTH);
  }
}

export function sanitizeTelemetryString(value: string): string {
  const scrubbed = value
    .replace(DATA_URL, '[Filtered data]')
    .replace(BEARER, 'Bearer [Filtered]')
    .replace(EMAIL, '[Filtered email]')
    .replace(UUID, '[id]')
    .replace(/https?:\/\/[^\s"'<>]+/gi, (url) => sanitizeTelemetryUrl(url));

  if (scrubbed.length <= MAX_STRING_LENGTH) return scrubbed;
  return `${scrubbed.slice(0, MAX_STRING_LENGTH)}… [truncated]`;
}

export function sanitizeForTelemetry(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return sanitizeTelemetryString(value);
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (depth >= MAX_DEPTH) return '[Truncated]';

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeForTelemetry(item, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeTelemetryString(value.message),
    };
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[Filtered]' : sanitizeForTelemetry(item, depth + 1),
      ]),
    );
  }

  return String(value);
}

/**
 * Scrub application-owned event fields without walking through Sentry's
 * stacktrace, mechanism, span, SDK, and runtime structures. Those structures
 * are required for grouping and source-map symbolication and must retain their
 * original shape.
 */
export function sanitizeSentryEvent<T extends SentryEvent>(
  event: T,
  options: { retainUserId?: boolean } = {},
): T {
  const retainUserId = options.retainUserId ?? true;
  const request = event.request
    ? {
        method: typeof event.request.method === 'string' ? event.request.method : undefined,
        url: typeof event.request.url === 'string'
          ? sanitizeTelemetryUrl(event.request.url)
          : undefined,
      }
    : undefined;
  const exception = event.exception?.values
    ? {
        ...event.exception,
        values: event.exception.values.map((value) => ({
          ...value,
          value: typeof value.value === 'string'
            ? sanitizeTelemetryString(value.value)
            : value.value,
        })),
      }
    : event.exception;
  const breadcrumbs = event.breadcrumbs?.slice(-MAX_ARRAY_LENGTH).map((breadcrumb) => ({
    ...breadcrumb,
    message: typeof breadcrumb.message === 'string'
      ? sanitizeTelemetryString(breadcrumb.message)
      : breadcrumb.message,
    data: sanitizeForTelemetry(breadcrumb.data),
  }));

  return {
    ...event,
    message: typeof event.message === 'string'
      ? sanitizeTelemetryString(event.message)
      : event.message,
    transaction: typeof event.transaction === 'string'
      ? sanitizeTelemetryString(event.transaction)
      : event.transaction,
    user: retainUserId && event.user?.id
      ? { id: sanitizeTelemetryString(String(event.user.id)) }
      : undefined,
    request,
    extra: sanitizeForTelemetry(event.extra) as Record<string, unknown> | undefined,
    breadcrumbs,
    exception,
  } as T;
}
