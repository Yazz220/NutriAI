-- Rollback-only proof for reader deletion cleanup jobs and shared page assets.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values ('61111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'storage-owner@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '61111111-1111-4111-8111-111111111111', 'Source', 'Proof', 'Proof'),
  ('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '61111111-1111-4111-8111-111111111111', 'Copy', 'Proof', 'Proof');

insert into nutriai.recipe_captures (
  id, user_id, destination_cookbook_id, source_type, source_payload,
  source_storage_path, status, recipe_graph, art_status, idempotency_key
) values (
  '6ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '61111111-1111-4111-8111-111111111111',
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'image', '{}'::jsonb,
  '61111111-1111-4111-8111-111111111111/captures/source.jpg',
  'ready', '{"title":"Shared Toast"}'::jsonb, 'ready', 'reader-storage-proof'
);

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
) values (
  '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '61111111-1111-4111-8111-111111111111',
  'Shared Toast', 1, '[]'::jsonb, '[]'::jsonb, 'image', '[]'::jsonb, 'breakfast', 1
);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order,
  recipe_graph, lifecycle_status, capture_id
) values (
  '6ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '6bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  1, 'breakfast', 0,
  '{"title":"Shared Toast","servings":1,"ingredientGroups":[],"stepGroups":[]}'::jsonb,
  'approved', '6ddddddd-dddd-4ddd-8ddd-dddddddddddd'
);

insert into nutriai.page_versions (
  id, page_id, image_url, storage_path, prompt_payload, model, status, credit_cost
) values (
  '6eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '6ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  'https://example.test/page.png',
  '61111111-1111-4111-8111-111111111111/6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/page.png',
  '{}'::jsonb, 'proof', 'ready', 0
);

update nutriai.cookbook_pages
set selected_version_id = '6eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
where id = '6ccccccc-cccc-4ccc-8ccc-ccccccccccc1';

update nutriai.recipe_captures
set pending_page_id = '6ccccccc-cccc-4ccc-8ccc-ccccccccccc1'
where id = '6ddddddd-dddd-4ddd-8ddd-dddddddddddd';

select set_config(
  'request.jwt.claims',
  '{"sub":"61111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  copy_result jsonb;
begin
  if has_table_privilege('authenticated', 'nutriai.cookbooks', 'delete') then
    raise exception 'Authenticated can bypass cookbook cleanup RPC';
  end if;
  if has_table_privilege('authenticated', 'nutriai.cookbook_pages', 'delete') then
    raise exception 'Authenticated can bypass recipe cleanup RPC';
  end if;

  copy_result := nutriai.organize_recipe_page(
    'copy',
    '6ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'reader:storage-copy-proof'
  );

  perform nutriai.remove_recipe_page('6ccccccc-cccc-4ccc-8ccc-ccccccccccc1');
end
$proof$;

reset role;

do $proof$
begin
  if exists (
    select 1 from nutriai.storage_cleanup_jobs
    where bucket = 'cookbook-pages'
      and object_path = '61111111-1111-4111-8111-111111111111/6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/page.png'
  ) then
    raise exception 'Shared page art was queued while a copied page still referenced it';
  end if;
end
$proof$;

set local role authenticated;

do $proof$
declare
  delete_result jsonb;
begin
  delete_result := nutriai.delete_cookbook('6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2');
  if delete_result ->> 'pageCount' <> '1' then
    raise exception 'Cookbook deletion returned the wrong page count';
  end if;
end
$proof$;

reset role;

do $proof$
declare
  remaining integer;
begin
  select count(*) into remaining
  from nutriai.storage_cleanup_jobs
  where user_id = '61111111-1111-4111-8111-111111111111';
  if remaining <> 2 then
    raise exception 'Expected two cleanup jobs, found %', remaining;
  end if;

  if not exists (
    select 1 from nutriai.storage_cleanup_jobs
    where bucket = 'recipe-captures'
      and object_path = '61111111-1111-4111-8111-111111111111/captures/source.jpg'
  ) then
    raise exception 'Capture source was not queued';
  end if;

  if not exists (
    select 1 from nutriai.storage_cleanup_jobs
    where bucket = 'cookbook-pages'
      and object_path = '61111111-1111-4111-8111-111111111111/6aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1/page.png'
  ) then
    raise exception 'Last page-art reference was not queued';
  end if;

  select count(*) into remaining
  from nutriai.recipes
  where user_id = '61111111-1111-4111-8111-111111111111';
  if remaining <> 0 then
    raise exception 'Cookbook deletion left orphan recipe rows';
  end if;
end
$proof$;

rollback;
