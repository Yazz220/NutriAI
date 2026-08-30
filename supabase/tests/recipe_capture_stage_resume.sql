-- Rollback-only proof for versioned recipe-capture checkpoints and publication retry.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values (
  '55555555-5555-4555-8555-555555555555',
  'authenticated',
  'authenticated',
  'capture-stage-owner@example.test'
);

insert into nutriai.cookbooks (
  id, user_id, title, theme_name, theme_prompt, cover_style,
  page_style_id, page_template_id
) values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  '55555555-5555-4555-8555-555555555555',
  'Stage Book', 'Stage proof', 'Stage proof', 'handwritten',
  'illustrated', 'clean-cream'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated"}',
  true
);
set local role authenticated;

select nutriai.begin_recipe_capture(
  'text',
  '{"input":"Checkpoint soup recipe"}'::jsonb,
  null,
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'capture-stage-proof-0001'
);

reset role;

do $proof$
declare
  capture_id uuid;
  page_id uuid;
  capture nutriai.recipe_captures;
  claim jsonb;
  graph jsonb := '{
    "title":"Checkpoint Soup","servings":2,"category":"dinner",
    "ingredientGroups":[{"id":"main","ingredients":[{"name":"tomato","quantity":"2"}]}],
    "stepGroups":[{"id":"main","steps":[{"id":"step-1","text":"Simmer for 10 minutes."}]}],
    "tags":[],"provenance":{"sourceType":"text","confidence":0.9}
  }'::jsonb;
begin
  select id into capture_id
  from nutriai.recipe_captures
  where idempotency_key = 'capture-stage-proof-0001';

  select nutriai.claim_recipe_capture(
    '55555555-5555-4555-8555-555555555555', capture_id
  ) into claim;
  if claim ->> 'claimed' <> 'true' then
    raise exception 'Stage proof capture was not claimed';
  end if;

  perform nutriai.record_recipe_capture_checkpoint(
    '55555555-5555-4555-8555-555555555555', capture_id,
    'source', 'text-source-v1', '{"sourceType":"text"}'::jsonb
  );
  perform nutriai.record_recipe_capture_checkpoint(
    '55555555-5555-4555-8555-555555555555', capture_id,
    'normalization', 'recipe-graph-normalization-v1', '{}'::jsonb
  );
  perform nutriai.record_recipe_capture_checkpoint(
    '55555555-5555-4555-8555-555555555555', capture_id,
    'quality', 'recipe-quality-v1', '{"decision":"auto_publish"}'::jsonb
  );

  update nutriai.recipe_captures
  set recipe_graph = graph, confidence = 0.9
  where id = capture_id;

  select nutriai.create_capture_page(
    '55555555-5555-4555-8555-555555555555', capture_id, graph,
    'illustrated', 1, 'clean-cream'
  ) into page_id;

  perform nutriai.fail_recipe_capture_publication(
    '55555555-5555-4555-8555-555555555555', page_id,
    'Publication proof failure', 'complete-recipe-page-v1'
  );

  select * into capture from nutriai.recipe_captures where id = capture_id;
  if capture.status <> 'needs_attention'
    or capture.failed_stage <> 'publication'
    or capture.art_status <> 'ready'
    or capture.stage_checkpoints #>> '{page_generation,version}' <> 'complete-recipe-page-v1' then
    raise exception 'Publication failure discarded the ready page checkpoint';
  end if;

  select nutriai.claim_recipe_capture(
    '55555555-5555-4555-8555-555555555555', capture_id
  ) into claim;
  perform nutriai.finalize_recipe_capture_page(
    '55555555-5555-4555-8555-555555555555', page_id,
    'complete-recipe-page-v1', 'recipe-capture-publication-v1'
  );

  select * into capture from nutriai.recipe_captures where id = capture_id;
  if capture.status <> 'ready'
    or capture.failed_stage is not null
    or capture.stage_checkpoints #>> '{publication,version}' <> 'recipe-capture-publication-v1' then
    raise exception 'Publication retry did not resume from the ready page';
  end if;
  if (select lifecycle_status from nutriai.cookbook_pages where id = page_id) <> 'approved' then
    raise exception 'Publication retry did not approve the existing page';
  end if;
end
$proof$;

rollback;
