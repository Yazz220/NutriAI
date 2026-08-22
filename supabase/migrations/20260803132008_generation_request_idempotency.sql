create table if not exists nutriai.generation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cookbook_id uuid not null references nutriai.cookbooks(id) on delete cascade,
  idempotency_key text not null,
  request_payload jsonb not null,
  status text not null default 'processing'
    check (status in ('processing', 'ready', 'failed')),
  recipe_id uuid references nutriai.recipes(id) on delete set null,
  page_id uuid references nutriai.cookbook_pages(id) on delete set null,
  version_id uuid references nutriai.page_versions(id) on delete set null,
  storage_path text,
  response_payload jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists generation_requests_user_created_idx
  on nutriai.generation_requests (user_id, created_at desc);

create index if not exists generation_requests_processing_idx
  on nutriai.generation_requests (updated_at)
  where status = 'processing';

drop trigger if exists generation_requests_set_updated_at on nutriai.generation_requests;
create trigger generation_requests_set_updated_at
  before update on nutriai.generation_requests
  for each row execute function nutriai.set_updated_at();

alter table nutriai.generation_requests enable row level security;

alter table nutriai.credit_ledger
  add column if not exists generation_request_id uuid
  references nutriai.generation_requests(id) on delete set null;

alter table nutriai.credit_ledger
  drop constraint if exists credit_ledger_event_type_check;

alter table nutriai.credit_ledger
  add constraint credit_ledger_event_type_check
  check (event_type in ('grant', 'generation_spend', 'generation_refund', 'adjustment'));

create unique index if not exists credit_ledger_generation_spend_request_idx
  on nutriai.credit_ledger (generation_request_id)
  where event_type = 'generation_spend' and generation_request_id is not null;

create unique index if not exists credit_ledger_generation_refund_request_idx
  on nutriai.credit_ledger (generation_request_id)
  where event_type = 'generation_refund' and generation_request_id is not null;

create or replace function nutriai.begin_generation_request(
  p_user_id uuid,
  p_cookbook_id uuid,
  p_idempotency_key text,
  p_request_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_request nutriai.generation_requests;
begin
  if length(p_idempotency_key) < 16 or length(p_idempotency_key) > 160 then
    raise exception 'Invalid generation idempotency key' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_user_id::text || ':' || p_idempotency_key, 0)
  );

  select *
    into existing_request
  from nutriai.generation_requests
  where user_id = p_user_id
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    if existing_request.cookbook_id <> p_cookbook_id
      or existing_request.request_payload is distinct from p_request_payload then
      raise exception 'Generation idempotency key was reused for a different request'
        using errcode = '22023';
    end if;

    if existing_request.status = 'processing'
      and existing_request.updated_at < now() - interval '10 minutes' then
      perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

      insert into nutriai.credit_ledger (
        user_id,
        event_type,
        amount,
        generation_request_id
      )
      select
        p_user_id,
        'generation_refund',
        1,
        existing_request.id
      where exists (
        select 1
        from nutriai.credit_ledger
        where generation_request_id = existing_request.id
          and event_type = 'generation_spend'
      )
      on conflict do nothing;

      update nutriai.generation_requests
      set
        status = 'failed',
        error_message = 'Generation expired before completion'
      where id = existing_request.id
      returning * into existing_request;
    end if;

    return jsonb_build_object(
      'id', existing_request.id,
      'status', existing_request.status,
      'claimed', false,
      'response', existing_request.response_payload,
      'error', existing_request.error_message,
      'recipeId', existing_request.recipe_id,
      'pageId', existing_request.page_id,
      'versionId', existing_request.version_id,
      'storagePath', existing_request.storage_path,
      'createdPage', not (existing_request.request_payload ? 'pageId')
    );
  end if;

  insert into nutriai.generation_requests (
    user_id,
    cookbook_id,
    idempotency_key,
    request_payload
  )
  values (
    p_user_id,
    p_cookbook_id,
    p_idempotency_key,
    p_request_payload
  )
  returning * into existing_request;

  return jsonb_build_object(
    'id', existing_request.id,
    'status', existing_request.status,
    'claimed', true
  );
end;
$$;

