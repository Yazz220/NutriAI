-- Rollback-only proof for the single capture -> complete page -> cookbook pipeline.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values
  ('33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'capture-owner@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'authenticated', 'authenticated', 'capture-destination@example.test');

insert into nutriai.cookbooks (
  id, user_id, title, theme_name, theme_prompt, cover_style, page_template_id
) values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  '33333333-3333-4333-8333-333333333333',
  'Capture Book', 'Capture proof', 'Capture proof', 'handwritten', 'clean-cream'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  first_capture nutriai.recipe_captures;
  duplicate_capture nutriai.recipe_captures;
  visible_count integer;
begin
  -- The sole/default cookbook is resolved without showing a picker.
  select * into first_capture from nutriai.begin_recipe_capture(
    'url', '{"input":"https://example.com/recipe"}'::jsonb, null,
    null, 'capture-proof-key-0001'
  );
  select * into duplicate_capture from nutriai.begin_recipe_capture(
    'url', '{"input":"https://example.com/recipe"}'::jsonb, null,
    null, 'capture-proof-key-0001'
  );
  if first_capture.id <> duplicate_capture.id then
    raise exception 'Duplicate capture request created two rows';
  end if;
  if first_capture.destination_cookbook_id <> 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' then
    raise exception 'Default cookbook was not resolved automatically';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
    true
  );
  select count(*) into visible_count
  from nutriai.recipe_captures where id = first_capture.id;
  if visible_count <> 0 then
    raise exception 'RLS exposed another user''s capture';
  end if;
end
$proof$;

reset role;

do $proof$
declare
  capture_id uuid;
  first_page uuid;
  duplicate_page uuid;
  claim jsonb;
  completed nutriai.recipe_captures;
  graph jsonb := '{
    "title":"Capture Soup","servings":2,"category":"dinner",
    "ingredientGroups":[{"id":"main","ingredients":[{"name":"tomato"}]}],
    "stepGroups":[{"id":"main","steps":[{"id":"step-1","text":"Simmer."}]}],
    "tags":[],"provenance":{"sourceType":"url","confidence":0.9}
  }'::jsonb;
begin
  select id into capture_id from nutriai.recipe_captures
  where user_id = '33333333-3333-4333-8333-333333333333'
    and idempotency_key = 'capture-proof-key-0001';

  select nutriai.claim_recipe_capture(
    '33333333-3333-4333-8333-333333333333', capture_id
  ) into claim;
  if claim ->> 'claimed' <> 'true' then
    raise exception 'Saved capture was not claimed';
  end if;

  select nutriai.claim_recipe_capture(
    '33333333-3333-4333-8333-333333333333', capture_id
  ) into claim;
  if claim ->> 'claimed' <> 'false' then
    raise exception 'Active capture was claimed twice';
  end if;

  select nutriai.create_capture_page(
    '33333333-3333-4333-8333-333333333333', capture_id, graph,
    'handwritten', 1, 'clean-cream'
  ) into first_page;
  select nutriai.create_capture_page(
    '33333333-3333-4333-8333-333333333333', capture_id, graph,
    'handwritten', 1, 'clean-cream'
  ) into duplicate_page;
  if first_page <> duplicate_page then
    raise exception 'Capture created duplicate pages';
  end if;
  if (select lifecycle_status from nutriai.cookbook_pages where id = first_page) <> 'processing' then
    raise exception 'Generated page was published before its image was ready';
  end if;

  -- The image worker is allowed to win the race with extraction completion.
  perform nutriai.finalize_recipe_capture_page(
    '33333333-3333-4333-8333-333333333333', first_page
  );
  select * into completed from nutriai.complete_recipe_capture(
    '33333333-3333-4333-8333-333333333333', capture_id, graph, 0.9,
    '[]'::jsonb, '[]'::jsonb, 'ready', null
  );
  if completed.status <> 'ready' or completed.recipe_graph ->> 'title' <> 'Capture Soup' then
    raise exception 'Completion race lost the ready page or extracted graph';
  end if;
  if (select lifecycle_status from nutriai.cookbook_pages where id = first_page) <> 'approved' then
    raise exception 'Finished page did not enter the cookbook';
  end if;

  begin
    update nutriai.recipe_captures set status = 'processing' where id = capture_id;
    raise exception 'A finished capture returned to processing';
  exception when check_violation then null;
  end;
