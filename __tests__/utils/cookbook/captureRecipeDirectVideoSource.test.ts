import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('capture-recipe direct-video source lifecycle', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'supabase/functions/capture-recipe/index.ts'),
    'utf8',
  );

  it('acquires a direct video once and shares its bounded bytes with transcription and extraction', () => {
    expect(source).toContain('const directVideo = await acquireDirectVideoRecipeSource(input');
    expect(source).toContain("sourceKind: 'direct_file'");
    expect(source).toContain('const videoTranscript = await videoTranscriptForSource(admin, capture, payload');
    expect(source).toContain('videoBase64: toBase64(directVideo.bytes)');
    expect(source).not.toContain('videoUrl: input');
  });
});
