import {
  buildVideoRecipeEvidencePrompt,
  classifyVideoModelFailure,
  MAX_DIRECT_VIDEO_BYTES,
  resolveVideoRecipeEvidence,
} from '@/supabase/functions/_shared/videoRecipeEvidence';

const allowPublicUrl = async () => {};

describe('video recipe evidence adapter', () => {
  it('canonicalizes supported YouTube watch, short, and share links', async () => {
    for (const value of [
      'https://youtu.be/abcdefghijk?t=12',
      'https://www.youtube.com/shorts/abcdefghijk',
      'https://m.youtube.com/watch?v=abcdefghijk&feature=share',
    ]) {
      await expect(resolveVideoRecipeEvidence(value, {
        checkPublicUrl: allowPublicUrl,
      })).resolves.toMatchObject({
        ready: true,
        kind: 'youtube',
        canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
        transcriptStatus: 'not_supplied',
        adapterVersion: 'video-source-v1',
      });
    }
  });

  it('rejects social post pages instead of pretending they are video files', async () => {
    await expect(resolveVideoRecipeEvidence(
      'https://www.tiktok.com/@cook/video/123456',
      { checkPublicUrl: allowPublicUrl },
    )).resolves.toEqual({
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: 'A tiktok.com page is not a directly retrievable video source.',
    });
  });

  it('acquires a bounded direct video as provider-independent base64 evidence', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(
      Uint8Array.from([1, 2, 3]),
      { status: 200, headers: { 'content-type': 'video/mp4', 'content-length': '3' } },
    ));

    await expect(resolveVideoRecipeEvidence('https://cdn.example.com/recipe.mp4', {
      fetchImpl,
      checkPublicUrl: allowPublicUrl,
    })).resolves.toEqual({
      ready: true,
      kind: 'direct_file',
      canonicalUrl: 'https://cdn.example.com/recipe.mp4',
      videoUrl: 'data:video/mp4;base64,AQID',
      mimeType: 'video/mp4',
      byteSize: 3,
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v1',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('https://cdn.example.com/recipe.mp4'),
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
  });

  it('distinguishes unavailable, oversized, and non-video URLs before model extraction', async () => {
    await expect(resolveVideoRecipeEvidence('https://cdn.example.com/private.mp4', {
      fetchImpl: jest.fn().mockResolvedValue(new Response(null, { status: 403 })),
      checkPublicUrl: allowPublicUrl,
    })).resolves.toMatchObject({ ready: false, reasonCode: 'video_unavailable' });

    await expect(resolveVideoRecipeEvidence('https://cdn.example.com/large.mp4', {
      fetchImpl: jest.fn().mockResolvedValue(new Response(null, {
        status: 200,
        headers: {
          'content-type': 'video/mp4',
          'content-length': String(MAX_DIRECT_VIDEO_BYTES + 1),
        },
      })),
      checkPublicUrl: allowPublicUrl,
    })).resolves.toMatchObject({ ready: false, reasonCode: 'video_too_large' });

    await expect(resolveVideoRecipeEvidence('https://example.com/reel', {
      fetchImpl: jest.fn().mockResolvedValue(new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })),
      checkPublicUrl: allowPublicUrl,
    })).resolves.toMatchObject({ ready: false, reasonCode: 'video_source_unsupported' });
  });

  it('makes transcript availability explicit and recognizes access failures', () => {
    const prompt = buildVideoRecipeEvidencePrompt({
      ready: true,
      kind: 'youtube',
      canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v1',
    });

    expect(prompt).toContain('No separate transcript was supplied');
    expect(prompt).toContain('return insufficient_evidence instead of inventing details');
    expect(classifyVideoModelFailure('The YouTube video is private and unavailable')).toBe('video_unavailable');
    expect(classifyVideoModelFailure('No endpoints support video input')).toBeNull();
  });
});