end
$proof$;

select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare match_count integer;
begin
  select count(*) into match_count
  from nutriai.search_recipe_collection('Capture Soup', null, false, 5);
  if match_count <> 1 then
    raise exception 'Completed page did not enter collection search';
  end if;
end
$proof$;

-- A user with no book is the only normal path that pauses for a destination.
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);

do $proof$
declare capture nutriai.recipe_captures;
begin
  select * into capture from nutriai.begin_recipe_capture(
    'text', '{"input":"A handwritten soup recipe"}'::jsonb, null,
    null, 'capture-proof-key-0002'
  );
  if capture.destination_cookbook_id is not null then
    raise exception 'Capture invented a destination for an empty shelf';
  end if;
end
$proof$;

reset role;

do $proof$
declare
  capture_id uuid;
  claim jsonb;
  completed nutriai.recipe_captures;
  graph jsonb := '{
    "title":"Handwritten Soup","servings":4,"category":"dinner",
    "ingredientGroups":[{"id":"main","ingredients":[{"name":"stock"}]}],
    "stepGroups":[{"id":"main","steps":[{"id":"step-1","text":"Simmer."}]}],
    "tags":[],"provenance":{"sourceType":"text","confidence":0.8}
  }'::jsonb;
begin
  select id into capture_id from nutriai.recipe_captures
  where idempotency_key = 'capture-proof-key-0002';
  select nutriai.claim_recipe_capture(
    '44444444-4444-4444-8444-444444444444', capture_id
  ) into claim;
  if claim ->> 'claimed' <> 'true' then
    raise exception 'Destination-less capture was not claimed';
  end if;
  select * into completed from nutriai.complete_recipe_capture(
    '44444444-4444-4444-8444-444444444444', capture_id, graph, 0.8,
    '[]'::jsonb, '[]'::jsonb, 'not_started', null
  );
  if completed.status <> 'needs_destination' then
    raise exception 'Destination-less capture did not pause for the user';
  end if;
end
$proof$;

insert into nutriai.cookbooks (
  id, user_id, title, theme_name, theme_prompt, cover_style, page_template_id
) values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '44444444-4444-4444-8444-444444444444',
  'Chosen Book', 'Chosen proof', 'Chosen proof', 'handwritten', 'clean-cream'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  capture_id uuid;
  prepared nutriai.recipe_captures;
begin
  select id into capture_id from nutriai.recipe_captures
  where idempotency_key = 'capture-proof-key-0002';
  select * into prepared from nutriai.set_recipe_capture_destination(
    capture_id, 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  );
  if prepared.status <> 'processing'
    or prepared.destination_cookbook_id <> 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' then
    raise exception 'Chosen destination did not resume page production';
  end if;
end
$proof$;

reset role;

do $proof$
declare
  capture_id uuid;
  failed nutriai.recipe_captures;
  claim jsonb;
begin
  select id into capture_id from nutriai.recipe_captures
  where idempotency_key = 'capture-proof-key-0002';
  select * into failed from nutriai.fail_recipe_capture(
    '44444444-4444-4444-8444-444444444444', capture_id,
    'page_generation_failed', 'Page proof failure'
  );
  if failed.status <> 'needs_attention' then
    raise exception 'Failed capture did not become actionable';
  end if;
  select nutriai.claim_recipe_capture(
    '44444444-4444-4444-8444-444444444444', capture_id
  ) into claim;
  if claim ->> 'claimed' <> 'true'
    or claim -> 'capture' ->> 'status' <> 'processing' then
    raise exception 'Retry did not resume the failed capture';
  end if;
end
$proof$;

rollback;
