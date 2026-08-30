import {
  inspectAudioRecipeSource,
  MAX_AUDIO_CAPTURE_BYTES,
  resolveAudioRecipeEvidence,
} from '@/supabase/functions/_shared/audioRecipeEvidence';
import {
  MAX_AUDIO_TRANSCRIPT_CHARACTERS,
  transcribeAudioRecipeEvidence,
} from '@/supabase/functions/_shared/audioTranscription';

describe('audio recipe evidence', () => {
  it('accepts common voice-memo formats from MIME type or file extension', () => {
    expect(inspectAudioRecipeSource({
      byteSize: 42,
      mimeType: 'audio/mp4',
      fileName: 'Grandmas soup.m4a',
    })).toMatchObject({ ready: true, format: 'm4a', mimeType: 'audio/mp4' });

    expect(inspectAudioRecipeSource({
      byteSize: 42,
      mimeType: null,
      fileName: 'recipe.MP3',
    })).toMatchObject({ ready: true, format: 'mp3', mimeType: 'audio/mpeg' });
  });

  it('rejects unsupported and oversized files before upload or transcription', () => {
    expect(inspectAudioRecipeSource({
      byteSize: 42,
      mimeType: 'application/pdf',
      fileName: 'recipe.pdf',
    })).toMatchObject({ ready: false, reasonCode: 'audio_source_unsupported' });

    expect(inspectAudioRecipeSource({
      byteSize: MAX_AUDIO_CAPTURE_BYTES + 1,
      mimeType: 'audio/mpeg',
      fileName: 'long.mp3',
    })).toMatchObject({ ready: false, reasonCode: 'audio_too_large' });
  });

  it('encodes a bounded audio file for provider-neutral transcription', () => {
    expect(resolveAudioRecipeEvidence({
      bytes: Uint8Array.from([1, 2, 3]),
      mimeType: 'audio/wav',
      fileName: 'recipe.wav',
    })).toEqual({
      ready: true,
      format: 'wav',
      mimeType: 'audio/wav',
      byteSize: 3,
      adapterVersion: 'audio-source-v1',
      base64Audio: 'AQID',
    });
  });

  it('transcribes audio through the replaceable STT adapter', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(new Response(
      JSON.stringify({ text: 'Two eggs. Whisk and cook in butter.' }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    const evidence = resolveAudioRecipeEvidence({
      bytes: Uint8Array.from([1, 2, 3]),
      mimeType: 'audio/wav',
      fileName: 'recipe.wav',
    });
    if (!evidence.ready) throw new Error('Expected ready audio evidence');

    await expect(transcribeAudioRecipeEvidence(evidence, {
      apiBase: 'https://openrouter.ai/api/v1',
      apiKey: 'test-key',
      model: 'openai/whisper-large-v3',
      fetchImpl,
    })).resolves.toMatchObject({
      ready: true,
      transcript: 'Two eggs. Whisk and cook in butter.',
      adapterVersion: 'audio-transcription-v1',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/audio/transcriptions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"format":"wav"'),
      }),
    );
  });

  it('distinguishes silence from a temporary transcription failure', async () => {
    const evidence = resolveAudioRecipeEvidence({
      bytes: Uint8Array.from([1]),
      mimeType: 'audio/mpeg',
      fileName: 'recipe.mp3',
    });
    if (!evidence.ready) throw new Error('Expected ready audio evidence');

    await expect(transcribeAudioRecipeEvidence(evidence, {
      apiBase: 'https://openrouter.ai/api/v1',
      apiKey: 'test-key',
      model: 'openai/whisper-large-v3',
      fetchImpl: jest.fn().mockResolvedValue(new Response(JSON.stringify({ text: ' ' }), { status: 200 })),
    })).resolves.toMatchObject({ ready: false, reasonCode: 'audio_no_speech' });

    await expect(transcribeAudioRecipeEvidence(evidence, {
      apiBase: 'https://openrouter.ai/api/v1',
      apiKey: 'test-key',
      model: 'openai/whisper-large-v3',
      fetchImpl: jest.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'busy' }), { status: 503 })),
    })).resolves.toMatchObject({ ready: false, reasonCode: 'audio_transcription_failed' });

    await expect(transcribeAudioRecipeEvidence(evidence, {
      apiBase: 'https://openrouter.ai/api/v1',
      apiKey: 'test-key',
      model: 'openai/whisper-large-v3',
      fetchImpl: jest.fn().mockResolvedValue(new Response(JSON.stringify({
        text: 'a'.repeat(MAX_AUDIO_TRANSCRIPT_CHARACTERS + 1),
      }), { status: 200 })),
    })).resolves.toMatchObject({ ready: false, reasonCode: 'audio_too_large' });
  });
});
