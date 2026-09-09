import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('capture-recipe multi-image source validation', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'supabase/functions/capture-recipe/index.ts'),
    'utf8',
  );

  it('defines the storage ownership guard before multi-image request validation uses it', () => {
    const definitionIndex = source.indexOf('function isOwnedCaptureStoragePath');
    const requestValidationIndex = source.indexOf(
      "additionalImagePaths.some((path) => !isOwnedCaptureStoragePath(path, user!.id))",
    );

    expect(definitionIndex).toBeGreaterThan(-1);
    expect(requestValidationIndex).toBeGreaterThan(definitionIndex);
  });

  it('releases and continues after a newly checkpointed asynchronous stage', () => {
    expect(source).toContain("status: 'continue'");
    expect(source).toContain("'acquisition' | 'transcription'");
    expect(source).toContain("processing_started_at: null");
    expect(source).toContain("callFunction('capture-recipe', authHeader, { captureId })");
  });
});
