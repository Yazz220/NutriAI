create table if not exists nutriai.recipe_captures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination_cookbook_id uuid references nutriai.cookbooks(id) on delete set null,
  source_type text not null check (source_type in ('url', 'text', 'image', 'video')),
  source_payload jsonb not null default '{}'::jsonb,
  source_storage_path text,
  status text not null default 'saved'
    check (status in ('saved', 'reading', 'ready_to_review', 'needs_help', 'added')),
  recipe_graph jsonb,
  confidence numeric(4, 3) check (confidence between 0 and 1),
  extraction_notes jsonb not null default '[]'::jsonb,
  inferred_fields jsonb not null default '[]'::jsonb,
  pending_page_id uuid,
  art_status text not null default 'not_started'
    check (art_status in ('not_started', 'generating', 'ready', 'failed')),
  art_warning text,
  failure_code text,
  failure_message text,
  idempotency_key text not null,
  processing_attempt integer not null default 0 check (processing_attempt >= 0),
  processing_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (source_storage_path is null or source_type = 'image'),
  check (source_type <> 'image' or source_storage_path is not null),
  check (status not in ('ready_to_review', 'added') or recipe_graph is not null)
);

alter table nutriai.cookbook_pages
  add column if not exists lifecycle_status text not null default 'approved';

alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_lifecycle_status_check;

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_lifecycle_status_check
  check (lifecycle_status in ('pending_review', 'approved'));

alter table nutriai.cookbook_pages
  add column if not exists capture_id uuid references nutriai.recipe_captures(id) on delete set null;

create unique index if not exists cookbook_pages_capture_id_unique_idx
  on nutriai.cookbook_pages (capture_id)
  where capture_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'recipe_captures_pending_page_id_fkey'
      and conrelid = 'nutriai.recipe_captures'::regclass
  ) then
    alter table nutriai.recipe_captures
      add constraint recipe_captures_pending_page_id_fkey
      foreign key (pending_page_id) references nutriai.cookbook_pages(id) on delete set null;
  end if;
end $$;

create index if not exists recipe_captures_user_status_updated_idx
  on nutriai.recipe_captures (user_id, status, updated_at desc);

create index if not exists recipe_captures_destination_status_updated_idx
  on nutriai.recipe_captures (destination_cookbook_id, status, updated_at desc)
  where destination_cookbook_id is not null;

create index if not exists recipe_captures_stale_reading_idx
  on nutriai.recipe_captures (processing_started_at)
  where status = 'reading';

drop trigger if exists recipe_captures_set_updated_at on nutriai.recipe_captures;
create trigger recipe_captures_set_updated_at
  before update on nutriai.recipe_captures
  for each row execute function nutriai.set_updated_at();

create or replace function nutriai.enforce_recipe_capture_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'saved' and new.status = 'reading')
    or (old.status = 'reading' and new.status in ('ready_to_review', 'needs_help'))
    or (old.status = 'needs_help' and new.status = 'reading')
    or (old.status = 'ready_to_review' and new.status = 'added')
  ) then
    raise exception 'Invalid recipe capture transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists recipe_captures_enforce_transition on nutriai.recipe_captures;
create trigger recipe_captures_enforce_transition
  before update of status on nutriai.recipe_captures
  for each row execute function nutriai.enforce_recipe_capture_transition();

alter table nutriai.recipe_captures enable row level security;

drop policy if exists "Users can read their recipe captures" on nutriai.recipe_captures;
create policy "Users can read their recipe captures"
  on nutriai.recipe_captures for select
  to authenticated
  using ((select auth.uid()) = user_id);

grant select on nutriai.recipe_captures to authenticated;
grant select, insert, update, delete on nutriai.recipe_captures to service_role;

