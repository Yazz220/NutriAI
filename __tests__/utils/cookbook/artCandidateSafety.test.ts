import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('art candidate safety contract', () => {
  it('does not select a generated candidate unless the caller requests it', () => {
    const migration = fs.readFileSync(path.join(
      root,
      'supabase/migrations/20260821003837_art_candidate_selection.sql',
    ), 'utf8');
    const edgeFunction = fs.readFileSync(path.join(
      root,
      'supabase/functions/generate-page-art/index.ts',
    ), 'utf8');

    expect(migration).toContain('if p_select_version then');
    expect(migration).toContain('set selected_version_id = p_version_id');
    expect(edgeFunction).toContain(".rpc('complete_art_generation_request'");
    expect(edgeFunction).toContain('selectOnComplete !== false');
  });

  it('binds artwork selection to the owned page and matching version', () => {
    const migration = fs.readFileSync(path.join(
      root,
      'supabase/migrations/20260821003837_art_candidate_selection.sql',
    ), 'utf8');

    expect(migration).toContain('version.page_id = page.id');
    expect(migration).toContain('cookbook.user_id = (select auth.uid())');
    expect(migration).toContain('security invoker');
    expect(migration).toContain('to authenticated');
  });

  it('uses the current artwork as an image editing reference', () => {
    const edgeFunction = fs.readFileSync(path.join(
      root,
      'supabase/functions/generate-page-art/index.ts',
    ), 'utf8');
    const artGeneration = fs.readFileSync(path.join(
      root,
      'supabase/functions/_shared/artGeneration.ts',
    ), 'utf8');

    expect(edgeFunction).toContain('referenceArtUrl');
    expect(edgeFunction).toContain('inputReferences');
    expect(artGeneration).toContain('input_references');
  });
});
