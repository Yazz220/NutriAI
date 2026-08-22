import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('Phase 7 interaction contract', () => {
  const server = fs.readFileSync(path.join(
    root,
    'supabase/functions/nosh-chat/index.ts',
  ), 'utf8');
  const adapter = fs.readFileSync(path.join(
    root,
    'utils/cookbook/noshChatAdapter.ts',
  ), 'utf8');
  const toolkit = fs.readFileSync(path.join(
    root,
    'utils/cookbook/noshToolkit.tsx',
  ), 'utf8');

  it('keeps recipe mutations behind human confirmation tools', () => {
    expect(toolkit).toMatch(/scale_servings:\s*{\s*type: 'human'/);
    expect(toolkit).toMatch(/substitute_ingredient:\s*{\s*type: 'human'/);
    expect(toolkit).toMatch(/update_page_data:\s*{\s*type: 'human'/);
    expect(server).toContain('Do not choose for the user.');
  });

  it('starts walkthrough mode only after an explicit user request', () => {
    expect(server).toContain('Start only when the user explicitly asks for a walkthrough');
    expect(server).toContain('Normal cooking help is open conversation.');
    expect(adapter).toContain("'set_walkthrough'");
  });

  it('refreshes saved page images while keeping visual-only revision explicit', () => {
    expect(server).toContain('Saved recipe-data edits create their own refreshed page');
    expect(toolkit).toContain('regenerate_recipe_page');
  });
});
