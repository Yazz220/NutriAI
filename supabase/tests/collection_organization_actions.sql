-- Rollback-only proof for confirmed, idempotent, user-owned collection changes.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values
  ('31111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'collection-owner@example.test'),
  ('32222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'collection-other@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values
  ('3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '31111111-1111-4111-8111-111111111111', 'Desserts', 'Proof', 'Proof'),
  ('3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '31111111-1111-4111-8111-111111111111', 'Favorites', 'Proof', 'Proof'),
  ('3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', '32222222-2222-4222-8222-222222222222', 'Private', 'Proof', 'Proof');

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
) values (
  '3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '31111111-1111-4111-8111-111111111111',
  'Cheesecake', 8, '[]'::jsonb, '[]'::jsonb, 'text', '[]'::jsonb, 'desserts', 1
);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order, recipe_graph, lifecycle_status
) values (
  '3ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '3bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  1, 'desserts', 0,
  '{"title":"Cheesecake","servings":8,"ingredientGroups":[],"stepGroups":[]}'::jsonb,
  'approved'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"31111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  first_result jsonb;
  replay_result jsonb;
  copy_result jsonb;
  copy_replay jsonb;
  page_count integer;
  request_count integer;
begin
  first_result := nutriai.organize_recipe_page(
    'move',
    '3ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'collection:proof-move'
  );
  replay_result := nutriai.organize_recipe_page(
    'move',
    '3ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'collection:proof-move'
  );
  if first_result <> replay_result then
    raise exception 'Move retry returned a different result';
  end if;

  select count(*) into page_count
  from nutriai.cookbook_pages
  where id = '3ccccccc-cccc-4ccc-8ccc-ccccccccccc1'
    and cookbook_id = '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
  if page_count <> 1 then
    raise exception 'Move did not leave exactly one page in the destination';
  end if;

  copy_result := nutriai.organize_recipe_page(
    'copy',
    '3ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'collection:proof-copy'
  );
  copy_replay := nutriai.organize_recipe_page(
    'copy',
    '3ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    'collection:proof-copy'
  );
  if copy_result <> copy_replay then
    raise exception 'Copy retry returned a different result';
  end if;

  select count(*) into page_count
  from nutriai.cookbook_pages
  where cookbook_id = '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
  if page_count <> 1 then
    raise exception 'Copy retry created % destination pages, expected 1', page_count;
  end if;

  select count(*) into request_count
  from nutriai.collection_mutation_requests
  where user_id = '31111111-1111-4111-8111-111111111111';
  if request_count <> 2 then
    raise exception 'Expected one idempotency record per confirmed action';
  end if;

  begin
    perform nutriai.organize_recipe_page(
      'move',
      '3ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      '3aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      'collection:proof-cross-user'
    );
    raise exception 'Cross-user destination was accepted';
  exception
    when no_data_found then null;
  end;
end
$proof$;

rollback;
