import { buildImageRecipeEvidencePrompt } from '@/supabase/functions/_shared/imageRecipeEvidence';

describe('image recipe evidence prompt', () => {
  it('preserves user notes as evidence alongside the image', () => {
    const prompt = buildImageRecipeEvidencePrompt('This is the second half; use 180°C.');

    expect(prompt).toContain('Read all visible text');
    expect(prompt).toContain('This is the second half; use 180°C.');
    expect(prompt).toContain('Do not invent details');
  });

  it('does not add an empty note section', () => {
    expect(buildImageRecipeEvidencePrompt('   ')).toBe(
      'Extract the complete recipe from this image. Read all visible text, handwriting, and cooking details.',
    );
  });
});
