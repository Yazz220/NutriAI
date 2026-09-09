import * as Sentry from 'npm:@sentry/deno@10.73.0';

type DiagnosticMeta = Record<string, unknown>;

export type ExternalFailureCategory =
  | 'authentication'
  | 'configuration'
  | 'quota'
  | 'rate_limit'
  | 'timeout'
  | 'unavailable'
  | 'invalid_response'
  | 'unknown';

const dsn = Deno.env.get('SENTRY_DSN')?.trim();
const environment = Deno.env.get('SENTRY_ENVIRONMENT')?.trim() || 'production';
const SENSITIVE_KEY = /(?:authorization|cookie|password|secret|token|email|phone|source|prompt|recipe|transcript|content|body|payload|image|audio|video|file|attachment)/i;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const URL = /https?:\/\/[^\s"'<>]+/gi;

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    defaultIntegrations: false,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      return sanitizeEvent(event);
    },
    beforeSendTransaction(event) {
      return sanitizeEvent(event);
    },
  });
}

export const isEdgeSentryConfigured = Boolean(dsn);

function sanitizeString(value: string): string {
  const sanitized = value
    .replace(/\bBearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [Filtered]')
    .replace(EMAIL, '[Filtered email]')
    .replace(UUID, '[id]')
    .replace(URL, (rawUrl) => {
      try {
        const parsed = new globalThis.URL(rawUrl);
        return `${parsed.origin}${parsed.pathname.replace(UUID, '[id]')}`;
      } catch {
        return '[Filtered URL]';
      }
    });
  return sanitized.length > 400 ? `${sanitized.slice(0, 400)}… [truncated]` : sanitized;
}

function sanitizeForSentry(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'bigint') return value.toString();
  if (depth >= 4) return '[Truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeForSentry(item, depth + 1));
  if (value instanceof Error) return { name: value.name, message: sanitizeString(value.message) };
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as DiagnosticMeta).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[Filtered]' : sanitizeForSentry(item, depth + 1),
      ]),
    );
  }
  return String(value);
}

function sanitizeEvent<T extends Sentry.Event>(event: T): T {
  return {
    ...event,
    message: typeof event.message === 'string' ? sanitizeString(event.message) : event.message,
    transaction: typeof event.transaction === 'string'
      ? sanitizeString(event.transaction)
      : event.transaction,
    // Edge Functions never need identity in provider diagnostics. Keeping this
    // empty also prevents an SDK update from attaching an IP address as a user.
    user: undefined,
    server_name: undefined,
    request: event.request
      ? {
          method: event.request.method,
          url: typeof event.request.url === 'string' ? sanitizeString(event.request.url) : undefined,
        }
      : undefined,
    extra: sanitizeForSentry(event.extra) as Sentry.Event['extra'],
    breadcrumbs: event.breadcrumbs?.slice(-20).map((breadcrumb) => ({
      ...breadcrumb,
      message: typeof breadcrumb.message === 'string'
        ? sanitizeString(breadcrumb.message)
        : breadcrumb.message,
      data: sanitizeForSentry(breadcrumb.data) as typeof breadcrumb.data,
    })),
    exception: event.exception?.values
      ? {
          ...event.exception,
          values: event.exception.values.map((value) => ({
            ...value,
            value: typeof value.value === 'string' ? sanitizeString(value.value) : value.value,
          })),
        }
      : event.exception,
  } as T;
}

export function classifyExternalFailure(message: string, status?: number): ExternalFailureCategory {
  const normalized = message.toLowerCase();
  if (status === 401 || status === 403 || /(?:unauthori[sz]ed|forbidden|invalid api key)/.test(normalized)) {
    return 'authentication';
  }
  if (status === 402 || /(?:quota|credit|billing|insufficient funds|payment required)/.test(normalized)) {
    return 'quota';
  }
  if (status === 429 || /(?:rate.?limit|too many requests)/.test(normalized)) return 'rate_limit';
  if (/(?:missing|not configured|configuration)/.test(normalized)) return 'configuration';
  if (/(?:timed? out|timeout|aborted)/.test(normalized)) return 'timeout';
  if ((status != null && status >= 500) || /(?:temporarily unavailable|service unavailable|bad gateway)/.test(normalized)) {
    return 'unavailable';
  }
  if (/(?:invalid|schema|validation|parse|empty response|did not include)/.test(normalized)) {
    return 'invalid_response';
  }
  return 'unknown';
}

function inferProvider(message: string, meta: DiagnosticMeta): string | undefined {
  const explicit = meta.provider ?? meta.externalService;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim().toLowerCase();
  const normalized = message.toLowerCase();
  if (normalized.includes('openrouter')) return 'openrouter';
  if (normalized.includes('revenuecat')) return 'revenuecat';
  if (normalized.includes('supadata')) return 'supadata';
  if (normalized.includes('elevenlabs')) return 'elevenlabs';
  return undefined;
}

function scheduleFlush(): void {
  const flush = Sentry.flush(2_000).catch(() => false);
  const edgeRuntime = (globalThis as typeof globalThis & {
    EdgeRuntime?: { waitUntil(promise: Promise<unknown>): void };
  }).EdgeRuntime;
  if (edgeRuntime) edgeRuntime.waitUntil(flush);
}

export function captureEdgeError(message: string, meta: DiagnosticMeta = {}): void {
  if (!isEdgeSentryConfigured) return;

  try {
    const rawError = meta.error;
    const error = rawError instanceof Error
      ? rawError
      : new Error(typeof rawError === 'string' ? sanitizeString(rawError) : message);
    const status = typeof meta.status === 'number' ? meta.status : undefined;
    const category = typeof meta.failureCategory === 'string'
      ? meta.failureCategory
      : classifyExternalFailure(error.message, status);
    const provider = inferProvider(message, meta);

    Sentry.withScope((scope) => {
      scope.setLevel('error');
      scope.setTag('folio.component', 'edge-function');
      scope.setTag('failure.category', category);
      if (provider) scope.setTag('provider', provider);
      if (typeof meta.operation === 'string') scope.setTag('provider.operation', meta.operation);
      if (typeof meta.model === 'string') scope.setTag('provider.model', meta.model);
      if (status != null) scope.setTag('http.status_code', String(status));
      scope.setFingerprint([message, provider ?? 'application', category]);
      scope.setContext('folio_diagnostics', sanitizeForSentry({ ...meta, error: undefined }) as DiagnosticMeta);
      Sentry.captureException(error);
    });
    scheduleFlush();
  } catch {
    // Observability must never interrupt a user request.
  }
}
