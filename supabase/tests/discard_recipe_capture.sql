-- Rollback-only proof for unfinished capture removal and Storage cleanup.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values
  ('71111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'capture-owner@example.test'),
  ('72222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'capture-other@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values (
  '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '71111111-1111-4111-8111-111111111111',
  'Unfinished recipes',
  'Proof',
  'Proof'
);

insert into nutriai.recipe_captures (
  id, user_id, destination_cookbook_id, source_type, source_payload,
  source_storage_path, status, recipe_graph, art_status, idempotency_key
) values
  (
    '7ddddddd-dddd-4ddd-8ddd-ddddddddddd1',
    '71111111-1111-4111-8111-111111111111',
    '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'video',
    '{"framePaths":["71111111-1111-4111-8111-111111111111/captures/frame.jpg"],"additionalImagePaths":["71111111-1111-4111-8111-111111111111/captures/extra.jpg"]}'::jsonb,
    '71111111-1111-4111-8111-111111111111/captures/source.mp4',
    'needs_attention',
    '{"title":"Unfinished Soup"}'::jsonb,
    'failed',
    'discard-attention-proof'
  ),
  (
    '7ddddddd-dddd-4ddd-8ddd-ddddddddddd2',
    '71111111-1111-4111-8111-111111111111',
    null,
    'text',
    '{"input":"Recipe without a destination"}'::jsonb,
    null,
    'needs_destination',
    '{"title":"Destination Soup"}'::jsonb,
    'not_started',
    'discard-destination-proof'
  ),
  (
    '7ddddddd-dddd-4ddd-8ddd-ddddddddddd3',
    '71111111-1111-4111-8111-111111111111',
    '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'text',
    '{"input":"Active recipe"}'::jsonb,
    null,
    'processing',
    null,
    'not_started',
    'discard-processing-proof'
  ),
  (
    '7ddddddd-dddd-4ddd-8ddd-ddddddddddd4',
    '72222222-2222-4222-8222-222222222222',
    null,
    'text',
    '{"input":"Other user recipe"}'::jsonb,
    null,
    'needs_attention',
    null,
    'failed',
    'discard-other-proof'
  );

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
) values (
  '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '71111111-1111-4111-8111-111111111111',
  'Unfinished Soup',
  2,
  '[]'::jsonb,
  '[]'::jsonb,
  'video',
  '[]'::jsonb,
  'dinner',
  1
);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order,
  recipe_graph, lifecycle_status, capture_id
) values (
  '7ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  1,
  'dinner',
  0,
  '{"title":"Unfinished Soup","ingredientGroups":[],"stepGroups":[]}'::jsonb,
  'processing',
  '7ddddddd-dddd-4ddd-8ddd-ddddddddddd1'
);

insert into nutriai.page_versions (
  id, page_id, image_url, storage_path, prompt_payload, model, status, credit_cost
) values (
  '7eeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '7ccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'https://example.test/unfinished.png',
  '71111111-1111-4111-8111-111111111111/7aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/unfinished.png',
  '{}'::jsonb,
  'proof',
  'ready',
  0
);

update nutriai.recipe_captures
set pending_page_id = '7ccccccc-cccc-4ccc-8ccc-cccccccccccc'
where id = '7ddddddd-dddd-4ddd-8ddd-ddddddddddd1';

select set_config(
  'request.jwt.claims',
  '{"sub":"71111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
begin
  perform nutriai.discard_recipe_capture('7ddddddd-dddd-4ddd-8ddd-ddddddddddd1');
  perform nutriai.discard_recipe_capture('7ddddddd-dddd-4ddd-8ddd-ddddddddddd2');

  begin
    perform nutriai.discard_recipe_capture('7ddddddd-dddd-4ddd-8ddd-ddddddddddd3');
    raise exception 'Processing capture was removable';
  exception when sqlstate '55000' then
    null;
  end;

  begin
    perform nutriai.discard_recipe_capture('7ddddddd-dddd-4ddd-8ddd-ddddddddddd4');
    raise exception 'Another user capture was removable';
  exception when sqlstate 'P0002' then
    null;
  end;
end
$proof$;

reset role;

do $proof$
declare
  cleanup_count integer;
begin
  if exists (
    select 1 from nutriai.recipe_captures
    where id in (
      '7ddddddd-dddd-4ddd-8ddd-ddddddddddd1',
      '7ddddddd-dddd-4ddd-8ddd-ddddddddddd2'
    )
  ) then
    raise exception 'Discarded captures remained in the database';
  end if;

  if not exists (
    select 1 from nutriai.recipe_captures
    where id = '7ddddddd-dddd-4ddd-8ddd-ddddddddddd3'
  ) then
    raise exception 'Active capture was deleted';
  end if;

  if not exists (
    select 1 from nutriai.recipe_captures
    where id = '7ddddddd-dddd-4ddd-8ddd-ddddddddddd4'
  ) then
    raise exception 'Another user capture was deleted';
  end if;

  if exists (
    select 1 from nutriai.cookbook_pages
    where id = '7ccccccc-cccc-4ccc-8ccc-cccccccccccc'
  ) then
    raise exception 'Unfinished page remained after capture removal';
  end if;

  if exists (
    select 1 from nutriai.recipes
    where id = '7bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  ) then
    raise exception 'Orphan recipe remained after capture removal';
  end if;

  select count(*) into cleanup_count
  from nutriai.storage_cleanup_jobs
  where user_id = '71111111-1111-4111-8111-111111111111';

  if cleanup_count <> 4 then
    raise exception 'Expected four cleanup jobs, found %', cleanup_count;
  end if;
end
$proof$;

rollback;
