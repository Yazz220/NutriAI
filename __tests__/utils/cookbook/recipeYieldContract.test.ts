import fs from 'node:fs';
import path from 'node:path';

describe('recipe yield persistence contract', () => {
  it('allows canonical page revisions to omit a numeric serving count', () => {
    const migration = fs.readFileSync(path.join(
      process.cwd(),
      'supabase/migrations/20260830051728_allow_unknown_recipe_servings.sql',
    ), 'utf8');

    expect(migration).toContain("p_recipe_graph ? 'servings'");
    expect(migration).toContain("!~ '^[1-9][0-9]*$'");
    expect(migration).toContain("servings = nullif(p_recipe_graph ->> 'servings', '')::integer");
    expect(migration).not.toContain("coalesce((p_recipe_graph ->> 'servings')::integer, 0) < 1");
  });
});
