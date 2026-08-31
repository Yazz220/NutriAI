-- Rollback-only proof for moving and permanently removing reader pages.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values
  ('51111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'reader-owner@example.test'),
  ('52222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'reader-other@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '51111111-1111-4111-8111-111111111111', 'Weeknights', 'Proof', 'Proof'),
  ('5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '51111111-1111-4111-8111-111111111111', 'Favorites', 'Proof', 'Proof');

insert into nutriai.recipe_captures (
  id, user_id, destination_cookbook_id, source_type, source_payload, status,
  recipe_graph, pending_page_id, art_status, idempotency_key
) values (
  '5ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '51111111-1111-4111-8111-111111111111',
  '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'url', '{"input":"https://example.com/soup"}'::jsonb, 'ready',
  '{"title":"Tomato Soup"}'::jsonb, null, 'ready', 'reader-management-proof'
);

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
) values (
  '5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  '51111111-1111-4111-8111-111111111111',
  'Tomato Soup', 4, '[]'::jsonb, '[]'::jsonb, 'url', '[]'::jsonb, 'dinner', 1
);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order,
  recipe_graph, lifecycle_status, capture_id
) values (
  '5ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  '5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  1, 'dinner', 0,
  '{"title":"Tomato Soup","servings":4,"ingredientGroups":[],"stepGroups":[]}'::jsonb,
  'approved', '5ddddddd-dddd-4ddd-8ddd-dddddddddddd'
);

update nutriai.recipe_captures
set pending_page_id = '5ccccccc-cccc-4ccc-8ccc-ccccccccccc1'
where id = '5ddddddd-dddd-4ddd-8ddd-dddddddddddd';

select set_config(
  'request.jwt.claims',
  '{"sub":"51111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  result jsonb;
  remaining integer;
begin
  result := nutriai.organize_recipe_page(
    'move',
    '5ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    'reader:move-proof-0001'
  );

  if result ->> 'destinationCookbookId' <> '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' then
    raise exception 'Move returned the wrong destination';
  end if;
  if (
    select destination_cookbook_id
    from nutriai.recipe_captures
    where id = '5ddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ) <> '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' then
    raise exception 'Moved capture did not follow its recipe page';
  end if;

  result := nutriai.remove_recipe_page('5ccccccc-cccc-4ccc-8ccc-ccccccccccc1');
  if result ->> 'cookbookId' <> '5aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' then
    raise exception 'Removal returned the wrong cookbook';
  end if;

  select count(*) into remaining
  from nutriai.cookbook_pages
  where id = '5ccccccc-cccc-4ccc-8ccc-ccccccccccc1';
  if remaining <> 0 then raise exception 'Recipe page was not removed'; end if;

  select count(*) into remaining
  from nutriai.recipe_captures
  where id = '5ddddddd-dddd-4ddd-8ddd-dddddddddddd';
  if remaining <> 0 then raise exception 'Removed page left a broken capture entry'; end if;

  select count(*) into remaining
  from nutriai.recipes
  where id = '5bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1';
  if remaining <> 0 then raise exception 'Removed page left an orphan recipe row'; end if;
end
$proof$;

rollback;
