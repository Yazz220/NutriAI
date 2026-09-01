import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.join(
  process.cwd(),
  'supabase/migrations/20260901045939_add_recipe_evidence_acquisition_checkpoint.sql',
), 'utf8');
const failedStageMigration = fs.readFileSync(path.join(
  process.cwd(),
  'supabase/migrations/20260901162039_allow_recipe_acquisition_failed_stage.sql',
), 'utf8');

describe('recipe evidence acquisition checkpoint migration', () => {
  it('allows acquisition checkpoints and retryable acquisition failures', () => {
    expect(migration).toContain("'source', 'acquisition', 'transcription'");
    expect(migration).toContain("'destination', 'page_generation', 'publication'");
    expect(migration).toContain("p_stage = 'acquisition'");
    expect(migration).toContain("p_metadata ->> 'status' = 'pending'");
    expect(migration).toContain("'updatedAt', now()");
  });

  it('keeps checkpoint and failure writes restricted to the service role', () => {
    expect(migration).toContain(
      'revoke all on function nutriai.record_recipe_capture_checkpoint(uuid, uuid, text, text, jsonb)',
    );
    expect(migration).toContain(
      'revoke all on function nutriai.fail_recipe_capture(uuid, uuid, text, text, text)',
    );
    expect(migration).toContain('to service_role;');
  });

  it('allows the acquisition stage in the table constraint used by failure writes', () => {
    expect(failedStageMigration).toContain('drop constraint if exists recipe_captures_failed_stage_check');
    expect(failedStageMigration).toContain("'source', 'acquisition', 'transcription'");
    expect(failedStageMigration).toContain("'destination', 'page_generation', 'publication'");
  });
});
