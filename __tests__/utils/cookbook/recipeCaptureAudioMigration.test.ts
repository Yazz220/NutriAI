import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(
  process.cwd(),
  'supabase/migrations/20260830162003_add_audio_recipe_captures.sql',
), 'utf8');

describe('audio recipe capture migration', () => {
  it('allows audio only through stored capture paths', () => {
    expect(migration).toContain("source_type in ('url', 'text', 'image', 'video', 'audio')");
    expect(migration).toContain("source_storage_path is null or source_type in ('image', 'audio')");
    expect(migration).toContain("source_type not in ('image', 'audio') or source_storage_path is not null");
    expect(migration).toContain("p_source_type in ('image', 'audio') and p_source_storage_path is null");
  });

  it('extends the private source bucket without widening its ownership policy', () => {
    expect(migration).toContain("'audio/mp4'");
    expect(migration).toContain("'audio/mpeg'");
    expect(migration).toContain("where id = 'recipe-captures'");
    expect(migration).not.toContain('create policy');
  });
});
