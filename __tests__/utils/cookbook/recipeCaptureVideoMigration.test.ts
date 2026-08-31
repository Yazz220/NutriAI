import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(
  process.cwd(),
  'supabase/migrations/20260830210000_add_permissioned_video_captures.sql',
), 'utf8');

describe('permissioned video capture migration', () => {
  it('allows a stored path for video while keeping URL video bookmarks optional', () => {
    expect(migration).toContain("source_storage_path is null or source_type in ('image', 'video', 'audio')");
    expect(migration).toContain("source_type not in ('image', 'audio') or source_storage_path is not null");
  });

  it('extends only the existing private capture bucket to the canonical video bound', () => {
    expect(migration).toContain('file_size_limit = 20000000');
    expect(migration).toContain("'video/mp4'");
    expect(migration).toContain("'video/quicktime'");
    expect(migration).toContain("where id = 'recipe-captures'");
    expect(migration).not.toContain('create policy');
  });
});
