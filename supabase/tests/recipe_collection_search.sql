-- Rollback-only proof for collection ranking and user isolation.

begin;
set local statement_timeout = '5s';

insert into auth.users (id, aud, role, email)
values
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'recipe-search-owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'recipe-search-other@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Desserts',
    'Search proof',
    'Search proof'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
    '11111111-1111-4111-8111-111111111111',
    'Large collection',
    'Scale proof',
    'Scale proof'
  );

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
)
values
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '11111111-1111-4111-8111-111111111111',
    'Baked Cheesecake',
    8,
    '[]'::jsonb,
    '[]'::jsonb,
    'text',
    '[]'::jsonb,
    'desserts',
    1
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    '11111111-1111-4111-8111-111111111111',
    'No-Bake Cheesecake',
    6,
    '[]'::jsonb,
    '[]'::jsonb,
    'text',
    '[]'::jsonb,
    'desserts',
    1
  );

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order, recipe_graph, updated_at
)
values
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    1,
    'desserts',
    0,
    '{
      "title":"Baked Cheesecake","description":"A classic oven-baked cheesecake",
      "servings":8,"category":"desserts","cuisine":"American",
      "ingredientGroups":[{"id":"filling","ingredients":[{"name":"cream cheese"},{"name":"eggs"}]}],
      "stepGroups":[{"id":"bake","steps":[{"id":"step-1","text":"Bake until the center is just set."}]}],
      "tags":["baked"],"dietaryTags":[]
    }'::jsonb,
    '2026-08-01T00:00:00Z'::timestamptz
  ),
  (
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
    2,
    'desserts',
    1,
    '{
      "title":"No-Bake Cheesecake","description":"A chilled cheesecake",
      "servings":6,"category":"desserts","cuisine":"British",
      "ingredientGroups":[{"id":"filling","ingredients":[{"name":"cream cheese"},{"name":"whipping cream"}]}],
      "stepGroups":[{"id":"chill","steps":[{"id":"step-1","text":"Chill until firm."}]}],
      "tags":["no bake"],"dietaryTags":[]
    }'::jsonb,
    '2026-08-20T00:00:00Z'::timestamptz
  );

create temporary table large_collection_fixture (
  ordinal integer primary key,
  recipe_id uuid not null,
  page_id uuid not null
) on commit drop;

insert into large_collection_fixture (ordinal, recipe_id, page_id)
select ordinal, gen_random_uuid(), gen_random_uuid()
from generate_series(1, 200) as ordinal;

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
)
select
  recipe_id,
  '11111111-1111-4111-8111-111111111111',
  'Large Fixture Recipe ' || ordinal,
  4,
  '[]'::jsonb,
  '[]'::jsonb,
  'text',
  '[]'::jsonb,
  'dinner',
  1
from large_collection_fixture;

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order, recipe_graph
)
select
  page_id,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
  recipe_id,
  ordinal,
  'dinner',
  ordinal - 1,
  jsonb_build_object(
    'title', 'Large Fixture Recipe ' || ordinal,
    'ingredientGroups', '[]'::jsonb,
    'stepGroups', '[]'::jsonb,
    'tags', '[]'::jsonb,
    'dietaryTags', '[]'::jsonb
  )
from large_collection_fixture;

select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  first_page uuid;
  match_count integer;
begin
  select page_id into first_page
  from nutriai.search_recipe_collection('baked cheesecake', null, false, 5)
  limit 1;

  if first_page <> 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid then
    raise exception 'Exact baked cheesecake match did not rank first';
  end if;

  select count(*) into match_count
  from nutriai.search_recipe_collection('cheese cake', null, false, 5);

  if match_count <> 2 then
    raise exception 'Voice-spaced cheesecake query returned % matches, expected 2', match_count;
  end if;

  select count(*) into match_count
  from nutriai.search_recipe_collection('cream cheese', null, false, 5);
  if match_count <> 2 then
    raise exception 'Ingredient search returned % matches, expected 2', match_count;
  end if;

  select count(*) into match_count
  from nutriai.search_recipe_collection('Desserts', null, false, 5);
  if match_count <> 2 then
    raise exception 'Cookbook-title search returned % matches, expected 2', match_count;
  end if;

  select page_id into first_page
  from nutriai.search_recipe_collection('baked', null, false, 5)
  limit 1;
  if first_page <> 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid then
    raise exception 'Tag search did not resolve the baked recipe';
  end if;

  select page_id into first_page
  from nutriai.search_recipe_collection('cheesecake', null, true, 5)
  limit 1;
  if first_page <> 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid then
    raise exception 'Recent-first search did not rank the latest matching recipe first';
  end if;

  select count(*) into match_count
  from nutriai.search_recipe_collection('large fixture recipe', null, false, 500);
  if match_count <> 5 then
    raise exception 'Large collection search returned % candidates, expected the five-candidate cap', match_count;
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
    true
  );

  select count(*) into match_count
  from nutriai.search_recipe_collection('cheesecake', null, false, 5);

  if match_count <> 0 then
    raise exception 'Collection search exposed another user''s recipes';
  end if;

  select count(*) into match_count
  from nutriai.cookbook_pages
  where id = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid;

  if match_count <> 0 then
    raise exception 'Direct page selection exposed another user''s recipe';
  end if;
end
$proof$;

rollback;
