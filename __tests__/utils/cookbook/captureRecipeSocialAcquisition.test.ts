import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('capture-recipe social acquisition lifecycle', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'supabase/functions/capture-recipe/index.ts'),
    'utf8',
  );

  it('continues from a durable ready checkpoint before starting extraction', () => {
    expect(source).toContain("if (result.status === 'pending' || result.status === 'ready')");
    expect(source).toContain("return { status: 'continue', stage: 'acquisition' }");
    expect(source).toContain("checkpoint.status === 'ready'");
    expect(source).toContain('acquiredVideoEvidence: evidence');
  });
});
