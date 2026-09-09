-- Rollback-only proof for Nosh Free/Plus access, cookbook capacity, provider
-- idempotency, and exactly-once designed-page accounting.

begin;
set local statement_timeout = '10s';

do $proof$
declare
  service_function regprocedure;
  all_rls_enabled boolean;
  recipe_source_constraint text;
  capture_source_constraint text;
begin
  foreach service_function in array array[
    'nutriai.record_revenuecat_webhook_event(text,text,text,jsonb)'::regprocedure,
    'nutriai.complete_revenuecat_webhook_event(text,text,text)'::regprocedure,
    'nutriai.sync_subscription_from_provider(uuid,text,text,text,text,text,text,timestamptz,timestamptz,boolean,text,timestamptz,jsonb)'::regprocedure,
    'nutriai.deactivate_subscription_from_provider(uuid,text,text,text,timestamptz,jsonb)'::regprocedure,
    'nutriai.reserve_designed_page_generation(uuid,uuid,uuid,text)'::regprocedure,
    'nutriai.settle_designed_page_generation(uuid,uuid,uuid,jsonb,boolean,numeric)'::regprocedure,
    'nutriai.release_designed_page_generation(uuid,uuid,text,text)'::regprocedure
  ] loop
    if has_function_privilege('authenticated', service_function, 'EXECUTE')
      or has_function_privilege('anon', service_function, 'EXECUTE') then
      raise exception 'Provider or metering RPC is client-callable: %', service_function;
    end if;
    if not has_function_privilege('service_role', service_function, 'EXECUTE') then
      raise exception 'Service role cannot execute required RPC: %', service_function;
    end if;
  end loop;

  if not has_function_privilege(
      'authenticated', 'nutriai.get_subscription_access()'::regprocedure, 'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'nutriai.create_cookbook_for_current_user(text,text,text,text,text,text,text,text,text,integer,jsonb,text,jsonb)'::regprocedure,
      'EXECUTE'
    )
    or has_function_privilege(
      'anon', 'nutriai.get_subscription_access()'::regprocedure, 'EXECUTE'
    ) then
    raise exception 'Authenticated subscription RPC grants are incorrect';
  end if;

  if has_table_privilege('authenticated', 'nutriai.user_entitlements', 'SELECT')
    or has_table_privilege('authenticated', 'nutriai.subscription_webhook_events', 'SELECT')
    or has_table_privilege('authenticated', 'nutriai.usage_periods', 'SELECT')
    or has_table_privilege('authenticated', 'nutriai.usage_reservations', 'SELECT')
    or not has_table_privilege('authenticated', 'nutriai.subscription_plans', 'SELECT') then
    raise exception 'Subscription table grants are incorrect';
  end if;

  select bool_and(class.relrowsecurity)
    into all_rls_enabled
  from pg_catalog.pg_class as class
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'nutriai'
    and class.relname in (
      'subscription_plans', 'subscription_plan_features', 'subscription_products',
      'user_entitlements', 'subscription_webhook_events', 'usage_periods',
      'usage_reservations'
    );
  if all_rls_enabled is not true then
    raise exception 'A subscription foundation table is missing RLS';
  end if;

  select pg_get_constraintdef(constraint_row.oid)
    into recipe_source_constraint
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = 'nutriai.recipes'::regclass
    and constraint_row.conname = 'recipes_source_type_check';
  select pg_get_constraintdef(constraint_row.oid)
    into capture_source_constraint
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.conrelid = 'nutriai.recipe_captures'::regclass
    and constraint_row.conname = 'recipe_captures_source_type_check';
  if recipe_source_constraint not like '%manual%'
    or capture_source_constraint like '%manual%' then
    raise exception 'Manual provenance compatibility changed the wrong source contract';
  end if;
end
$proof$;

insert into auth.users (id, aud, role, email)
values
  ('71717171-7171-4717-8171-717171717171', 'authenticated', 'authenticated', 'subscription-free@example.test'),
  ('72727272-7272-4727-8272-727272727272', 'authenticated', 'authenticated', 'subscription-plus@example.test'),
  ('73737373-7373-4737-8373-737373737373', 'authenticated', 'authenticated', 'subscription-transition@example.test');

