-- Nosh launch subscription foundation.
--
-- This intentionally does not reuse nutriai.credit_ledger. That table remains
-- historical under ADR 0003. Product access is represented by a current
-- provider entitlement, while designed-page capacity is accounted for with
-- explicit periods and idempotent reservations tied to generation_requests.

-- RecipeGraph supports an authored/manual provenance for assistant-created
-- copies. Captures remain limited to actual intake formats; only the durable
-- recipe record needs this compatibility value.
alter table nutriai.recipes
  drop constraint if exists recipes_source_type_check;
alter table nutriai.recipes
  add constraint recipes_source_type_check
    check (source_type in ('url', 'text', 'image', 'video', 'audio', 'manual'));

create table nutriai.subscription_plans (
  id text primary key,
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_id_check
    check (id ~ '^[a-z][a-z0-9_]{1,31}$')
);

create table nutriai.subscription_plan_features (
  plan_id text not null references nutriai.subscription_plans(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  allowance integer,
  reset_period text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (plan_id, feature_key),
  constraint subscription_plan_features_key_check
    check (feature_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint subscription_plan_features_allowance_check
    check (allowance is null or allowance >= 0),
  constraint subscription_plan_features_period_check
    check (reset_period is null or reset_period in ('none', 'lifetime', 'calendar_month')),
  constraint subscription_plan_features_quota_shape_check
    check (
      (allowance is null and reset_period is null)
      or (allowance is not null and reset_period is not null)
    )
);

create table nutriai.subscription_products (
  product_id text primary key,
  plan_id text not null references nutriai.subscription_plans(id),
  entitlement_id text not null,
  store text not null,
  billing_period text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_products_entitlement_check
    check (entitlement_id ~ '^[a-z][a-z0-9_]{1,63}$'),
  constraint subscription_products_store_check
    check (store in ('app_store', 'play_store')),
  constraint subscription_products_period_check
    check (billing_period in ('monthly', 'annual'))
);

create table nutriai.user_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  entitlement_id text not null,
  plan_id text not null references nutriai.subscription_plans(id),
  provider text not null default 'revenuecat',
  provider_customer_id text not null,
  product_id text not null references nutriai.subscription_products(product_id),
  environment text not null,
  status text not null,
  period_type text not null,
  current_period_started_at timestamptz not null,
  current_period_ends_at timestamptz not null,
  will_renew boolean not null default false,
  store text not null,
  provider_updated_at timestamptz not null,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement_id),
  constraint user_entitlements_provider_check
    check (provider = 'revenuecat'),
  constraint user_entitlements_environment_check
    check (environment in ('production', 'sandbox')),
  constraint user_entitlements_status_check
    check (status in (
      'active', 'grace_period', 'billing_retry', 'cancelled',
      'expired', 'revoked', 'paused', 'inactive'
    )),
  constraint user_entitlements_period_check
    check (period_type in ('monthly', 'annual')),
  constraint user_entitlements_store_check
    check (store in ('app_store', 'play_store')),
  constraint user_entitlements_period_bounds_check
    check (current_period_ends_at > current_period_started_at),
  constraint user_entitlements_payload_object_check
    check (jsonb_typeof(provider_payload) = 'object')
);

create unique index user_entitlements_provider_customer_idx
  on nutriai.user_entitlements (provider, provider_customer_id, entitlement_id);

create table nutriai.subscription_webhook_events (
  event_id text primary key,
  provider text not null default 'revenuecat',
  event_type text not null,
  environment text not null,
  payload_digest jsonb not null,
  status text not null default 'processing',
  attempt_count integer not null default 1,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint subscription_webhook_events_id_check
    check (char_length(event_id) between 1 and 200),
  constraint subscription_webhook_events_provider_check
    check (provider = 'revenuecat'),
  constraint subscription_webhook_events_environment_check
    check (environment in ('production', 'sandbox', 'unknown')),
  constraint subscription_webhook_events_status_check
    check (status in ('processing', 'processed', 'ignored', 'failed')),
  constraint subscription_webhook_events_attempt_check
    check (attempt_count > 0),
  constraint subscription_webhook_events_payload_digest_check
    check (
      jsonb_typeof(payload_digest) = 'object'
      and payload_digest ? 'sha256'
      and jsonb_typeof(payload_digest -> 'sha256') = 'string'
      and payload_digest = jsonb_build_object(
        'sha256', payload_digest ->> 'sha256'
      )
      and coalesce((payload_digest ->> 'sha256') ~ '^[0-9a-f]{64}$', false)
    )
);

create index subscription_webhook_events_status_updated_idx
  on nutriai.subscription_webhook_events (status, updated_at desc);

create table nutriai.usage_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meter_key text not null,
  plan_id text not null references nutriai.subscription_plans(id),
  period_start timestamptz not null,
  period_end timestamptz,
  allowance integer not null,
  reserved_count integer not null default 0,
  consumed_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usage_periods_meter_check
    check (meter_key = 'designed_pages'),
  constraint usage_periods_allowance_check
    check (allowance >= 0),
  constraint usage_periods_counts_check
    check (
      reserved_count >= 0
      and consumed_count >= 0
    ),
  constraint usage_periods_bounds_check
    check (period_end is null or period_end > period_start)
);

create unique index usage_periods_lifetime_idx
  on nutriai.usage_periods (user_id, meter_key)
  where period_end is null;

create unique index usage_periods_bounded_idx
  on nutriai.usage_periods (user_id, meter_key, period_start)
  where period_end is not null;

create index usage_periods_user_recent_idx
  on nutriai.usage_periods (user_id, meter_key, period_start desc);

