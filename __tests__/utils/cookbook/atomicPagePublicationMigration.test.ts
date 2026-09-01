import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('atomic capture page publication migration', () => {
  const migration = readFileSync(
    resolve(process.cwd(), 'supabase/migrations/20260901000500_atomic_capture_page_publication.sql'),
    'utf8',
  );

  it('publishes a capture in the same transaction that selects its ready page version', () => {
    expect(migration).toContain('after update of selected_version_id on nutriai.cookbook_pages');
    expect(migration).toContain("version.status = 'ready'");
    expect(migration).toContain('perform nutriai.finalize_recipe_capture_page(');
    expect(migration).toContain("'complete-recipe-page-4x5-v3'");
    expect(migration).toContain("'recipe-capture-publication-v1'");
  });
});