create or replace function nutriai.reserve_generation_credit(
  p_user_id uuid,
  p_generation_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation_request nutriai.generation_requests;
  current_balance integer;
  spend_id uuid;
begin
  select *
    into generation_request
  from nutriai.generation_requests
  where id = p_generation_request_id
  for update;

  if not found or generation_request.user_id <> p_user_id then
    raise exception 'Generation request not found' using errcode = 'P0002';
  end if;

  if generation_request.status <> 'processing' then
    raise exception 'Generation request is not processing' using errcode = '55000';
  end if;

  select id
    into spend_id
  from nutriai.credit_ledger
  where generation_request_id = p_generation_request_id
    and event_type = 'generation_spend';

  if spend_id is not null then
    return spend_id;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select coalesce(sum(amount), 0)::integer
    into current_balance
  from nutriai.credit_ledger
  where user_id = p_user_id;

  if current_balance < 1 then
    raise exception 'Not enough credits' using errcode = 'P0001';
  end if;

  insert into nutriai.credit_ledger (
    user_id,
    event_type,
    amount,
    generation_request_id
  )
  values (
    p_user_id,
    'generation_spend',
    -1,
    p_generation_request_id
  )
  returning id into spend_id;

  update nutriai.generation_requests
  set updated_at = now()
  where id = p_generation_request_id;

  return spend_id;
end;
$$;

create or replace function nutriai.complete_generation_request(
  p_user_id uuid,
  p_generation_request_id uuid,
  p_version_id uuid,
  p_response_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation_request nutriai.generation_requests;
begin
  select *
    into generation_request
  from nutriai.generation_requests
  where id = p_generation_request_id
  for update;

  if not found or generation_request.user_id <> p_user_id then
    raise exception 'Generation request not found' using errcode = 'P0002';
  end if;

  if generation_request.status = 'ready' then
    return generation_request.response_payload;
  end if;

  if generation_request.status <> 'processing' or generation_request.page_id is null then
    raise exception 'Generation request cannot be completed' using errcode = '55000';
  end if;

  perform 1
  from nutriai.page_versions
  where id = p_version_id
    and page_id = generation_request.page_id;

  if not found then
    raise exception 'Generated page version does not belong to this request'
      using errcode = '23503';
  end if;

  update nutriai.credit_ledger
  set related_page_version_id = p_version_id
  where generation_request_id = p_generation_request_id
    and event_type = 'generation_spend';

  if not found then
    raise exception 'Generation credit reservation not found' using errcode = 'P0002';
  end if;

  update nutriai.cookbook_pages
  set selected_version_id = p_version_id
  where id = generation_request.page_id;

  update nutriai.generation_requests
  set
    status = 'ready',
    version_id = p_version_id,
    response_payload = p_response_payload,
    error_message = null
  where id = p_generation_request_id;

  return p_response_payload;
end;
$$;

create or replace function nutriai.fail_generation_request(
  p_user_id uuid,
  p_generation_request_id uuid,
  p_error_message text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  generation_request nutriai.generation_requests;
begin
  select *
    into generation_request
  from nutriai.generation_requests
  where id = p_generation_request_id
  for update;

  if not found or generation_request.user_id <> p_user_id then
    raise exception 'Generation request not found' using errcode = 'P0002';
  end if;

  if generation_request.status = 'ready' then
    return false;
  end if;

  if generation_request.status = 'failed' then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  insert into nutriai.credit_ledger (
    user_id,
    event_type,
    amount,
    generation_request_id
  )
  select
    p_user_id,
    'generation_refund',
    1,
    p_generation_request_id
  where exists (
    select 1
    from nutriai.credit_ledger
    where generation_request_id = p_generation_request_id
      and event_type = 'generation_spend'
  )
  on conflict do nothing;

  update nutriai.generation_requests
  set
    status = 'failed',
    error_message = left(coalesce(p_error_message, 'Generation failed'), 1000)
  where id = p_generation_request_id;

  return true;
end;
$$;

grant select, insert, update, delete on nutriai.generation_requests to service_role;

revoke all on function nutriai.begin_generation_request(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function nutriai.reserve_generation_credit(uuid, uuid)
  from public, anon, authenticated;
revoke all on function nutriai.complete_generation_request(uuid, uuid, uuid, jsonb)
  from public, anon, authenticated;
revoke all on function nutriai.fail_generation_request(uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function nutriai.begin_generation_request(uuid, uuid, text, jsonb)
  to service_role;
grant execute on function nutriai.reserve_generation_credit(uuid, uuid)
  to service_role;
grant execute on function nutriai.complete_generation_request(uuid, uuid, uuid, jsonb)
  to service_role;
grant execute on function nutriai.fail_generation_request(uuid, uuid, text)
  to service_role;
