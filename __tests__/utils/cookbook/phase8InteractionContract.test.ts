import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('Phase 8 collection organization contract', () => {
  const migration = fs.readFileSync(path.join(
    root,
    'supabase/migrations/20260825172026_collection_organization_actions.sql',
  ), 'utf8');
  const toolkit = fs.readFileSync(path.join(root, 'utils/cookbook/noshToolkit.tsx'), 'utf8');
  const card = fs.readFileSync(path.join(
    root,
    'components/nosh/collection/CollectionActionCard.tsx',
  ), 'utf8');
  const host = fs.readFileSync(path.join(root, 'components/cookbook/NoshAssistantChat.tsx'), 'utf8');

  it('keeps move and copy behind a human confirmation card', () => {
    expect(toolkit).toMatch(/organize_recipe:\s*{\s*type: 'human'/);
    expect(card).toContain('`Confirm ${action}`');
    expect(card).toContain("onResult({ cancelled: true })");
  });

  it('uses authenticated ownership checks and one idempotency record per request', () => {
    expect(migration).toContain('caller_id uuid := (select auth.uid())');
    expect(migration).toContain('unique (user_id, idempotency_key)');
    expect(migration).toContain('cookbook.user_id = caller_id');
    expect(migration).toContain('cookbook.user_id = caller_id');
  });

  it('refreshes query state and both device caches before opening the result', () => {
    expect(host).toContain('saveCachedShelf(user.id, shelf)');
    expect(host).toContain('saveCachedPages(cookbookId, pageLists[index])');
    expect(host).toContain('router.replace(`/(book)/${destination.id}?pageId=${resultPage.id}`)');
  });
});