create table nutriai.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_period_id uuid not null references nutriai.usage_periods(id) on delete cascade,
  generation_request_id uuid not null references nutriai.generation_requests(id) on delete cascade,
  operation_kind text not null,
  quantity integer not null default 1,
  state text not null default 'reserved',
  page_id uuid references nutriai.cookbook_pages(id) on delete set null,
  page_version_id uuid references nutriai.page_versions(id) on delete set null,
  provider_cost_usd numeric(12, 6),
  release_reason text,
  reserved_at timestamptz not null default now(),
  settled_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generation_request_id),
  constraint usage_reservations_operation_check
    check (operation_kind in ('capture', 'initial', 'revision', 'regeneration')),
  constraint usage_reservations_quantity_check
    check (quantity = 1),
  constraint usage_reservations_state_check
    check (state in ('reserved', 'settled', 'released')),
  constraint usage_reservations_cost_check
    check (provider_cost_usd is null or provider_cost_usd >= 0),
  constraint usage_reservations_state_timestamps_check
    check (
      (state = 'reserved' and settled_at is null and released_at is null)
      or (state = 'settled' and settled_at is not null and released_at is null)
      or (state = 'released' and settled_at is null and released_at is not null)
    )
);

create index usage_reservations_period_state_idx
  on nutriai.usage_reservations (usage_period_id, state);

create index usage_reservations_user_reserved_idx
  on nutriai.usage_reservations (user_id, reserved_at)
  where state = 'reserved';

alter table nutriai.generation_requests
  add column if not exists failure_code text;

insert into nutriai.subscription_plans (id, display_name)
values
  ('free', 'Nosh Free'),
  ('plus', 'Nosh Plus');

insert into nutriai.subscription_plan_features (
  plan_id, feature_key, enabled, allowance, reset_period
)
values
  ('free', 'cookbooks', true, 2, 'none'),
  ('plus', 'cookbooks', true, null, null),
  ('free', 'designed_pages', true, 5, 'lifetime'),
  ('plus', 'designed_pages', true, 20, 'calendar_month'),
  ('free', 'nosh_chat', true, null, null),
  ('plus', 'nosh_chat', true, null, null),
  ('free', 'capture_url', true, null, null),
  ('plus', 'capture_url', true, null, null),
  ('free', 'capture_text', true, null, null),
  ('plus', 'capture_text', true, null, null),
  ('free', 'capture_image', true, null, null),
  ('plus', 'capture_image', true, null, null),
  ('free', 'capture_video', true, null, null),
  ('plus', 'capture_video', true, null, null),
  ('free', 'capture_audio', true, null, null),
  ('plus', 'capture_audio', true, null, null),
  ('free', 'share_and_export', true, null, null),
  ('plus', 'share_and_export', true, null, null);

insert into nutriai.subscription_products (
  product_id, plan_id, entitlement_id, store, billing_period
)
values
  ('com.yaz12.nosh.plus.monthly', 'plus', 'nosh_plus', 'app_store', 'monthly'),
  ('com.yaz12.nosh.plus.annual', 'plus', 'nosh_plus', 'app_store', 'annual');

create trigger subscription_plans_set_updated_at
  before update on nutriai.subscription_plans
  for each row execute function nutriai.set_updated_at();

create trigger subscription_plan_features_set_updated_at
  before update on nutriai.subscription_plan_features
  for each row execute function nutriai.set_updated_at();

create trigger subscription_products_set_updated_at
  before update on nutriai.subscription_products
  for each row execute function nutriai.set_updated_at();

create trigger user_entitlements_set_updated_at
  before update on nutriai.user_entitlements
  for each row execute function nutriai.set_updated_at();

create trigger subscription_webhook_events_set_updated_at
  before update on nutriai.subscription_webhook_events
  for each row execute function nutriai.set_updated_at();

create trigger usage_periods_set_updated_at
  before update on nutriai.usage_periods
  for each row execute function nutriai.set_updated_at();

create trigger usage_reservations_set_updated_at
  before update on nutriai.usage_reservations
  for each row execute function nutriai.set_updated_at();

create or replace function nutriai.release_deleted_usage_reservation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Settled usage is durable product history and must survive deletion of its
  -- cookbook/request rows. Only an in-flight reservation returns capacity.
  -- During auth-user cascade the parent user no longer exists, so all related
  -- periods are being removed and no aggregate adjustment is necessary.
  if old.state = 'reserved'
    and exists (
      select 1 from auth.users as account where account.id = old.user_id
    ) then
    update nutriai.usage_periods
    set reserved_count = greatest(reserved_count - old.quantity, 0)
    where id = old.usage_period_id;
  end if;

  return old;
end;
$$;

create trigger usage_reservations_release_on_delete
  after delete on nutriai.usage_reservations
  for each row execute function nutriai.release_deleted_usage_reservation();

create or replace function nutriai.effective_subscription_plan_id(
  p_user_id uuid,
  p_at timestamptz default now()
)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select entitlement.plan_id
      from nutriai.user_entitlements as entitlement
      join nutriai.subscription_plans as plan
        on plan.id = entitlement.plan_id
       and plan.is_active
      where entitlement.user_id = p_user_id
        and entitlement.entitlement_id = 'nosh_plus'
        and entitlement.status in ('active', 'grace_period', 'billing_retry', 'cancelled')
        and entitlement.current_period_ends_at > p_at
      order by entitlement.provider_updated_at desc
      limit 1
    ),
    'free'
  );
$$;

