import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('reader deletion endpoint', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'supabase/functions/delete-reader-content/index.ts'),
    'utf8',
  );

  it('treats an already removed target as an idempotent success', () => {
    expect(source).toContain("error.code === 'P0002'");
    expect(source).toContain('response.error && !isMissingDeletionTarget(response.error)');
    expect(source).not.toContain("record.code === 'P0002' ? 404");
  });
});
