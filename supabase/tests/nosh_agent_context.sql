-- Rollback-only proof for Nosh collection browsing, preferences, and private traces.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'nosh-agent-owner@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'nosh-agent-other@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '33333333-3333-4333-8333-333333333333', 'Weeknights', 'Agent proof', 'Agent proof');

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
) values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '33333333-3333-4333-8333-333333333333',
  'Tomato Lentil Soup',
  4,
  '[]'::jsonb,
  '[]'::jsonb,
  'text',
  '[]'::jsonb,
  'soup',
  1
);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order, recipe_graph
) values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  1,
  'dinner',
  0,
  '{
    "title":"Tomato Lentil Soup","category":"soup","cuisine":"Mediterranean",
    "servings":4,"prepTimeMinutes":10,"cookTimeMinutes":20,
    "ingredientGroups":[{"id":"main","ingredients":[{"name":"tomatoes"},{"name":"red lentils"}]}],
    "stepGroups":[{"id":"cook","steps":[{"id":"step-1","text":"Simmer until tender."}]}],
    "tags":["weeknight"],"dietaryTags":["vegan"]
  }'::jsonb
);

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

insert into nutriai.cooking_preferences (user_id, preference_key, value)
values ('33333333-3333-4333-8333-333333333333', 'dietary_restriction', 'vegan');

do $proof$
declare
  match_count integer;
begin
  select count(*) into match_count
  from nutriai.browse_recipe_collection(
    ingredients_any => array['lentils'],
    tag_filters => array['vegan'],
    max_total_minutes => 30
  );
  if match_count <> 1 then
    raise exception 'Filtered collection browse returned % rows, expected 1', match_count;
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
    true
  );

  select count(*) into match_count from nutriai.browse_recipe_collection();
  if match_count <> 0 then
    raise exception 'Collection browse exposed another user''s recipes';
  end if;

  select count(*) into match_count from nutriai.cooking_preferences;
  if match_count <> 0 then
    raise exception 'Cooking preferences exposed another user''s values';
  end if;
end
$proof$;

reset role;

do $privileges$
begin
  if has_table_privilege('authenticated', 'nutriai.nosh_agent_runs', 'select,insert,update,delete') then
    raise exception 'Authenticated clients can access private Nosh traces';
  end if;
  if not has_table_privilege('service_role', 'nutriai.nosh_agent_runs', 'select,insert,update,delete') then
    raise exception 'Service role cannot manage Nosh traces';
  end if;
end
$privileges$;

rollback;