create or replace function nutriai.record_revenuecat_webhook_event(
  p_event_id text,
  p_event_type text,
  p_environment text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_event nutriai.subscription_webhook_events;
  incoming_payload_digest jsonb;
begin
  if nullif(btrim(p_event_id), '') is null
    or char_length(p_event_id) > 200
    or nullif(btrim(p_event_type), '') is null
    or p_environment not in ('production', 'sandbox', 'unknown')
    or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Invalid RevenueCat webhook event' using errcode = '22023';
  end if;

  -- Retain only a deterministic fingerprint for replay mismatch detection.
  -- The raw webhook body can contain account and purchase identifiers and is
  -- intentionally processed only in Edge memory.
  incoming_payload_digest := jsonb_build_object(
    'sha256', encode(extensions.digest(p_payload::text, 'sha256'), 'hex')
  );

  perform pg_advisory_xact_lock(
    hashtextextended('revenuecat_event:' || p_event_id, 0)
  );

  select *
    into existing_event
  from nutriai.subscription_webhook_events
  where event_id = p_event_id
  for update;

  if not found then
    insert into nutriai.subscription_webhook_events (
      event_id, event_type, environment, payload_digest
    ) values (
      p_event_id, p_event_type, p_environment, incoming_payload_digest
    );
    return true;
  end if;

  if existing_event.event_type <> p_event_type
    or existing_event.environment <> p_environment
    or existing_event.payload_digest is distinct from incoming_payload_digest then
    raise exception 'RevenueCat event id was reused for a different payload'
      using errcode = '22023';
  end if;

  -- A fresh processing row is an in-flight duplicate. A stale row means the
  -- previous Edge invocation claimed the event but died before completion, so
  -- RevenueCat's retry must be allowed to reclaim it.
  if existing_event.status <> 'failed'
    and not (
      existing_event.status = 'processing'
      and existing_event.updated_at <= now() - interval '10 minutes'
    ) then
    return false;
  end if;

  update nutriai.subscription_webhook_events
  set
    status = 'processing',
    attempt_count = attempt_count + 1,
    error_message = null,
    processed_at = null
  where event_id = p_event_id;

  return true;
end;
$$;

create or replace function nutriai.complete_revenuecat_webhook_event(
  p_event_id text,
  p_status text,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('processed', 'ignored', 'failed') then
    raise exception 'Invalid RevenueCat webhook completion status' using errcode = '22023';
  end if;

  update nutriai.subscription_webhook_events
  set
    status = p_status,
    error_message = case
      when p_status = 'failed' then left(coalesce(p_error, 'Webhook processing failed'), 1000)
      else null
    end,
    processed_at = case when p_status in ('processed', 'ignored') then now() else null end
  where event_id = p_event_id
    and status = 'processing';

  return found;
end;
$$;

create or replace function nutriai.sync_subscription_from_provider(
  p_user_id uuid,
  p_provider_customer_id text,
  p_entitlement_id text,
  p_product_id text,
  p_environment text,
  p_status text,
  p_period_type text,
  p_current_period_started_at timestamptz,
  p_current_period_ends_at timestamptz,
  p_will_renew boolean,
  p_store text,
  p_provider_updated_at timestamptz,
  p_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mapped_product nutriai.subscription_products;
  entitlement nutriai.user_entitlements;
begin
  perform 1 from auth.users where id = p_user_id;
  if not found then
    raise exception 'Subscription user not found' using errcode = 'P0002';
  end if;

  select *
    into mapped_product
  from nutriai.subscription_products
  where product_id = p_product_id
    and entitlement_id = p_entitlement_id
    and store = p_store
    and is_active;

  if not found then
    raise exception 'Subscription product is not configured' using errcode = '22023';
  end if;
  if nullif(btrim(p_provider_customer_id), '') is null
    or p_environment not in ('production', 'sandbox')
    or p_status not in (
      'active', 'grace_period', 'billing_retry', 'cancelled',
      'expired', 'revoked', 'paused', 'inactive'
    )
    or p_period_type <> mapped_product.billing_period
    or p_current_period_started_at is null
    or p_current_period_ends_at <= p_current_period_started_at
    or p_provider_updated_at is null
    or jsonb_typeof(coalesce(p_raw, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid subscription entitlement snapshot' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('subscription:' || p_user_id::text || ':' || p_entitlement_id, 0)
  );

  select *
    into entitlement
  from nutriai.user_entitlements
  where user_id = p_user_id
    and entitlement_id = p_entitlement_id
  for update;

  if found and entitlement.provider_updated_at > p_provider_updated_at then
    return jsonb_build_object(
      'applied', false,
      'reason', 'stale_snapshot',
      'planId', nutriai.effective_subscription_plan_id(p_user_id, now())
    );
  end if;

  insert into nutriai.user_entitlements (
    user_id,
    entitlement_id,
    plan_id,
    provider_customer_id,
    product_id,
    environment,
    status,
    period_type,
    current_period_started_at,
    current_period_ends_at,
    will_renew,
    store,
    provider_updated_at,
    provider_payload
  ) values (
    p_user_id,
    p_entitlement_id,
    mapped_product.plan_id,
    p_provider_customer_id,
    p_product_id,
    p_environment,
    p_status,
    p_period_type,
    p_current_period_started_at,
    p_current_period_ends_at,
    coalesce(p_will_renew, false),
    p_store,
    p_provider_updated_at,
    coalesce(p_raw, '{}'::jsonb)
  )
  on conflict (user_id, entitlement_id) do update
  set
    plan_id = excluded.plan_id,
    provider_customer_id = excluded.provider_customer_id,
    product_id = excluded.product_id,
    environment = excluded.environment,
    status = excluded.status,
    period_type = excluded.period_type,
    current_period_started_at = excluded.current_period_started_at,
    current_period_ends_at = excluded.current_period_ends_at,
    will_renew = excluded.will_renew,
    store = excluded.store,
    provider_updated_at = excluded.provider_updated_at,
    provider_payload = excluded.provider_payload;

  return jsonb_build_object(
    'applied', true,
    'planId', nutriai.effective_subscription_plan_id(p_user_id, now())
  );
end;
$$;

create or replace function nutriai.deactivate_subscription_from_provider(
  p_user_id uuid,
  p_entitlement_id text,
  p_provider_customer_id text,
  p_environment text,
  p_provider_updated_at timestamptz,
  p_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entitlement nutriai.user_entitlements;
begin
  if p_entitlement_id <> 'nosh_plus'
    or nullif(btrim(p_provider_customer_id), '') is null
    or p_environment not in ('production', 'sandbox')
    or p_provider_updated_at is null
    or jsonb_typeof(coalesce(p_raw, '{}'::jsonb)) <> 'object' then
    raise exception 'Invalid subscription deactivation snapshot' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('subscription:' || p_user_id::text || ':' || p_entitlement_id, 0)
  );

  select *
    into entitlement
  from nutriai.user_entitlements
  where user_id = p_user_id
    and entitlement_id = p_entitlement_id
  for update;

  if not found then
    return jsonb_build_object(
      'applied', false,
      'reason', 'already_absent',
      'planId', 'free'
    );
  end if;
  if entitlement.provider_updated_at > p_provider_updated_at then
    return jsonb_build_object(
      'applied', false,
      'reason', 'stale_snapshot',
      'planId', nutriai.effective_subscription_plan_id(p_user_id, now())
    );
  end if;

  update nutriai.user_entitlements
  set
    provider_customer_id = p_provider_customer_id,
    environment = p_environment,
    status = 'inactive',
    will_renew = false,
    provider_updated_at = p_provider_updated_at,
    provider_payload = coalesce(p_raw, '{}'::jsonb)
  where user_id = p_user_id
    and entitlement_id = p_entitlement_id;

  return jsonb_build_object('applied', true, 'planId', 'free');
end;
$$;

create or replace function nutriai.release_stale_designed_page_reservations(
  p_user_id uuid,
  p_before timestamptz default now() - interval '15 minutes'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  stale_reservation record;
  released_count integer := 0;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('designed_pages:' || p_user_id::text, 0)
  );

  for stale_reservation in
    select reservation.id, reservation.usage_period_id, reservation.quantity,
      reservation.generation_request_id
    from nutriai.usage_reservations as reservation
    where reservation.user_id = p_user_id
      and reservation.state = 'reserved'
      and reservation.reserved_at < p_before
    order by reservation.reserved_at
    for update
  loop
    update nutriai.usage_periods
    set reserved_count = reserved_count - stale_reservation.quantity
    where id = stale_reservation.usage_period_id;

    update nutriai.usage_reservations
    set
      state = 'released',
      release_reason = 'reservation_expired',
      released_at = now()
    where id = stale_reservation.id;

    update nutriai.generation_requests
    set
      status = 'failed',
      failure_code = 'generation_expired',
      error_message = 'Generation expired before completion'
    where id = stale_reservation.generation_request_id
      and status = 'processing';

    released_count := released_count + 1;
  end loop;

  return released_count;
end;
$$;

create or replace function nutriai.reserve_designed_page_generation(
  p_user_id uuid,
  p_generation_request_id uuid,
  p_page_id uuid,
  p_operation_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation_request nutriai.generation_requests;
  existing_reservation nutriai.usage_reservations;
  usage_period nutriai.usage_periods;
  unpublished_page nutriai.cookbook_pages;
  unpublished_recipe_id uuid;
  effective_plan text;
  allowance integer;
  target_period_start timestamptz;
  target_period_end timestamptz;
  reservation_id uuid;
  reserved_for_access integer := 0;
begin
  if p_operation_kind not in ('capture', 'initial', 'revision', 'regeneration') then
    raise exception 'Invalid designed-page operation' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('designed_pages:' || p_user_id::text, 0)
  );

  select request.*
    into generation_request
  from nutriai.generation_requests as request
  join nutriai.cookbook_pages as page on page.id = p_page_id
  join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
  where request.id = p_generation_request_id
    and request.user_id = p_user_id
    and request.page_id = p_page_id
    and cookbook.id = request.cookbook_id
    and cookbook.user_id = p_user_id
  for update of request;

  if not found then
    raise exception 'Generation request not found' using errcode = 'P0002';
  end if;

  select *
    into existing_reservation
  from nutriai.usage_reservations
  where generation_request_id = p_generation_request_id
  for update;

  if found then
    select * into usage_period
    from nutriai.usage_periods
    where id = existing_reservation.usage_period_id;

    return jsonb_build_object(
      'allowed', existing_reservation.state in ('reserved', 'settled'),
      'status', existing_reservation.state,
      'reservationId', existing_reservation.id,
      'planId', usage_period.plan_id,
      'allowance', usage_period.allowance,
      'used', usage_period.consumed_count,
      'reserved', usage_period.reserved_count,
      'remaining', greatest(
        usage_period.allowance - usage_period.consumed_count - usage_period.reserved_count,
        0
      ),
      'periodEnd', usage_period.period_end
    );
  end if;

  if generation_request.status <> 'processing' then
    raise exception 'Generation request is not processing' using errcode = '55000';
  end if;

  perform nutriai.release_stale_designed_page_reservations(p_user_id);

  effective_plan := nutriai.effective_subscription_plan_id(p_user_id, now());

  select feature.allowance
    into allowance
  from nutriai.subscription_plan_features as feature
  where feature.plan_id = effective_plan
    and feature.feature_key = 'designed_pages'
    and feature.enabled;

  if allowance is null then
    raise exception 'Designed-page allowance is not configured' using errcode = '55000';
  end if;

  if effective_plan = 'plus' then
    target_period_start := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
    target_period_end := target_period_start + interval '1 month';
  else
    target_period_start := '1970-01-01 00:00:00+00'::timestamptz;
    target_period_end := null;
  end if;

  if target_period_end is null then
    select *
      into usage_period
    from nutriai.usage_periods
    where user_id = p_user_id
      and meter_key = 'designed_pages'
      and period_end is null
    for update;
  else
    select *
      into usage_period
    from nutriai.usage_periods
    where user_id = p_user_id
      and meter_key = 'designed_pages'
      and period_start = target_period_start
      and period_end = target_period_end
    for update;
  end if;

  if not found then
    insert into nutriai.usage_periods (
      user_id, meter_key, plan_id, period_start, period_end, allowance
    ) values (
      p_user_id, 'designed_pages', effective_plan, target_period_start, target_period_end, allowance
    )
    returning * into usage_period;
  end if;

  -- A user can lose Plus while a Plus generation is still in flight. Free
  -- access must count every active reservation on the account, not only
  -- reservations attached to the lifetime period, or the downgrade could
  -- temporarily open an extra Free slot.
  if effective_plan = 'free' then
    select coalesce(sum(active_reservation.quantity), 0)::integer
      into reserved_for_access
    from nutriai.usage_reservations as active_reservation
    where active_reservation.user_id = p_user_id
      and active_reservation.state = 'reserved';
  else
    reserved_for_access := usage_period.reserved_count;
  end if;

  if usage_period.consumed_count + reserved_for_access >= usage_period.allowance then
    update nutriai.generation_requests
    set
      status = 'failed',
      failure_code = 'designed_page_limit_reached',
      error_message = 'designed_page_limit_reached'
    where id = p_generation_request_id;

    -- Copy-as-new creates an unpublished page immediately before requesting
    -- its first design. If the authoritative quota check loses a race with a
    -- stale client snapshot, remove that invisible shell instead of leaving a
    -- permanent processing page. The per-user advisory lock prevents another
    -- reservation from appearing while these safety checks and deletes run.
    if p_operation_kind = 'initial' then
      select page.*
        into unpublished_page
      from nutriai.cookbook_pages as page
      join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
      where page.id = p_page_id
        and cookbook.user_id = p_user_id
      for update of page;

      if found
        and unpublished_page.capture_id is null
        and unpublished_page.selected_version_id is null
        and unpublished_page.lifecycle_status = 'processing'
        and not exists (
          select 1
          from nutriai.usage_reservations as page_reservation
          where page_reservation.page_id = p_page_id
            and page_reservation.state in ('reserved', 'settled')
        ) then
        unpublished_recipe_id := unpublished_page.recipe_id;

        delete from nutriai.cookbook_pages
        where id = p_page_id;

        delete from nutriai.recipes as recipe
        where recipe.id = unpublished_recipe_id
          and recipe.user_id = p_user_id
          and not exists (
            select 1
            from nutriai.cookbook_pages as remaining_page
            where remaining_page.recipe_id = recipe.id
          );
      end if;
    end if;

    return jsonb_build_object(
      'allowed', false,
      'status', 'limit_reached',
      'reason', 'designed_page_limit_reached',
      'planId', usage_period.plan_id,
      'allowance', usage_period.allowance,
      'used', usage_period.consumed_count,
      'reserved', reserved_for_access,
      'remaining', 0,
      'periodEnd', usage_period.period_end
    );
  end if;

  insert into nutriai.usage_reservations (
    user_id,
    usage_period_id,
    generation_request_id,
    operation_kind,
    page_id
  ) values (
    p_user_id,
    usage_period.id,
    p_generation_request_id,
    p_operation_kind,
    p_page_id
  )
  returning id into reservation_id;

  update nutriai.usage_periods
  set reserved_count = reserved_count + 1
  where id = usage_period.id
  returning * into usage_period;

  if effective_plan = 'free' then
    reserved_for_access := reserved_for_access + 1;
  else
    reserved_for_access := usage_period.reserved_count;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'status', 'reserved',
    'reservationId', reservation_id,
    'planId', usage_period.plan_id,
    'allowance', usage_period.allowance,
    'used', usage_period.consumed_count,
    'reserved', reserved_for_access,
    'remaining', greatest(
      usage_period.allowance - usage_period.consumed_count - reserved_for_access,
      0
    ),
    'periodEnd', usage_period.period_end
  );
end;
$$;

create or replace function nutriai.settle_designed_page_generation(
  p_user_id uuid,
  p_generation_request_id uuid,
  p_version_id uuid,
  p_response_payload jsonb,
  p_select_version boolean default false,
  p_provider_cost_usd numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation_request nutriai.generation_requests;
  reservation nutriai.usage_reservations;
  reservation_period nutriai.usage_periods;
  lifetime_period nutriai.usage_periods;
  free_lifetime_allowance integer;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('designed_pages:' || p_user_id::text, 0)
  );

  select *
    into generation_request
  from nutriai.generation_requests
  where id = p_generation_request_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Generation request not found' using errcode = 'P0002';
  end if;

  if generation_request.status = 'ready' then
    return generation_request.response_payload;
  end if;
  if generation_request.status <> 'processing' or generation_request.page_id is null then
    raise exception 'Generation request cannot be completed' using errcode = '55000';
  end if;
  if p_provider_cost_usd is not null and p_provider_cost_usd < 0 then
    raise exception 'Invalid provider cost' using errcode = '22023';
  end if;

  perform 1
  from nutriai.page_versions
  where id = p_version_id
    and page_id = generation_request.page_id
    and status = 'ready';
  if not found then
    raise exception 'Generated page version does not belong to this request'
      using errcode = '23503';
  end if;

  select *
    into reservation
  from nutriai.usage_reservations
  where generation_request_id = p_generation_request_id
    and user_id = p_user_id
  for update;

  if not found or reservation.state <> 'reserved' then
    raise exception 'Designed-page reservation is not active' using errcode = '55000';
  end if;

  select *
    into reservation_period
  from nutriai.usage_periods
  where id = reservation.usage_period_id
  for update;
  if not found then
    raise exception 'Designed-page usage period was not found' using errcode = '55000';
  end if;

  update nutriai.usage_periods
  set
    reserved_count = reserved_count - reservation.quantity,
    consumed_count = case
      when period_end is null then least(consumed_count + reservation.quantity, allowance)
      else consumed_count + reservation.quantity
    end
  where id = reservation.usage_period_id;

  -- A successful page always advances the deletion-stable Free lifetime
  -- counter, even when its primary allowance is a Plus calendar month. Free
  -- reservations already use this period, so they must not be counted twice.
  if reservation_period.period_end is not null then
    select *
      into lifetime_period
    from nutriai.usage_periods
    where user_id = p_user_id
      and meter_key = 'designed_pages'
      and period_end is null
    for update;

    if not found then
      select feature.allowance
        into free_lifetime_allowance
      from nutriai.subscription_plan_features as feature
      where feature.plan_id = 'free'
        and feature.feature_key = 'designed_pages'
        and feature.enabled;
      if free_lifetime_allowance is null then
        raise exception 'Free lifetime designed-page allowance is not configured'
          using errcode = '55000';
      end if;

      insert into nutriai.usage_periods (
        user_id, meter_key, plan_id, period_start, period_end, allowance
      ) values (
        p_user_id, 'designed_pages', 'free',
        '1970-01-01 00:00:00+00'::timestamptz, null, free_lifetime_allowance
      )
      returning * into lifetime_period;
    end if;

    update nutriai.usage_periods
    set consumed_count = least(consumed_count + reservation.quantity, allowance)
    where id = lifetime_period.id;
  end if;

  update nutriai.usage_reservations
  set
    state = 'settled',
    page_version_id = p_version_id,
    provider_cost_usd = p_provider_cost_usd,
    settled_at = now()
  where id = reservation.id;

  -- Preserve links for any historical request that had already used the
  -- dormant internal credit ledger, without creating a new credit spend.
  update nutriai.credit_ledger
  set related_page_version_id = p_version_id
  where generation_request_id = p_generation_request_id
    and event_type = 'generation_spend';

  if p_select_version then
    update nutriai.cookbook_pages
    set selected_version_id = p_version_id
    where id = generation_request.page_id;
  end if;

  update nutriai.generation_requests
  set
    status = 'ready',
    version_id = p_version_id,
    response_payload = p_response_payload,
    failure_code = null,
    error_message = null
  where id = p_generation_request_id;

  return p_response_payload;
end;
$$;

create or replace function nutriai.release_designed_page_generation(
  p_user_id uuid,
  p_generation_request_id uuid,
  p_error_message text,
  p_failure_code text default 'generation_failed'
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation_request nutriai.generation_requests;
  reservation nutriai.usage_reservations;
  changed boolean := false;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('designed_pages:' || p_user_id::text, 0)
  );

  select *
    into generation_request
  from nutriai.generation_requests
  where id = p_generation_request_id
    and user_id = p_user_id
  for update;

  if not found then
    raise exception 'Generation request not found' using errcode = 'P0002';
  end if;
  if generation_request.status = 'ready' then
    return false;
  end if;

  select *
    into reservation
  from nutriai.usage_reservations
  where generation_request_id = p_generation_request_id
    and user_id = p_user_id
  for update;

  if found and reservation.state = 'reserved' then
    update nutriai.usage_periods
    set reserved_count = reserved_count - reservation.quantity
    where id = reservation.usage_period_id;

    update nutriai.usage_reservations
    set
      state = 'released',
      release_reason = left(coalesce(p_failure_code, 'generation_failed'), 120),
      released_at = now()
    where id = reservation.id;
    changed := true;
  end if;

  if generation_request.status <> 'failed'
    or generation_request.failure_code is distinct from p_failure_code then
    update nutriai.generation_requests
    set
      status = 'failed',
      failure_code = left(coalesce(p_failure_code, 'generation_failed'), 120),
      error_message = left(coalesce(p_error_message, 'Generation failed'), 1000)
    where id = p_generation_request_id;
    changed := true;
  end if;

  return changed;
end;
$$;

create or replace function nutriai.get_subscription_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  effective_plan text;
  plan_name text;
  cookbook_limit integer;
  cookbook_count integer;
  page_limit integer;
  page_period_start timestamptz;
  page_period_end timestamptz;
  page_used integer := 0;
  page_reserved integer := 0;
  entitlement nutriai.user_entitlements;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  effective_plan := nutriai.effective_subscription_plan_id(caller_id, now());
  select display_name into plan_name
  from nutriai.subscription_plans where id = effective_plan;

  select allowance into cookbook_limit
  from nutriai.subscription_plan_features
  where plan_id = effective_plan and feature_key = 'cookbooks' and enabled;

  select count(*)::integer into cookbook_count
  from nutriai.cookbooks where user_id = caller_id;

  select allowance into page_limit
  from nutriai.subscription_plan_features
  where plan_id = effective_plan and feature_key = 'designed_pages' and enabled;

  if effective_plan = 'plus' then
    page_period_start := date_trunc('month', now() at time zone 'UTC') at time zone 'UTC';
    page_period_end := page_period_start + interval '1 month';
    select consumed_count, reserved_count
      into page_used, page_reserved
    from nutriai.usage_periods
    where user_id = caller_id
      and meter_key = 'designed_pages'
      and period_start = page_period_start
      and period_end = page_period_end;
  else
    page_period_start := null;
    page_period_end := null;
    select consumed_count
      into page_used
    from nutriai.usage_periods
    where user_id = caller_id
      and meter_key = 'designed_pages'
      and period_end is null;

    -- Include an in-flight Plus request after a downgrade. The successful
    -- result will advance the Free lifetime shadow counter when it settles.
    select coalesce(sum(active_reservation.quantity), 0)::integer
      into page_reserved
    from nutriai.usage_reservations as active_reservation
    where active_reservation.user_id = caller_id
      and active_reservation.state = 'reserved';
  end if;
  page_used := coalesce(page_used, 0);
  page_reserved := coalesce(page_reserved, 0);

  select * into entitlement
  from nutriai.user_entitlements
  where user_id = caller_id
    and entitlement_id = 'nosh_plus'
  order by provider_updated_at desc
  limit 1;

  return jsonb_build_object(
    'planId', effective_plan,
    'planName', plan_name,
    'entitlementStatus', entitlement.status,
    'productId', entitlement.product_id,
    'environment', entitlement.environment,
    'periodType', entitlement.period_type,
    'currentPeriodStartedAt', entitlement.current_period_started_at,
    'currentPeriodEndsAt', entitlement.current_period_ends_at,
    'willRenew', entitlement.will_renew,
    'features', jsonb_build_object(
      'cookbooks', jsonb_build_object(
        'enabled', true,
        'limit', cookbook_limit,
        'used', cookbook_count,
        'remaining', case
          when cookbook_limit is null then null
          else greatest(cookbook_limit - cookbook_count, 0)
        end
      ),
      'designedPages', jsonb_build_object(
        'enabled', true,
        'limit', page_limit,
        'used', page_used,
        'reserved', page_reserved,
        'remaining', greatest(page_limit - page_used - page_reserved, 0),
        'periodStart', page_period_start,
        'periodEnd', page_period_end
      )
    )
  );
end;
$$;

create or replace function nutriai.create_cookbook_for_current_user(
  p_title text,
  p_theme_name text,
  p_theme_prompt text,
  p_cover_style text,
  p_cover_finish_id text,
  p_cover_color_id text,
  p_page_style_id text,
  p_style_revision integer,
  p_page_style_references jsonb,
  p_page_template_id text,
  p_sections jsonb
)
returns nutriai.cookbooks
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  effective_plan text;
  cookbook_limit integer;
  cookbook_count integer;
  inserted_cookbook nutriai.cookbooks;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null
    or nullif(btrim(p_theme_name), '') is null
    or nullif(btrim(p_theme_prompt), '') is null
    or jsonb_typeof(coalesce(p_page_style_references, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_sections, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid cookbook details' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('cookbooks:' || caller_id::text, 0)
  );

  effective_plan := nutriai.effective_subscription_plan_id(caller_id, now());
  select allowance into cookbook_limit
  from nutriai.subscription_plan_features as feature
  where feature.plan_id = effective_plan
    and feature_key = 'cookbooks'
    and enabled;

  select count(*)::integer into cookbook_count
  from nutriai.cookbooks where user_id = caller_id;

  if cookbook_limit is not null and cookbook_count >= cookbook_limit then
    raise exception 'cookbook_limit_reached' using errcode = 'P0001';
  end if;

  insert into nutriai.cookbooks (
    user_id,
    title,
    theme_name,
    theme_prompt,
    cover_style,
    cover_finish_id,
    cover_color_id,
    page_style_id,
    style_revision,
    page_style_references,
    page_template_id,
    sections,
    is_default
  ) values (
    caller_id,
    btrim(p_title),
    btrim(p_theme_name),
    btrim(p_theme_prompt),
    p_cover_style,
    p_cover_finish_id,
    p_cover_color_id,
    p_page_style_id,
    p_style_revision,
    coalesce(p_page_style_references, '[]'::jsonb),
    p_page_template_id,
    coalesce(p_sections, '[]'::jsonb),
    cookbook_count = 0
  )
  returning * into inserted_cookbook;

  return inserted_cookbook;
end;
$$;

alter table nutriai.subscription_plans enable row level security;
alter table nutriai.subscription_plan_features enable row level security;
alter table nutriai.subscription_products enable row level security;
alter table nutriai.user_entitlements enable row level security;
alter table nutriai.subscription_webhook_events enable row level security;
alter table nutriai.usage_periods enable row level security;
alter table nutriai.usage_reservations enable row level security;

create policy subscription_plans_authenticated_select
  on nutriai.subscription_plans for select to authenticated using (true);
create policy subscription_plan_features_authenticated_select
  on nutriai.subscription_plan_features for select to authenticated using (true);
create policy subscription_products_authenticated_select
  on nutriai.subscription_products for select to authenticated using (true);

revoke all on table nutriai.subscription_plans from public, anon, authenticated;
revoke all on table nutriai.subscription_plan_features from public, anon, authenticated;
revoke all on table nutriai.subscription_products from public, anon, authenticated;
revoke all on table nutriai.user_entitlements from public, anon, authenticated;
revoke all on table nutriai.subscription_webhook_events from public, anon, authenticated;
revoke all on table nutriai.usage_periods from public, anon, authenticated;
revoke all on table nutriai.usage_reservations from public, anon, authenticated;

grant select on table nutriai.subscription_plans to authenticated;
grant select on table nutriai.subscription_plan_features to authenticated;
grant select on table nutriai.subscription_products to authenticated;

grant all on table nutriai.subscription_plans to service_role;
grant all on table nutriai.subscription_plan_features to service_role;
grant all on table nutriai.subscription_products to service_role;
grant all on table nutriai.user_entitlements to service_role;
grant all on table nutriai.subscription_webhook_events to service_role;
grant all on table nutriai.usage_periods to service_role;
grant all on table nutriai.usage_reservations to service_role;

-- Cookbook creation now goes through one guarded interface. Existing rows are
-- grandfathered; only future inserts are subject to the active plan limit.
drop policy if exists cookbooks_owner_insert on nutriai.cookbooks;
revoke insert on table nutriai.cookbooks from authenticated;

revoke all on function nutriai.effective_subscription_plan_id(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function nutriai.release_deleted_usage_reservation()
  from public, anon, authenticated, service_role;
revoke all on function nutriai.record_revenuecat_webhook_event(text, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function nutriai.complete_revenuecat_webhook_event(text, text, text)
  from public, anon, authenticated;
revoke all on function nutriai.sync_subscription_from_provider(
  uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  boolean, text, timestamptz, jsonb
) from public, anon, authenticated;
revoke all on function nutriai.deactivate_subscription_from_provider(
  uuid, text, text, text, timestamptz, jsonb
) from public, anon, authenticated;
revoke all on function nutriai.release_stale_designed_page_reservations(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function nutriai.reserve_designed_page_generation(uuid, uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function nutriai.settle_designed_page_generation(
  uuid, uuid, uuid, jsonb, boolean, numeric
) from public, anon, authenticated;
revoke all on function nutriai.release_designed_page_generation(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function nutriai.get_subscription_access()
  from public, anon;
revoke all on function nutriai.create_cookbook_for_current_user(
  text, text, text, text, text, text, text, integer, jsonb, text, jsonb
) from public, anon;

grant execute on function nutriai.record_revenuecat_webhook_event(text, text, text, jsonb)
  to service_role;
grant execute on function nutriai.complete_revenuecat_webhook_event(text, text, text)
  to service_role;
grant execute on function nutriai.sync_subscription_from_provider(
  uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  boolean, text, timestamptz, jsonb
) to service_role;
grant execute on function nutriai.deactivate_subscription_from_provider(
  uuid, text, text, text, timestamptz, jsonb
) to service_role;
grant execute on function nutriai.reserve_designed_page_generation(uuid, uuid, uuid, text)
  to service_role;
grant execute on function nutriai.settle_designed_page_generation(
  uuid, uuid, uuid, jsonb, boolean, numeric
) to service_role;
grant execute on function nutriai.release_designed_page_generation(uuid, uuid, text, text)
  to service_role;
grant execute on function nutriai.get_subscription_access()
  to authenticated;
grant execute on function nutriai.create_cookbook_for_current_user(
  text, text, text, text, text, text, text, integer, jsonb, text, jsonb
) to authenticated;

comment on table nutriai.subscription_plans is
  'Stable Nosh plan identities. Store pricing is deliberately not persisted here.';
comment on table nutriai.subscription_plan_features is
  'Server-authoritative plan capabilities and capacity policy.';
comment on table nutriai.subscription_products is
  'App Store product identifiers mapped to Nosh plans and RevenueCat entitlements.';
comment on table nutriai.user_entitlements is
  'Latest normalized subscription entitlement snapshot from RevenueCat.';
comment on table nutriai.subscription_webhook_events is
  'Service-only idempotency and retry log for authenticated RevenueCat webhooks. Raw webhook identity and purchase data is never retained; only its SHA-256 digest is stored. Environment is unknown when RevenueCat omits it; subscriber reconciliation remains authoritative.';
comment on column nutriai.subscription_webhook_events.payload_digest is
  'Single-key SHA-256 digest object used to reject event-id reuse without retaining the webhook payload.';
comment on column nutriai.subscription_webhook_events.environment is
  'Audited webhook hint: production, sandbox, or unknown when the provider omitted the field.';
comment on table nutriai.usage_periods is
  'Deletion-stable allowance counters. The capped Free lifetime period advances on every successful post-launch page; Plus also uses UTC calendar months.';
comment on table nutriai.usage_reservations is
  'Exactly-once request details for designed-page accounting. Settled rows may be deleted with cookbook history because consumed period counters remain durable.';
comment on function nutriai.release_deleted_usage_reservation() is
  'Trigger-only cascade accounting: deleting an in-flight reservation releases reserved capacity, while settled consumption remains durable.';
comment on column nutriai.page_versions.credit_cost is
  'Legacy internal-credit metadata. Subscription page usage is recorded in usage_reservations; new values remain 0.';
comment on constraint recipes_source_type_check on nutriai.recipes is
  'Recipe provenance includes manual assistant-authored copies; recipe captures remain restricted to intake formats.';
comment on function nutriai.get_subscription_access() is
  'Authenticated, read-only snapshot used by plan, usage, Settings, and paywall presentation.';
comment on function nutriai.create_cookbook_for_current_user(
  text, text, text, text, text, text, text, integer, jsonb, text, jsonb
) is 'Creates an owned cookbook while atomically enforcing the current plan capacity.';
