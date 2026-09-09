import {
  sanitizeForTelemetry,
  sanitizeSentryEvent,
  sanitizeTelemetryString,
  sanitizeTelemetryUrl,
} from '@/utils/observability/privacy';

describe('Sentry privacy sanitization', () => {
  it('removes query strings and route identifiers from URLs', () => {
    expect(sanitizeTelemetryUrl(
      'https://example.com/recipes/3b49464e-b548-49fc-8db5-a801a1bb7f82?token=secret',
    )).toBe('https://example.com/recipes/[id]');
  });

  it('redacts source material and credentials while preserving diagnostic fields', () => {
    expect(sanitizeForTelemetry({
      provider: 'openrouter',
      status: 429,
      sourceText: 'family recipe',
      Authorization: 'Bearer secret-token',
    })).toEqual({
      provider: 'openrouter',
      status: 429,
      sourceText: '[Filtered]',
      Authorization: '[Filtered]',
    });
  });

  it('removes emails and embedded URL details from messages', () => {
    expect(sanitizeTelemetryString(
      'User chef@example.com failed at https://folio.test/items/3b49464e-b548-49fc-8db5-a801a1bb7f82?q=private',
    )).toBe('User [Filtered email] failed at https://folio.test/items/[id]');
  });

  it('preserves stacktrace structure while scrubbing app-owned event data', () => {
    const stacktrace = {
      frames: [{ filename: 'app.tsx', lineno: 42, function: 'renderRecipe' }],
    };
    const mechanism = { handled: true, type: 'generic' };

    const sanitized = sanitizeSentryEvent({
      user: { id: 'safe-user-id', email: 'chef@example.com' },
      request: {
        method: 'POST',
        url: 'https://example.com/recipes/123?token=secret',
        headers: { authorization: 'Bearer secret' },
        data: { sourceText: 'private recipe' },
      },
      extra: { prompt: 'private prompt', operation: 'generate' },
      exception: {
        values: [{
          type: 'Error',
          value: 'Failed for chef@example.com',
          stacktrace,
          mechanism,
        }],
      },
    });

    expect(sanitized.user).toEqual({ id: 'safe-user-id' });
    expect(sanitized.request).toEqual({ method: 'POST', url: 'https://example.com/recipes/123' });
    expect(sanitized.extra).toEqual({ prompt: '[Filtered]', operation: 'generate' });
    expect(sanitized.exception?.values?.[0]).toEqual(expect.objectContaining({
      value: 'Failed for [Filtered email]',
      stacktrace,
      mechanism,
    }));
  });
});