insert into nutriai.cookbooks (
  id, user_id, title, theme_name, theme_prompt, cover_style,
  cover_finish_id, cover_color_id, page_style_id, style_revision,
  page_template_id
)
values
  ('a1717171-7171-4717-8171-717171717171', '71717171-7171-4717-8171-717171717171',
    'Free Book One', 'Studio', 'Studio', 'handwritten', 'fine-cloth', 'sage', 'studio', 1, 'clean-cream'),
  ('a1717171-7171-4717-8171-717171717172', '71717171-7171-4717-8171-717171717171',
    'Free Book Two', 'Studio', 'Studio', 'handwritten', 'fine-cloth', 'sage', 'studio', 1, 'clean-cream'),
  ('a2727272-7272-4727-8272-727272727271', '72727272-7272-4727-8272-727272727272',
    'Plus Book One', 'Studio', 'Studio', 'handwritten', 'fine-cloth', 'sage', 'studio', 1, 'clean-cream'),
  ('a2727272-7272-4727-8272-727272727272', '72727272-7272-4727-8272-727272727272',
    'Plus Book Two', 'Studio', 'Studio', 'handwritten', 'fine-cloth', 'sage', 'studio', 1, 'clean-cream'),
  ('a3737373-7373-4737-8373-737373737373', '73737373-7373-4737-8373-737373737373',
    'Transition Book', 'Studio', 'Studio', 'handwritten', 'fine-cloth', 'sage', 'studio', 1, 'clean-cream');

insert into nutriai.recipes (
  id, user_id, title, ingredients, steps, source_type, category
)
values
  ('b1717171-7171-4717-8171-717171717171', '71717171-7171-4717-8171-717171717171',
    'Free proof recipe', '[]'::jsonb, '[]'::jsonb, 'text', 'dinner'),
  ('b2727272-7272-4727-8272-727272727272', '72727272-7272-4727-8272-727272727272',
    'Plus proof recipe', '[]'::jsonb, '[]'::jsonb, 'text', 'dinner'),
  ('b3737373-7373-4737-8373-737373737373', '73737373-7373-4737-8373-737373737373',
    'Transition proof recipe', '[]'::jsonb, '[]'::jsonb, 'text', 'dinner');

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order,
  recipe_graph, style_id, style_revision, template_id, lifecycle_status
)
values
  ('c1717171-7171-4717-8171-717171717171', 'a1717171-7171-4717-8171-717171717171',
    'b1717171-7171-4717-8171-717171717171', 1, 'dinner', 1,
    '{"title":"Free proof recipe","servings":2}'::jsonb, 'studio', 1, 'clean-cream', 'approved'),
  ('c2727272-7272-4727-8272-727272727272', 'a2727272-7272-4727-8272-727272727271',
    'b2727272-7272-4727-8272-727272727272', 1, 'dinner', 1,
    '{"title":"Plus proof recipe","servings":2}'::jsonb, 'studio', 1, 'clean-cream', 'approved'),
  ('c3737373-7373-4737-8373-737373737373', 'a3737373-7373-4737-8373-737373737373',
    'b3737373-7373-4737-8373-737373737373', 1, 'dinner', 1,
    '{"title":"Transition proof recipe","servings":2}'::jsonb, 'studio', 1, 'clean-cream', 'approved');

-- Existing generated content is grandfathered and does not backfill usage.
insert into nutriai.page_versions (
  id, page_id, prompt_payload, model, status, credit_cost
)
values (
  'd1717171-7171-4717-8171-717171717170',
  'c1717171-7171-4717-8171-717171717171',
  '{}'::jsonb, 'proof-model', 'ready', 0
);

do $proof$
declare
  first_claim boolean;
  duplicate_claim boolean;
  retry_claim boolean;
  stale_claim boolean;
  completed boolean;
  attempt_count integer;
  stale_attempt_count integer;
  entitlement jsonb;
