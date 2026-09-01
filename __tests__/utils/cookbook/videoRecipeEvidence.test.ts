import {
  acquireDirectVideoRecipeSource,
  buildVideoRecipeEvidencePrompt,
  classifyVideoModelFailure,
  degradedVideoEvidenceNote,
  inspectUploadedVideoRecipeSource,
  MAX_DIRECT_VIDEO_BYTES,
  resolveUploadedVideoRecipeEvidence,
  resolveVideoRecipeEvidence,
} from '@/supabase/functions/_shared/videoRecipeEvidence';
import {
  classifyVideoSourceUrl,
  isRecognizedVideoSourceUrl,
} from '@/supabase/functions/_shared/videoSource';
import { transcribeVideoRecipeEvidence } from '@/supabase/functions/_shared/videoTranscription';

const allowPublicUrl = async () => {};

function validMp4Bytes(): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], 0);
  return bytes;
}

describe('video recipe evidence adapter', () => {
  it('recognizes platform links consistently but keeps them as unprocessed bookmarks', async () => {
    for (const value of [
      'https://youtu.be/abcdefghijk?t=12',
      'https://www.youtube.com/shorts/abcdefghijk',
      'https://m.youtube.com/watch?v=abcdefghijk&feature=share',
      'https://www.youtube-nocookie.com/embed/abcdefghijk',
    ]) {
      await expect(resolveVideoRecipeEvidence(value, {
        checkPublicUrl: allowPublicUrl,
      })).resolves.toMatchObject({ ready: false, reasonCode: 'video_source_unsupported' });
    }

    expect(classifyVideoSourceUrl('https://youtu.be/abcdefghijk?t=12')).toEqual({
      kind: 'platform_link',
      platform: 'youtube',
      canonicalUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
    });
    expect(isRecognizedVideoSourceUrl('https://www.instagram.com/reel/recipe')).toBe(true);
    expect(isRecognizedVideoSourceUrl('https://video.xx.fbcdn.net/recipe.mp4')).toBe(true);
    expect(isRecognizedVideoSourceUrl('https://v16.tiktokcdn.com/recipe.mp4')).toBe(true);
    expect(isRecognizedVideoSourceUrl('https://example.com/recipe')).toBe(false);
  });

  it('rejects social post pages instead of pretending they are video files', async () => {
    await expect(resolveVideoRecipeEvidence(
      'https://www.tiktok.com/@cook/video/123456',
      { checkPublicUrl: allowPublicUrl },
    )).resolves.toEqual({
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: 'TikTok links are retained as source bookmarks and are not downloaded or processed at launch.',
    });
  });

  it('requires an ownership or permission confirmation before direct acquisition', async () => {
    const fetchImpl = jest.fn();
    await expect(resolveVideoRecipeEvidence('https://cdn.example.com/recipe.mp4', {
      fetchImpl,
      checkPublicUrl: allowPublicUrl,
    })).resolves.toMatchObject({ ready: false, reasonCode: 'video_permission_required' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('acquires a bounded direct video as provider-independent base64 evidence', async () => {
    const bytes = validMp4Bytes();
    const fetchImpl = jest.fn().mockResolvedValue(new Response(
      bytes,
      { status: 200, headers: { 'content-type': 'video/mp4', 'content-length': '32' } },
    ));

    await expect(resolveVideoRecipeEvidence('https://cdn.example.com/recipe.mp4', {
      fetchImpl,
      checkPublicUrl: allowPublicUrl,
      rightsConfirmed: true,
    })).resolves.toEqual({
      ready: true,
      kind: 'direct_file',
      canonicalUrl: 'https://cdn.example.com/recipe.mp4',
      videoUrl: expect.stringMatching(/^data:video\/mp4;base64,/),
      mimeType: 'video/mp4',
      byteSize: 32,
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v2',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL('https://cdn.example.com/recipe.mp4'),
      expect.objectContaining({ method: 'GET', redirect: 'manual' }),
    );
  });

  it('exposes the acquired direct-video bytes for capture-owned transcription and extraction', async () => {
    const bytes = validMp4Bytes();
    const fetchImpl = jest.fn().mockResolvedValue(new Response(
      bytes,
      { status: 200, headers: { 'content-type': 'video/mp4', 'content-length': '32' } },
    ));

    const result = await acquireDirectVideoRecipeSource('https://cdn.example.com/recipe.mp4', {
      fetchImpl,
      checkPublicUrl: allowPublicUrl,
      rightsConfirmed: true,
    });

    expect(result).toEqual({
      ready: true,
      kind: 'direct_file',
      canonicalUrl: 'https://cdn.example.com/recipe.mp4',
      bytes,
      mimeType: 'video/mp4',
      byteSize: 32,
      adapterVersion: 'video-source-v2',
    });
  });

  it('rejects redirects into social-platform media hosts before downloading them', async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(new Response(null, {
      status: 302,
      headers: { location: 'https://video.xx.fbcdn.net/recipe.mp4' },
    }));

    await expect(resolveVideoRecipeEvidence('https://redirect.example.com/recipe.mp4', {
      fetchImpl,
      checkPublicUrl: allowPublicUrl,
      rightsConfirmed: true,
    })).resolves.toMatchObject({
      ready: false,
      reasonCode: 'video_source_unsupported',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('distinguishes unavailable, oversized, and non-video URLs before model extraction', async () => {
    await expect(resolveVideoRecipeEvidence('https://cdn.example.com/private.mp4', {
      fetchImpl: jest.fn().mockResolvedValue(new Response(null, { status: 403 })),
      checkPublicUrl: allowPublicUrl,
      rightsConfirmed: true,
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
      rightsConfirmed: true,
    })).resolves.toMatchObject({ ready: false, reasonCode: 'video_too_large' });

    await expect(resolveVideoRecipeEvidence('https://example.com/reel', {
      fetchImpl: jest.fn().mockResolvedValue(new Response('<html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })),
      checkPublicUrl: allowPublicUrl,
      rightsConfirmed: true,
    })).resolves.toMatchObject({ ready: false, reasonCode: 'video_source_unsupported' });
  });

  it('validates and resolves a bounded user-supplied video without a public URL', () => {
    const bytes = validMp4Bytes();
    expect(inspectUploadedVideoRecipeSource({
      byteSize: 32,
      mimeType: 'video/quicktime',
      fileName: 'recipe.mov',
      rightsConfirmed: true,
    })).toEqual({
      ready: true,
      mimeType: 'video/mov',
      byteSize: 32,
      adapterVersion: 'video-source-v2',
    });

    expect(resolveUploadedVideoRecipeEvidence({
      bytes,
      mimeType: 'video/mp4',
      fileName: 'recipe.mp4',
      rightsConfirmed: true,
    })).toEqual({
      ready: true,
      kind: 'owned_upload',
      videoUrl: expect.stringMatching(/^data:video\/mp4;base64,/),
      mimeType: 'video/mp4',
      byteSize: 32,
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v2',
    });

    expect(inspectUploadedVideoRecipeSource({
      byteSize: MAX_DIRECT_VIDEO_BYTES + 1,
      mimeType: 'video/mp4',
      rightsConfirmed: true,
    })).toMatchObject({ ready: false, reasonCode: 'video_too_large' });
    expect(inspectUploadedVideoRecipeSource({
      byteSize: 0,
      mimeType: 'video/mp4',
      rightsConfirmed: true,
    })).toMatchObject({ ready: false, reasonCode: 'video_source_unsupported' });
    expect(inspectUploadedVideoRecipeSource({
      byteSize: 32,
      mimeType: 'video/mp4',
      fileName: 'renamed-file.mp4',
      rightsConfirmed: true,
      headerBytes: new Uint8Array(32),
    })).toMatchObject({
      ready: false,
      reasonCode: 'video_source_unsupported',
      diagnostic: expect.stringContaining('container signature'),
    });
  });

  it.each([
    ['video/mp4', 'recipe.mp4'],
    ['video/mov', 'recipe.mov'],
    ['video/mpeg', 'recipe.mpeg'],
    ['video/webm', 'recipe.webm'],
  ] as const)('transcribes an inspected %s upload through the direct-media adapter', async (mimeType, fileName) => {
    const fetchImpl = jest.fn().mockImplementation(async (_input, init?: RequestInit) => {
      const form = init?.body as FormData;
      expect(form).toBeInstanceOf(FormData);
      expect(form.get('model_id')).toBe('scribe_v2');
      expect(form.get('tag_audio_events')).toBe('false');
      expect(form.get('diarize')).toBe('false');
      expect(form.get('timestamps_granularity')).toBe('none');
      const file = form.get('file');
      expect(file).toBeInstanceOf(Blob);
      expect((file as Blob).type).toBe(mimeType);
      return new Response(JSON.stringify({ text: 'Add two eggs, then whisk and fry.' }), { status: 200 });
    });

    await expect(transcribeVideoRecipeEvidence({
      bytes: validMp4Bytes(),
      mimeType,
      fileName,
    }, {
      apiBase: 'https://api.elevenlabs.io/v1',
      apiKey: 'test-key',
      model: 'scribe_v2',
      fetchImpl,
    })).resolves.toMatchObject({
      ready: true,
      transcript: 'Add two eggs, then whisk and fry.',
      provider: 'elevenlabs',
      adapterVersion: 'video-transcription-adapter-v1',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://api.elevenlabs.io/v1/speech-to-text',
      expect.objectContaining({
        method: 'POST',
        headers: { 'xi-api-key': 'test-key' },
      }),
    );
  });

  it('degrades without calling an undocumented audio endpoint when video STT is not configured', async () => {
    const fetchImpl = jest.fn();
    await expect(transcribeVideoRecipeEvidence({
      bytes: validMp4Bytes(),
      mimeType: 'video/mp4',
      fileName: 'recipe.mp4',
    }, {
      apiBase: 'https://api.elevenlabs.io/v1',
      apiKey: '',
      model: 'scribe_v2',
      fetchImpl,
    })).resolves.toMatchObject({
      ready: false,
      reasonCode: 'audio_transcription_failed',
      diagnostic: 'The video transcription provider is not configured.',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('makes transcript availability explicit and recognizes access failures', () => {
    const prompt = buildVideoRecipeEvidencePrompt({
      ready: true,
      kind: 'owned_upload',
      videoUrl: 'data:video/mp4;base64,AQID',
      mimeType: 'video/mp4',
      transcriptStatus: 'not_supplied',
      adapterVersion: 'video-source-v2',
    }, { notes: 'Use the creator\'s corrected quantity.' });

    expect(prompt).toContain('<UNTRUSTED_USER_NOTES>');
    expect(prompt).toContain("Use the creator's corrected quantity.");
    expect(prompt).toContain('return insufficient_evidence instead of inventing details');
    expect(classifyVideoModelFailure('The YouTube video is private and unavailable')).toBe('video_unavailable');
    expect(classifyVideoModelFailure('No endpoints support video input')).toBeNull();
  });

  it('includes narration transcript and sampled-frame guidance when supplied', () => {
    const prompt = buildVideoRecipeEvidencePrompt({
      ready: true,
      kind: 'owned_upload',
      videoUrl: 'data:video/mp4;base64,AQID',
      mimeType: 'video/mp4',
      transcriptStatus: 'supplied',
      adapterVersion: 'video-source-v2',
    }, { transcript: 'Add two cups of flour', frameCount: 4 });

    expect(prompt).toContain('<UNTRUSTED_AUDIO_TRANSCRIPT>');
    expect(prompt).toContain('Add two cups of flour');
    expect(prompt).toContain('SAMPLED VIDEO FRAMES: 4 frames');
    expect(prompt).toContain('treat the transcript as the textual record of it');
  });

  it('describes degraded evidence when the whole video is not attached', () => {
    const prompt = buildVideoRecipeEvidencePrompt({
      ready: true,
      kind: 'owned_upload',
      videoUrl: 'data:video/mp4;base64,AQID',
      mimeType: 'video/mp4',
      transcriptStatus: 'supplied',
      adapterVersion: 'video-source-v2',
    }, { transcript: 'Whisk three eggs', frameCount: 2, wholeVideoAttached: false });

    expect(prompt).toContain('the whole video could not be attached');
    expect(prompt).not.toContain('the full video is also attached');
  });

  it('records exactly which decomposed signals supported a degraded extraction', () => {
    expect(degradedVideoEvidenceNote({ hasTranscript: true, frameCount: 3 }))
      .toContain('narration transcript and sampled frames');
    expect(degradedVideoEvidenceNote({ hasTranscript: true, frameCount: 0 }))
      .toContain('narration transcript.');
    expect(degradedVideoEvidenceNote({ hasTranscript: false, frameCount: 3 }))
      .toContain('sampled frames.');
    expect(degradedVideoEvidenceNote({ hasTranscript: false, frameCount: 0 })).toBeNull();
  });
});