create or replace function nutriai.begin_recipe_capture(
  p_source_type text,
  p_source_payload jsonb,
  p_source_storage_path text,
  p_destination_cookbook_id uuid,
  p_idempotency_key text
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  capture nutriai.recipe_captures;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_source_type not in ('url', 'text', 'image', 'video') then
    raise exception 'Invalid source type' using errcode = '22023';
  end if;
  if length(p_idempotency_key) < 16 or length(p_idempotency_key) > 160 then
    raise exception 'Invalid capture idempotency key' using errcode = '22023';
  end if;
  if p_source_type = 'image' and p_source_storage_path is null then
    raise exception 'Image capture requires a storage path' using errcode = '22023';
  end if;
  if p_source_storage_path is not null
    and p_source_storage_path not like caller_id::text || '/%' then
    raise exception 'Capture storage path does not belong to the caller' using errcode = '42501';
  end if;
  if p_destination_cookbook_id is not null and not exists (
    select 1 from nutriai.cookbooks
    where id = p_destination_cookbook_id and user_id = caller_id
  ) then
    raise exception 'Destination cookbook not found' using errcode = 'P0002';
  end if;

  insert into nutriai.recipe_captures (
    user_id, destination_cookbook_id, source_type, source_payload,
    source_storage_path, idempotency_key
  ) values (
    caller_id, p_destination_cookbook_id, p_source_type,
    coalesce(p_source_payload, '{}'::jsonb), p_source_storage_path, p_idempotency_key
  )
  on conflict (user_id, idempotency_key) do nothing;

  select * into capture
  from nutriai.recipe_captures
  where user_id = caller_id and idempotency_key = p_idempotency_key;

  if capture.source_type <> p_source_type
    or capture.source_payload is distinct from coalesce(p_source_payload, '{}'::jsonb)
    or capture.source_storage_path is distinct from p_source_storage_path
    or capture.destination_cookbook_id is distinct from p_destination_cookbook_id then
    raise exception 'Capture idempotency key was reused for another source' using errcode = '22023';
  end if;

  return capture;
end;
$$;

create or replace function nutriai.claim_recipe_capture(
  p_user_id uuid,
  p_capture_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  capture nutriai.recipe_captures;
begin
  select * into capture from nutriai.recipe_captures
  where id = p_capture_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Recipe capture not found' using errcode = 'P0002';
  end if;

  if capture.status in ('ready_to_review', 'added') then
    return jsonb_build_object('claimed', false, 'capture', to_jsonb(capture));
  end if;
  if capture.status = 'reading'
    and capture.processing_started_at >= now() - interval '10 minutes' then
    return jsonb_build_object('claimed', false, 'capture', to_jsonb(capture));
  end if;
  if capture.status = 'reading' then
    update nutriai.recipe_captures set status = 'needs_help' where id = capture.id;
  end if;

  update nutriai.recipe_captures
  set status = 'reading', processing_started_at = now(),
      processing_attempt = processing_attempt + 1,
      failure_code = null, failure_message = null
  where id = capture.id
  returning * into capture;

  return jsonb_build_object('claimed', true, 'capture', to_jsonb(capture));
end;
$$;

create or replace function nutriai.create_capture_pending_page(
  p_user_id uuid,
  p_capture_id uuid,
  p_recipe_graph jsonb,
  p_style_id text,
  p_template_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  capture nutriai.recipe_captures;
  recipe_id uuid;
  page_id uuid;
  next_sort integer;
  next_page integer;
begin
  select * into capture from nutriai.recipe_captures
  where id = p_capture_id and user_id = p_user_id
  for update;
  if not found or capture.destination_cookbook_id is null then
    raise exception 'Capture destination not found' using errcode = 'P0002';
  end if;
  if capture.pending_page_id is not null then return capture.pending_page_id; end if;
  if capture.status <> 'reading' then
    raise exception 'Capture is not reading' using errcode = '55000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(capture.destination_cookbook_id::text, 0));
  select coalesce(max(sort_order), -1) + 1, coalesce(max(page_number), 0) + 1
    into next_sort, next_page
  from nutriai.cookbook_pages where cookbook_id = capture.destination_cookbook_id;

  insert into nutriai.recipes (
    user_id, title, description, servings, prep_time, cook_time,
    ingredients, steps, source_type, source_url, tags, category, confidence
  ) values (
    p_user_id,
    coalesce(nullif(p_recipe_graph ->> 'title', ''), 'Untitled Recipe'),
    p_recipe_graph ->> 'description',
    nullif(p_recipe_graph ->> 'servings', '')::integer,
    nullif(p_recipe_graph ->> 'prepTimeMinutes', '')::integer,
    nullif(p_recipe_graph ->> 'cookTimeMinutes', '')::integer,
    coalesce(p_recipe_graph -> 'ingredientGroups', '[]'::jsonb),
    coalesce(p_recipe_graph -> 'stepGroups', '[]'::jsonb),
    capture.source_type,
    capture.source_payload ->> 'input',
    coalesce(p_recipe_graph -> 'tags', '[]'::jsonb),
    p_recipe_graph ->> 'category',
    capture.confidence
  ) returning id into recipe_id;

  insert into nutriai.cookbook_pages (
    cookbook_id, recipe_id, page_number, section, sort_order,
    recipe_graph, style_id, template_id, lifecycle_status, capture_id
  ) values (
    capture.destination_cookbook_id, recipe_id, next_page,
    p_recipe_graph ->> 'category', next_sort, p_recipe_graph,
    p_style_id, p_template_id, 'pending_review', capture.id
  ) returning id into page_id;

  update nutriai.recipe_captures set pending_page_id = page_id where id = capture.id;
  return page_id;
end;
$$;

create or replace function nutriai.complete_recipe_capture(
  p_user_id uuid,
  p_capture_id uuid,
  p_recipe_graph jsonb,
  p_confidence numeric,
  p_extraction_notes jsonb,
  p_inferred_fields jsonb,
  p_art_status text,
  p_art_warning text
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare capture nutriai.recipe_captures;
begin
  update nutriai.recipe_captures
  set status = 'ready_to_review', recipe_graph = p_recipe_graph,
      confidence = p_confidence,
      extraction_notes = coalesce(p_extraction_notes, '[]'::jsonb),
      inferred_fields = coalesce(p_inferred_fields, '[]'::jsonb),
      art_status = p_art_status, art_warning = p_art_warning,
      processing_started_at = null, failure_code = null, failure_message = null
  where id = p_capture_id and user_id = p_user_id
    and status in ('reading', 'ready_to_review')
  returning * into capture;
  if not found then raise exception 'Recipe capture cannot be completed' using errcode = '55000'; end if;
  return capture;
end;
$$;

create or replace function nutriai.fail_recipe_capture(
  p_user_id uuid,
  p_capture_id uuid,
  p_failure_code text,
  p_failure_message text
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare capture nutriai.recipe_captures;
begin
  update nutriai.recipe_captures
  set status = 'needs_help', processing_started_at = null,
      failure_code = left(coalesce(p_failure_code, 'processing_failed'), 80),
      failure_message = left(coalesce(p_failure_message, 'Recipe processing failed'), 1000)
  where id = p_capture_id and user_id = p_user_id and status = 'reading'
  returning * into capture;
  if not found then
    select * into capture from nutriai.recipe_captures
    where id = p_capture_id and user_id = p_user_id;
  end if;
  return capture;
end;
$$;

revoke all on function nutriai.begin_recipe_capture(text, jsonb, text, uuid, text) from public, anon;
grant execute on function nutriai.begin_recipe_capture(text, jsonb, text, uuid, text) to authenticated;

revoke all on function nutriai.claim_recipe_capture(uuid, uuid) from public, anon, authenticated;
revoke all on function nutriai.create_capture_pending_page(uuid, uuid, jsonb, text, text) from public, anon, authenticated;
revoke all on function nutriai.complete_recipe_capture(uuid, uuid, jsonb, numeric, jsonb, jsonb, text, text) from public, anon, authenticated;
revoke all on function nutriai.fail_recipe_capture(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function nutriai.claim_recipe_capture(uuid, uuid) to service_role;
grant execute on function nutriai.create_capture_pending_page(uuid, uuid, jsonb, text, text) to service_role;
grant execute on function nutriai.complete_recipe_capture(uuid, uuid, jsonb, numeric, jsonb, jsonb, text, text) to service_role;
grant execute on function nutriai.fail_recipe_capture(uuid, uuid, text, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'recipe-captures', 'recipe-captures', false, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload their capture sources" on storage.objects;
create policy "Users can upload their capture sources"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'recipe-captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can read their capture sources" on storage.objects;
create policy "Users can read their capture sources"
  on storage.objects for select to authenticated
  using (bucket_id = 'recipe-captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their capture sources" on storage.objects;
create policy "Users can delete their capture sources"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recipe-captures' and (storage.foldername(name))[1] = (select auth.uid())::text);

create index if not exists cookbook_pages_approved_cookbook_idx
  on nutriai.cookbook_pages (cookbook_id, sort_order, page_number)
  where lifecycle_status = 'approved';

-- Existing installations already have the collection-search function. Rebuild
-- its body with the approved-page predicate added by the source migration.
do $$
declare
  function_sql text;
  updated_sql text;
begin
  select pg_get_functiondef(
    'nutriai.search_recipe_collection(text,uuid,boolean,integer)'::regprocedure
  ) into function_sql;
  if position('page.lifecycle_status' in function_sql) = 0 then
    updated_sql := replace(
      function_sql,
      'and page.recipe_graph is not null',
      'and page.recipe_graph is not null
      and page.lifecycle_status = ''approved'''
    );
    if updated_sql = function_sql then
      raise exception 'Could not add approved lifecycle filter to collection search';
    end if;
    execute updated_sql;
  end if;
end $$;
