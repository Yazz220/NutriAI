import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(
  process.cwd(),
  'supabase/migrations/20260830174134_version_recipe_capture_stages.sql',
), 'utf8');

describe('recipe capture stage migration', () => {
  it('persists versioned checkpoints and the failed stage on the durable capture', () => {
    expect(migration).toContain("stage_checkpoints jsonb not null default '{}'::jsonb");
    expect(migration).toContain('failed_stage text');
    expect(migration).toContain('record_recipe_capture_checkpoint');
    expect(migration).toContain("'source', 'transcription', 'extraction', 'normalization', 'quality'");
    expect(migration).toContain("'page_generation', 'publication'");
  });

  it('keeps checkpoint writes private to the service pipeline', () => {
    expect(migration).toContain(
      'revoke all on function nutriai.record_recipe_capture_checkpoint(uuid, uuid, text, text, jsonb)',
    );
    expect(migration).toContain(
      'grant execute on function nutriai.record_recipe_capture_checkpoint(uuid, uuid, text, text, jsonb)',
    );
    expect(migration).toContain('to service_role;');
  });

  it('distinguishes page generation failure from publication failure', () => {
    expect(migration).toContain("failure_code = 'page_generation_failed'");
    expect(migration).toContain("failure_code = 'publication_failed'");
    expect(migration).toContain('fail_recipe_capture_publication');
    expect(migration).toContain("when p_failed_stage = 'publication' then 'ready'");
  });

  it('marks old captures explicitly instead of pretending they used the new contract', () => {
    expect(migration).toContain("'version', 'legacy-unversioned'");
  });
});