begin
  first_claim := nutriai.record_revenuecat_webhook_event(
    'subscription-proof-event-1', 'INITIAL_PURCHASE', 'sandbox', '{"proof":true}'::jsonb
  );
  duplicate_claim := nutriai.record_revenuecat_webhook_event(
    'subscription-proof-event-1', 'INITIAL_PURCHASE', 'sandbox', '{"proof":true}'::jsonb
  );
  completed := nutriai.complete_revenuecat_webhook_event(
    'subscription-proof-event-1', 'failed', 'temporary proof failure'
  );
  retry_claim := nutriai.record_revenuecat_webhook_event(
    'subscription-proof-event-1', 'INITIAL_PURCHASE', 'sandbox', '{"proof":true}'::jsonb
  );
  perform nutriai.complete_revenuecat_webhook_event(
    'subscription-proof-event-1', 'processed', null
  );

  select event.attempt_count into attempt_count
  from nutriai.subscription_webhook_events as event
  where event.event_id = 'subscription-proof-event-1';

  if first_claim is not true or duplicate_claim is not false
    or completed is not true or retry_claim is not true or attempt_count <> 2 then
    raise exception 'RevenueCat event claim/retry was not idempotent';
  end if;

  insert into nutriai.subscription_webhook_events (
    event_id, event_type, environment, payload_digest, status, attempt_count,
    received_at, updated_at
  ) values (
    'subscription-proof-event-stale', 'RENEWAL', 'sandbox',
    jsonb_build_object(
      'sha256',
      encode(
        extensions.digest('{"proof": "stale-processing"}'::jsonb::text, 'sha256'),
        'hex'
      )
    ),
    'processing', 1,
    now() - interval '11 minutes', now() - interval '11 minutes'
  );
  stale_claim := nutriai.record_revenuecat_webhook_event(
    'subscription-proof-event-stale', 'RENEWAL', 'sandbox',
    '{"proof":"stale-processing"}'::jsonb
  );
  select event.attempt_count into stale_attempt_count
  from nutriai.subscription_webhook_events as event
  where event.event_id = 'subscription-proof-event-stale';
  perform nutriai.complete_revenuecat_webhook_event(
    'subscription-proof-event-stale', 'processed', null
  );
  if stale_claim is not true or stale_attempt_count <> 2 then
    raise exception 'Stale processing webhook claim was not reclaimed';
  end if;

  if nutriai.record_revenuecat_webhook_event(
    'subscription-proof-event-unknown-environment', 'TRANSFER', 'unknown',
    '{"proof":"missing-environment"}'::jsonb
  ) is not true then
    raise exception 'Webhook without an environment was not accepted for reconciliation';
  end if;
  perform nutriai.complete_revenuecat_webhook_event(
    'subscription-proof-event-unknown-environment', 'processed', null
  );

  if exists (
    select 1
    from nutriai.subscription_webhook_events as event
    where event.payload_digest <> jsonb_build_object(
        'sha256', event.payload_digest ->> 'sha256'
      )
      or not (event.payload_digest ? 'sha256')
      or char_length(event.payload_digest ->> 'sha256') <> 64
      or event.payload_digest::text like '%stale-processing%'
      or event.payload_digest::text like '%missing-environment%'
  ) then
    raise exception 'RevenueCat webhook log retained raw payload data';
  end if;

  entitlement := nutriai.sync_subscription_from_provider(
    '72727272-7272-4727-8272-727272727272',
    '72727272-7272-4727-8272-727272727272',
    'nosh_plus',
    'com.yaz12.nosh.plus.monthly',
    'sandbox',
    'active',
    'monthly',
    now() - interval '1 day',
    now() + interval '29 days',
    true,
    'app_store',
    now(),
    '{"proof":true}'::jsonb
  );
  if entitlement ->> 'planId' <> 'plus' then
    raise exception 'Active provider entitlement did not resolve Nosh Plus';
  end if;

  entitlement := nutriai.deactivate_subscription_from_provider(
    '72727272-7272-4727-8272-727272727272',
    'nosh_plus',
    '72727272-7272-4727-8272-727272727272',
    'sandbox',
    now() - interval '1 hour',
    '{"proof":"stale"}'::jsonb
  );
  if entitlement ->> 'reason' <> 'stale_snapshot'
    or nutriai.effective_subscription_plan_id(
      '72727272-7272-4727-8272-727272727272', now()
    ) <> 'plus' then
    raise exception 'An older deactivation overrode the current entitlement';
  end if;
end
$proof$;

