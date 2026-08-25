-- Rollback-only proof that a corrected recipe graph and its generated page
-- candidate are selected together by the authenticated page owner.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values ('71111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'revision-owner@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values (
  '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '71111111-1111-4111-8111-111111111111',
  'Revision Proof', 'Proof', 'Proof'
);

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
) values (
  '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '71111111-1111-4111-8111-111111111111',
  'Old Soup', 2, '[]'::jsonb, '[]'::jsonb, 'text', '[]'::jsonb, 'dinner', 1
);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order, recipe_graph, lifecycle_status
) values (
  '7ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  1, 'dinner', 0,
  '{"id":"old","title":"Old Soup","servings":2,"category":"dinner","ingredientGroups":[],"stepGroups":[],"tags":[]}'::jsonb,
  'approved'
);

insert into nutriai.page_versions (
  id, page_id, prompt_payload, model, status, credit_cost
) values (
  '7ddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '7ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '{"proof":"recipe-revision"}'::jsonb, 'proof-model', 'ready', 0
);

select set_config(
  'request.jwt.claims',
  '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  corrected_graph jsonb := '{
    "id":"corrected",
    "title":"Tomato Soup",
    "description":"Bright and simple",
    "servings":4,
    "prepTimeMinutes":10,
    "cookTimeMinutes":25,
    "category":"lunch",
    "ingredientGroups":[{"id":"main","ingredients":[{"name":"tomato","quantity":"4"}]}],
    "stepGroups":[{"id":"main","steps":[{"id":"step-1","text":"Simmer the tomatoes."}]}],
    "tags":["quick"],
    "provenance":{"sourceType":"text","confidence":1},
    "createdAt":"2026-08-25T00:00:00.000Z",
    "updatedAt":"2026-08-25T01:00:00.000Z"
  }'::jsonb;
begin
  if not nutriai.apply_recipe_page_revision(
    '7ccccccc-cccc-4ccc-8ccc-cccccccccccc',
    corrected_graph,
    '7ddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ) then
    raise exception 'Recipe revision returned false';
  end if;

  if not exists (
    select 1
    from nutriai.cookbook_pages
    where id = '7ccccccc-cccc-4ccc-8ccc-cccccccccccc'
      and selected_version_id = '7ddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and recipe_graph = corrected_graph
      and section = 'lunch'
  ) then
    raise exception 'Page graph and candidate were not applied together';
  end if;

  if not exists (
    select 1
    from nutriai.recipes
    where id = '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      and title = 'Tomato Soup'
      and servings = 4
      and ingredients = '[{"name":"tomato","quantity":"4"}]'::jsonb
      and steps = '["Simmer the tomatoes."]'::jsonb
  ) then
    raise exception 'Compatibility recipe row was not synchronized';
  end if;
end
$proof$;

rollback;
