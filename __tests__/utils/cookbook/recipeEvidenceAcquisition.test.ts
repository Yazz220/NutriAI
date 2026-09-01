import {
  buildAcquiredVideoEvidencePrompt,
  normalizeAcquiredVideoEvidenceBundle,
  socialVideoPlatformSupportsExternalAcquisition,
} from '@/supabase/functions/_shared/recipeEvidenceAcquisition';
import {
  createSupadataVideoEvidenceAdapter,
  SupadataVideoEvidenceError,
} from '@/supabase/functions/_shared/supadataVideoEvidence';

describe('recipe evidence acquisition', () => {
  it('keeps the provider result as bounded evidence instead of a RecipeGraph', () => {
    const evidence = normalizeAcquiredVideoEvidenceBundle({
      version: 'social-video-evidence-v1',
      source: {
        kind: 'social_video',
        platform: 'tiktok',
        canonicalUrl: 'https://www.tiktok.com/@cook/video/123',
      },
      metadata: {
        title: 'Crispy potatoes',
        description: 'Three-ingredient potatoes',
        creator: 'Kitchen Test',
      },
      observations: {
        visibleText: [{ timestamp: '0:03', text: '500 g potatoes' }],
        spokenRecipeDetails: [{ timestamp: '0:08', text: 'Roast at 220 C for 35 minutes' }],
        ingredients: ['500 g potatoes', '2 tbsp olive oil', '1 tsp salt'],
        actions: [{ timestamp: '0:12', text: 'Toss the potatoes with oil and salt' }],
        timingsAndTemperatures: ['220 C', '35 minutes'],
        conflicts: [],
      },
    });

    expect(evidence.source.platform).toBe('tiktok');
    expect(evidence.observations.ingredients).toEqual([
      '500 g potatoes',
      '2 tbsp olive oil',
      '1 tsp salt',
    ]);
    expect(evidence).not.toHaveProperty('recipeGraph');

    const prompt = buildAcquiredVideoEvidencePrompt(evidence);
    expect(prompt).toContain('<UNTRUSTED_SOCIAL_METADATA>');
    expect(prompt).toContain('<UNTRUSTED_VIDEO_OBSERVATIONS>');
    expect(prompt).toContain('500 g potatoes');
  });

  it('routes only the social platforms supported by the hosted acquisition contract', () => {
    expect(socialVideoPlatformSupportsExternalAcquisition('youtube')).toBe(true);
    expect(socialVideoPlatformSupportsExternalAcquisition('tiktok')).toBe(true);
    expect(socialVideoPlatformSupportsExternalAcquisition('instagram')).toBe(true);
    expect(socialVideoPlatformSupportsExternalAcquisition('facebook')).toBe(true);
    expect(socialVideoPlatformSupportsExternalAcquisition('pinterest')).toBe(false);
  });

  it('adapts Supadata metadata and seen/heard observations without requesting a transcript', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const fetchImpl = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, init });
      if (url.includes('/metadata?')) {
        return new Response(JSON.stringify({
          platform: 'youtube',
          type: 'video',
          id: 'abcdefghijk',
          url: 'https://www.youtube.com/watch?v=abcdefghijk',
          title: 'Fast tomato pasta',
          description: 'Dinner in 20 minutes',
          author: { displayName: 'Kitchen Test' },
          media: { type: 'video', duration: 42, thumbnailUrl: 'https://example.com/thumb.jpg' },
          createdAt: '2026-08-01T00:00:00Z',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (url.endsWith('/extract') && init?.method === 'POST') {
        return new Response(JSON.stringify({ jobId: 'job-123' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/extract/job-123')) {
        return new Response(JSON.stringify({
          status: 'completed',
          data: {
            visibleText: [{ timestamp: '0:02', text: '200 g spaghetti' }],
            spokenRecipeDetails: [{ timestamp: '0:05', text: 'Boil for 10 minutes' }],
            ingredients: ['200 g spaghetti', '2 tomatoes'],
            actions: [{ timestamp: '0:12', text: 'Stir tomatoes into the pasta' }],
            timingsAndTemperatures: ['10 minutes'],
            conflicts: [],
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('not found', { status: 404 });
    });
    const adapter = createSupadataVideoEvidenceAdapter({
      apiKey: 'test-key',
      apiBase: 'https://api.supadata.ai/v1',
      fetchImpl,
      now: () => new Date('2026-09-01T10:00:00.000Z'),
    });

    const started = await adapter.start({
      platform: 'youtube',
      canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    });
    expect(started.status).toBe('pending');
    if (started.status !== 'pending') throw new Error('Expected a pending acquisition');

    const completed = await adapter.poll(started.state);
    expect(completed).toMatchObject({
      status: 'ready',
      evidence: {
        source: { platform: 'youtube' },
        metadata: { title: 'Fast tomato pasta', creator: 'Kitchen Test', durationSeconds: 42 },
        observations: {
          ingredients: ['200 g spaghetti', '2 tomatoes'],
          spokenRecipeDetails: [{ timestamp: '0:05', text: 'Boil for 10 minutes' }],
        },
      },
    });
    expect(requests.every(({ url }) => !url.includes('/transcript'))).toBe(true);
    expect(requests.every(({ init }) => new Headers(init?.headers).get('x-api-key') === 'test-key')).toBe(true);
  });

  it('keeps an asynchronous job resumable without starting it again', async () => {
    const fetchImpl = jest.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/metadata?')) return new Response('{}', { status: 200 });
      if (url.endsWith('/extract') && init?.method === 'POST') {
        return new Response(JSON.stringify({ jobId: 'job-pending' }), { status: 202 });
      }
      return new Response(JSON.stringify({ status: 'active' }), { status: 200 });
    });
    const adapter = createSupadataVideoEvidenceAdapter({ apiKey: 'test-key', fetchImpl });

    const started = await adapter.start({
      platform: 'instagram',
      canonicalUrl: 'https://www.instagram.com/reel/recipe',
    });
    if (started.status !== 'pending') throw new Error('Expected a pending acquisition');
    const polled = await adapter.poll(started.state);

    expect(polled).toMatchObject({
      status: 'pending',
      state: { jobId: 'job-pending', pollCount: 1 },
    });
    expect(fetchImpl.mock.calls.filter(([, init]) => init?.method === 'POST')).toHaveLength(1);
  });

  it('classifies provider throttling as retryable technical failure', async () => {
    const adapter = createSupadataVideoEvidenceAdapter({
      apiKey: 'test-key',
      fetchImpl: jest.fn(async (input: string | URL | Request) => (
        String(input).includes('/metadata?')
          ? new Response('{}', { status: 200 })
          : new Response(JSON.stringify({ message: 'Too many requests' }), { status: 429 })
      )),
    });

    await expect(adapter.start({
      platform: 'facebook',
      canonicalUrl: 'https://www.facebook.com/reel/123',
    })).rejects.toEqual(expect.objectContaining<SupadataVideoEvidenceError>({
      name: 'SupadataVideoEvidenceError',
      kind: 'rate_limited',
    }));
  });

  it('settles on its own deadline when the provider fetch ignores abort signals', async () => {
    const adapter = createSupadataVideoEvidenceAdapter({
      apiKey: 'test-key',
      requestTimeoutMs: 5,
      fetchImpl: jest.fn(() => new Promise<Response>(() => undefined)),
    });

    await expect(adapter.start({
      platform: 'youtube',
      canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    })).rejects.toEqual(expect.objectContaining<SupadataVideoEvidenceError>({
      name: 'SupadataVideoEvidenceError',
      kind: 'temporary',
      message: 'Supadata request timed out.',
    }));
  });
});
