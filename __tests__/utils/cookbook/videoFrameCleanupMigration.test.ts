import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(
  process.cwd(),
  'supabase/migrations/20260831194027_cleanup_video_frame_storage.sql',
), 'utf8');

describe('capture auxiliary storage cleanup migration', () => {
  it('collects the main capture object, video frames, and additional recipe images', () => {
    expect(migration).toContain('select capture.source_storage_path as path');
    expect(migration).toContain("capture.source_payload -> 'framePaths'");
    expect(migration).toContain("capture.source_payload -> 'additionalImagePaths'");
    expect(migration).toContain("select caller_id, 'recipe-captures', path");
  });

  it('keeps ownership and remaining-reference checks around cleanup jobs', () => {
    expect(migration).toContain("candidate.path like caller_id::text || '/%'");
    expect(migration).toContain('where capture.source_storage_path = path');
    expect(migration).toContain('on conflict (bucket, object_path) do nothing');
  });
});
