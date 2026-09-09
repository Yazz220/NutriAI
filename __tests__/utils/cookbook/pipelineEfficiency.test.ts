import fs from 'fs';
import path from 'path';

describe('recipe capture pipeline efficiency', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const migrationSource = fs.readFileSync(
    path.join(
      repoRoot,
      'supabase/migrations/20260902050515_optimize_recipe_capture_pipeline.sql',
    ),
    'utf8',
  );

  it('atomically stores the three accepted-analysis checkpoints', () => {
    expect(migrationSource).toContain('persist_recipe_capture_analysis');
    expect(migrationSource).toContain("'extraction', p_extraction_metadata");
    expect(migrationSource).toContain("'normalization', p_normalization_metadata");
    expect(migrationSource).toContain("'quality', p_quality_metadata");
  });

  it('publishes selected capture pages using the current art contract', () => {
    expect(migrationSource).toContain("'complete-recipe-page-4x5-v4'");
    expect(migrationSource).toContain("'recipe-capture-publication-v1'");
  });

  it('persists accepted extraction, normalization, and quality in one database operation', () => {
    const captureSource = fs.readFileSync(
      path.join(repoRoot, 'supabase/functions/capture-recipe/index.ts'),
      'utf8',
    );

    expect(captureSource).toContain(".rpc('persist_recipe_capture_analysis'");
  });

  it('lets the selected-version trigger publish a capture without a second finalization call', () => {
    const generationSource = fs.readFileSync(
      path.join(repoRoot, 'supabase/functions/generate-page-art/index.ts'),
      'utf8',
    );

    expect(generationSource).not.toContain('async function finalizeCapturePage(');
    expect(generationSource).not.toContain('await finalizeCapturePage(');
    expect(generationSource).not.toMatch(/\bversion_id:\s*versionId/);
  });
});