select set_config(
  'request.jwt.claims',
  '{"sub":"71717171-7171-4717-8171-717171717171","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  access jsonb;
begin
  access := nutriai.get_subscription_access();
  if access ->> 'planId' <> 'free'
    or access #>> '{features,cookbooks,limit}' <> '2'
    or access #>> '{features,designedPages,used}' <> '0' then
    raise exception 'Free subscription snapshot is incorrect: %', access;
  end if;

  begin
    perform nutriai.create_cookbook_for_current_user(
      'Blocked third book', 'Studio', 'Studio', 'handwritten',
      'fine-cloth', 'sage', 'gilt', 'lower', 'studio', 1, '[]'::jsonb,
      'clean-cream', '[]'::jsonb
    );
    raise exception 'Free user created a third cookbook';
  exception when sqlstate 'P0001' then
    if sqlerrm <> 'cookbook_limit_reached' then
      raise;
    end if;
  end;

  if has_table_privilege('authenticated', 'nutriai.cookbooks', 'INSERT') then
    raise exception 'Authenticated users can bypass guarded cookbook creation';
  end if;
end
$proof$;

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"72727272-7272-4727-8272-727272727272","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  created nutriai.cookbooks;
  access jsonb;
begin
  select * into created from nutriai.create_cookbook_for_current_user(
    'Allowed Plus book', 'Studio', 'Studio', 'handwritten',
    'fine-cloth', 'sage', 'gilt', 'lower', 'studio', 1, '[]'::jsonb,
    'clean-cream', '[]'::jsonb
  );
  if created.user_id <> '72727272-7272-4727-8272-727272727272' then
    raise exception 'Guarded cookbook creation did not bind the caller';
  end if;
  if created.cover_title_color_id <> 'gilt'
    or created.cover_title_placement_id <> 'lower' then
    raise exception 'Guarded cookbook creation lost the cover typography identity';
  end if;

  access := nutriai.get_subscription_access();
  if access ->> 'planId' <> 'plus'
    or access #> '{features,cookbooks,limit}' <> 'null'::jsonb
    or access #>> '{features,designedPages,limit}' <> '20' then
    raise exception 'Plus subscription snapshot is incorrect: %', access;
  end if;
end
$proof$;

reset role;

do $proof$
declare
  request_state jsonb;
  reservation jsonb;
  request_id uuid;
  version_id uuid;
  index integer;
  used_count integer;
  outstanding_count integer;
begin
  for index in 1..5 loop
    request_state := nutriai.begin_generation_request(
      '71717171-7171-4717-8171-717171717171',
      'a1717171-7171-4717-8171-717171717171',
      'subscription-free-page-' || lpad(index::text, 4, '0'),
      jsonb_build_object('proof', index)
    );
    request_id := (request_state ->> 'id')::uuid;
    update nutriai.generation_requests
    set page_id = 'c1717171-7171-4717-8171-717171717171'
    where id = request_id;

    reservation := nutriai.reserve_designed_page_generation(
      '71717171-7171-4717-8171-717171717171', request_id,
      'c1717171-7171-4717-8171-717171717171', 'regeneration'
    );
    if (reservation ->> 'allowed')::boolean is not true then
      raise exception 'Free designed page % was denied early', index;
    end if;

    insert into nutriai.page_versions (
      page_id, prompt_payload, model, status, credit_cost
    ) values (
      'c1717171-7171-4717-8171-717171717171',
      jsonb_build_object('proof', index), 'proof-model', 'ready', 0
    ) returning id into version_id;

    perform nutriai.settle_designed_page_generation(
      '71717171-7171-4717-8171-717171717171', request_id, version_id,
      jsonb_build_object('pageImage', jsonb_build_object('id', version_id)),
      false, 0.075
    );
    -- A terminal replay must not consume a second page.
    perform nutriai.settle_designed_page_generation(
      '71717171-7171-4717-8171-717171717171', request_id, version_id,
      jsonb_build_object('pageImage', jsonb_build_object('id', version_id)),
      false, 0.075
    );
  end loop;

  request_state := nutriai.begin_generation_request(
    '71717171-7171-4717-8171-717171717171',
    'a1717171-7171-4717-8171-717171717171',
    'subscription-free-page-0006',
    '{"proof":6}'::jsonb
  );
  request_id := (request_state ->> 'id')::uuid;
  update nutriai.generation_requests
  set page_id = 'c1717171-7171-4717-8171-717171717171'
  where id = request_id;
  reservation := nutriai.reserve_designed_page_generation(
    '71717171-7171-4717-8171-717171717171', request_id,
    'c1717171-7171-4717-8171-717171717171', 'regeneration'
  );
  if (reservation ->> 'allowed')::boolean is not false
    or reservation ->> 'reason' <> 'designed_page_limit_reached' then
    raise exception 'Sixth lifetime Free page was not denied: %', reservation;
  end if;

  select period.consumed_count, period.reserved_count into used_count, outstanding_count
  from nutriai.usage_periods as period
  where period.user_id = '71717171-7171-4717-8171-717171717171'
    and period.meter_key = 'designed_pages'
    and period.period_end is null;
  if used_count <> 5 or outstanding_count <> 0 then
    raise exception 'Free page usage was not settled exactly once';
  end if;

  insert into nutriai.recipes (
    id, user_id, title, ingredients, steps, source_type, category
  ) values (
    'b1717171-7171-4717-8171-717171717179',
    '71717171-7171-4717-8171-717171717171',
    'Denied copy recipe', '[]'::jsonb, '[]'::jsonb, 'manual', 'dinner'
  );
  insert into nutriai.cookbook_pages (
    id, cookbook_id, recipe_id, page_number, section, sort_order,
    recipe_graph, style_id, style_revision, template_id, lifecycle_status
  ) values (
    'c1717171-7171-4717-8171-717171717179',
    'a1717171-7171-4717-8171-717171717171',
    'b1717171-7171-4717-8171-717171717179', 2, 'dinner', 2,
    '{"title":"Denied copy recipe","servings":2}'::jsonb,
    'studio', 1, 'clean-cream', 'processing'
  );
  request_state := nutriai.begin_generation_request(
    '71717171-7171-4717-8171-717171717171',
    'a1717171-7171-4717-8171-717171717171',
    'subscription-free-initial-denied',
    '{"proof":"initial-denied"}'::jsonb
  );
  request_id := (request_state ->> 'id')::uuid;
  update nutriai.generation_requests
  set page_id = 'c1717171-7171-4717-8171-717171717179',
      recipe_id = 'b1717171-7171-4717-8171-717171717179'
  where id = request_id;
  reservation := nutriai.reserve_designed_page_generation(
    '71717171-7171-4717-8171-717171717171', request_id,
    'c1717171-7171-4717-8171-717171717179', 'initial'
  );
  if (reservation ->> 'allowed')::boolean is not false
    or exists (
      select 1 from nutriai.cookbook_pages
      where id = 'c1717171-7171-4717-8171-717171717179'
    )
    or exists (
      select 1 from nutriai.recipes
      where id = 'b1717171-7171-4717-8171-717171717179'
    ) then
    raise exception 'Denied initial generation left an unpublished page shell';
  end if;
end
$proof$;

-- Free is five successful post-launch designs across the account lifetime,
-- including successful work settled during a Plus subscription.
do $proof$
declare
  request_state jsonb;
  reservation jsonb;
  access jsonb;
  request_id uuid;
  plus_request_id uuid;
  version_id uuid;
  index integer;
  lifetime_used integer;
  lifetime_reserved integer;
begin
  -- Two successful pages while Free.
  for index in 1..2 loop
    request_state := nutriai.begin_generation_request(
      '73737373-7373-4737-8373-737373737373',
      'a3737373-7373-4737-8373-737373737373',
      'subscription-transition-free-' || lpad(index::text, 4, '0'),
      jsonb_build_object('phase', 'free', 'proof', index)
    );
    request_id := (request_state ->> 'id')::uuid;
    update nutriai.generation_requests
    set page_id = 'c3737373-7373-4737-8373-737373737373'
    where id = request_id;
    reservation := nutriai.reserve_designed_page_generation(
      '73737373-7373-4737-8373-737373737373', request_id,
      'c3737373-7373-4737-8373-737373737373', 'revision'
    );
    if reservation ->> 'planId' <> 'free'
      or (reservation ->> 'allowed')::boolean is not true then
      raise exception 'Transition proof Free reservation failed: %', reservation;
    end if;
    insert into nutriai.page_versions (
      page_id, prompt_payload, model, status, credit_cost
    ) values (
      'c3737373-7373-4737-8373-737373737373',
      jsonb_build_object('phase', 'free', 'proof', index),
      'proof-model', 'ready', 0
    ) returning id into version_id;
    perform nutriai.settle_designed_page_generation(
      '73737373-7373-4737-8373-737373737373', request_id, version_id,
      jsonb_build_object('pageImage', jsonb_build_object('id', version_id)),
      false, 0.075
    );
  end loop;

  perform nutriai.sync_subscription_from_provider(
    '73737373-7373-4737-8373-737373737373',
    '73737373-7373-4737-8373-737373737373',
    'nosh_plus', 'com.yaz12.nosh.plus.monthly', 'sandbox', 'active', 'monthly',
    now() - interval '1 day', now() + interval '29 days', true, 'app_store',
    now(), '{"proof":"transition-upgrade"}'::jsonb
  );

  -- Two more successful pages while Plus reach four account-lifetime pages.
  for index in 3..4 loop
    request_state := nutriai.begin_generation_request(
      '73737373-7373-4737-8373-737373737373',
      'a3737373-7373-4737-8373-737373737373',
      'subscription-transition-plus-' || lpad(index::text, 4, '0'),
      jsonb_build_object('phase', 'plus', 'proof', index)
    );
    request_id := (request_state ->> 'id')::uuid;
    update nutriai.generation_requests
    set page_id = 'c3737373-7373-4737-8373-737373737373'
    where id = request_id;
    reservation := nutriai.reserve_designed_page_generation(
      '73737373-7373-4737-8373-737373737373', request_id,
      'c3737373-7373-4737-8373-737373737373', 'revision'
    );
    if reservation ->> 'planId' <> 'plus'
      or (reservation ->> 'allowed')::boolean is not true then
      raise exception 'Transition proof Plus reservation failed: %', reservation;
    end if;
    insert into nutriai.page_versions (
      page_id, prompt_payload, model, status, credit_cost
    ) values (
      'c3737373-7373-4737-8373-737373737373',
      jsonb_build_object('phase', 'plus', 'proof', index),
      'proof-model', 'ready', 0
    ) returning id into version_id;
    perform nutriai.settle_designed_page_generation(
      '73737373-7373-4737-8373-737373737373', request_id, version_id,
      jsonb_build_object('pageImage', jsonb_build_object('id', version_id)),
      false, 0.075
    );
  end loop;

  -- Reserve the fifth page while Plus, then downgrade before it settles. The
  -- Free view must count that active reservation so it cannot open a sixth
  -- account-lifetime slot during the transition.
  request_state := nutriai.begin_generation_request(
    '73737373-7373-4737-8373-737373737373',
    'a3737373-7373-4737-8373-737373737373',
    'subscription-transition-plus-in-flight',
    '{"phase":"plus","proof":5}'::jsonb
  );
  plus_request_id := (request_state ->> 'id')::uuid;
  update nutriai.generation_requests
  set page_id = 'c3737373-7373-4737-8373-737373737373'
  where id = plus_request_id;
  reservation := nutriai.reserve_designed_page_generation(
    '73737373-7373-4737-8373-737373737373', plus_request_id,
    'c3737373-7373-4737-8373-737373737373', 'revision'
  );
  if reservation ->> 'planId' <> 'plus'
    or (reservation ->> 'allowed')::boolean is not true then
    raise exception 'Transition proof in-flight Plus reservation failed: %', reservation;
  end if;

  perform nutriai.deactivate_subscription_from_provider(
    '73737373-7373-4737-8373-737373737373', 'nosh_plus',
    '73737373-7373-4737-8373-737373737373', 'sandbox',
    now() + interval '1 second', '{"proof":"transition-downgrade"}'::jsonb
  );
  if nutriai.effective_subscription_plan_id(
    '73737373-7373-4737-8373-737373737373', now()
  ) <> 'free' then
    raise exception 'Transition proof did not downgrade to Free';
  end if;

  perform set_config(
    'request.jwt.claims',
    '{"sub":"73737373-7373-4737-8373-737373737373","role":"authenticated"}',
    true
  );
  access := nutriai.get_subscription_access();
  if access #>> '{features,designedPages,used}' <> '4'
    or access #>> '{features,designedPages,reserved}' <> '1'
    or access #>> '{features,designedPages,remaining}' <> '0' then
    raise exception 'Downgrade ignored an in-flight Plus reservation: %', access;
  end if;

  request_state := nutriai.begin_generation_request(
    '73737373-7373-4737-8373-737373737373',
    'a3737373-7373-4737-8373-737373737373',
    'subscription-transition-free-denied-in-flight',
    '{"phase":"downgraded","proof":"in-flight"}'::jsonb
  );
  request_id := (request_state ->> 'id')::uuid;
  update nutriai.generation_requests
  set page_id = 'c3737373-7373-4737-8373-737373737373'
  where id = request_id;
  reservation := nutriai.reserve_designed_page_generation(
    '73737373-7373-4737-8373-737373737373', request_id,
    'c3737373-7373-4737-8373-737373737373', 'revision'
  );
  if (reservation ->> 'allowed')::boolean is not false
    or reservation ->> 'reason' <> 'designed_page_limit_reached'
    or reservation ->> 'used' <> '4'
    or reservation ->> 'reserved' <> '1' then
    raise exception 'Downgrade opened capacity around an in-flight Plus page: %', reservation;
  end if;

  insert into nutriai.page_versions (
    page_id, prompt_payload, model, status, credit_cost
  ) values (
    'c3737373-7373-4737-8373-737373737373',
    '{"phase":"plus","proof":5}'::jsonb,
    'proof-model', 'ready', 0
  ) returning id into version_id;
  perform nutriai.settle_designed_page_generation(
    '73737373-7373-4737-8373-737373737373', plus_request_id, version_id,
    jsonb_build_object('pageImage', jsonb_build_object('id', version_id)),
    false, 0.075
  );

  access := nutriai.get_subscription_access();
  if access #>> '{features,designedPages,used}' <> '5'
    or access #>> '{features,designedPages,reserved}' <> '0'
    or access #>> '{features,designedPages,remaining}' <> '0' then
    raise exception 'Settled in-flight Plus page did not advance Free lifetime use: %', access;
  end if;

  -- Cookbook deletion removes generation requests and reservation detail, but
  -- successful lifetime consumption must remain on the account-owned period.
  delete from nutriai.cookbooks
  where id = 'a3737373-7373-4737-8373-737373737373';
  if exists (
    select 1 from nutriai.usage_reservations
    where user_id = '73737373-7373-4737-8373-737373737373'
  ) then
    raise exception 'Transition cookbook deletion left request usage details';
  end if;
  select period.consumed_count, period.reserved_count
    into lifetime_used, lifetime_reserved
  from nutriai.usage_periods as period
  where period.user_id = '73737373-7373-4737-8373-737373737373'
    and period.meter_key = 'designed_pages'
    and period.period_end is null;
  if lifetime_used <> 5 or lifetime_reserved <> 0 then
    raise exception 'Cookbook deletion restored lifetime Free capacity';
  end if;

  insert into nutriai.cookbooks (
    id, user_id, title, theme_name, theme_prompt, cover_style,
    cover_finish_id, cover_color_id, page_style_id, style_revision,
    page_template_id
  ) values (
    'a3737373-7373-4737-8373-737373737374',
    '73737373-7373-4737-8373-737373737373',
    'Replacement transition book', 'Studio', 'Studio', 'handwritten',
    'fine-cloth', 'sage', 'studio', 1, 'clean-cream'
  );
  insert into nutriai.recipes (
    id, user_id, title, ingredients, steps, source_type, category
  ) values (
    'b3737373-7373-4737-8373-737373737374',
    '73737373-7373-4737-8373-737373737373',
    'Replacement transition recipe', '[]'::jsonb, '[]'::jsonb, 'text', 'dinner'
  );
  insert into nutriai.cookbook_pages (
    id, cookbook_id, recipe_id, page_number, section, sort_order,
    recipe_graph, style_id, style_revision, template_id, lifecycle_status
  ) values (
    'c3737373-7373-4737-8373-737373737374',
    'a3737373-7373-4737-8373-737373737374',
    'b3737373-7373-4737-8373-737373737374', 1, 'dinner', 1,
    '{"title":"Replacement transition recipe","servings":2}'::jsonb,
    'studio', 1, 'clean-cream', 'approved'
  );

  perform set_config(
    'request.jwt.claims',
    '{"sub":"73737373-7373-4737-8373-737373737373","role":"authenticated"}',
    true
  );
  access := nutriai.get_subscription_access();
  if access #>> '{features,designedPages,used}' <> '5'
    or access #>> '{features,designedPages,remaining}' <> '0' then
    raise exception 'Downgraded Free snapshot granted fresh capacity: %', access;
  end if;

  request_state := nutriai.begin_generation_request(
    '73737373-7373-4737-8373-737373737373',
    'a3737373-7373-4737-8373-737373737374',
    'subscription-transition-free-denied',
    '{"phase":"downgraded","proof":6}'::jsonb
  );
  request_id := (request_state ->> 'id')::uuid;
  update nutriai.generation_requests
  set page_id = 'c3737373-7373-4737-8373-737373737374'
  where id = request_id;
  reservation := nutriai.reserve_designed_page_generation(
    '73737373-7373-4737-8373-737373737373', request_id,
    'c3737373-7373-4737-8373-737373737374', 'revision'
  );
  if (reservation ->> 'allowed')::boolean is not false
    or reservation ->> 'reason' <> 'designed_page_limit_reached'
    or reservation ->> 'used' <> '5' then
    raise exception 'Downgraded account received fresh Free pages: %', reservation;
  end if;
end
$proof$;

do $proof$
declare
  request_state jsonb;
  first_reservation jsonb;
  duplicate_reservation jsonb;
  request_id uuid;
  first_release boolean;
  duplicate_release boolean;
  usage_count integer;
begin
  request_state := nutriai.begin_generation_request(
    '72727272-7272-4727-8272-727272727272',
    'a2727272-7272-4727-8272-727272727271',
    'subscription-plus-release-0001',
    '{"proof":"release"}'::jsonb
  );
  request_id := (request_state ->> 'id')::uuid;
  update nutriai.generation_requests
  set page_id = 'c2727272-7272-4727-8272-727272727272'
  where id = request_id;

  first_reservation := nutriai.reserve_designed_page_generation(
    '72727272-7272-4727-8272-727272727272', request_id,
    'c2727272-7272-4727-8272-727272727272', 'revision'
  );
  duplicate_reservation := nutriai.reserve_designed_page_generation(
    '72727272-7272-4727-8272-727272727272', request_id,
    'c2727272-7272-4727-8272-727272727272', 'revision'
  );
  if first_reservation ->> 'reservationId' <> duplicate_reservation ->> 'reservationId' then
    raise exception 'Duplicate request created two page reservations';
  end if;

  first_release := nutriai.release_designed_page_generation(
    '72727272-7272-4727-8272-727272727272', request_id,
    'Provider proof failure', 'provider_failed'
  );
  duplicate_release := nutriai.release_designed_page_generation(
    '72727272-7272-4727-8272-727272727272', request_id,
    'Provider proof failure', 'provider_failed'
  );
  if first_release is not true or duplicate_release is not false then
    raise exception 'Page reservation release was not idempotent';
  end if;

  select reserved_count + consumed_count into usage_count
  from nutriai.usage_periods
  where user_id = '72727272-7272-4727-8272-727272727272'
    and meter_key = 'designed_pages'
    and period_end is not null;
  if usage_count <> 0 then
    raise exception 'Failed Plus generation consumed page capacity';
  end if;
end
$proof$;

-- Multiple cascade paths (user -> period/reservation and user -> generation)
-- must not block account deletion.
delete from auth.users where id = '72727272-7272-4727-8272-727272727272';
do $proof$
begin
  if exists (
    select 1 from nutriai.usage_reservations
    where user_id = '72727272-7272-4727-8272-727272727272'
  ) then
    raise exception 'Account deletion left subscription usage reservations behind';
  end if;
end
$proof$;

rollback;
