-- One durable import pipeline. The user chooses a cookbook only when Nosh
-- cannot resolve an explicit, default, or sole destination.

alter table nutriai.cookbooks
  add column if not exists style_revision integer not null default 1
    check (style_revision > 0),
  add column if not exists page_style_references jsonb not null default '[]'::jsonb
    check (jsonb_typeof(page_style_references) = 'array'),
  add column if not exists is_default boolean not null default false;

with first_books as (
  select distinct on (user_id) id
  from nutriai.cookbooks
  order by user_id, created_at, id
)
update nutriai.cookbooks as cookbook
set is_default = true
from first_books
where cookbook.id = first_books.id
  and not exists (
    select 1 from nutriai.cookbooks existing
    where existing.user_id = cookbook.user_id and existing.is_default
  );

create unique index if not exists cookbooks_one_default_per_user_idx
  on nutriai.cookbooks (user_id)
  where is_default;

create or replace function nutriai.keep_one_default_cookbook()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.is_default then
    update nutriai.cookbooks
    set is_default = false
    where user_id = new.user_id and id <> new.id and is_default;
  elsif tg_op = 'INSERT' and not exists (
    select 1 from nutriai.cookbooks
    where user_id = new.user_id and is_default
  ) then
    new.is_default := true;
  end if;
  return new;
end;
$$;

drop trigger if exists cookbooks_keep_one_default on nutriai.cookbooks;
create trigger cookbooks_keep_one_default
  before insert or update of is_default on nutriai.cookbooks
  for each row execute function nutriai.keep_one_default_cookbook();

create or replace function nutriai.replace_deleted_default_cookbook()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.is_default then
    update nutriai.cookbooks
    set is_default = true
    where id = (
      select id from nutriai.cookbooks
      where user_id = old.user_id
      order by created_at, id
      limit 1
    );
  end if;
  return old;
end;
$$;

drop trigger if exists cookbooks_replace_deleted_default on nutriai.cookbooks;
create trigger cookbooks_replace_deleted_default
  after delete on nutriai.cookbooks
  for each row execute function nutriai.replace_deleted_default_cookbook();

alter table nutriai.cookbook_pages
  add column if not exists style_revision integer not null default 1
    check (style_revision > 0);

-- Migrate the review-era lifecycle before installing the smaller state model.
drop trigger if exists recipe_captures_enforce_transition on nutriai.recipe_captures;
alter table nutriai.recipe_captures
  drop constraint if exists recipe_captures_status_check;
alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_lifecycle_status_check;

update nutriai.cookbook_pages as page
set lifecycle_status = 'approved'
from nutriai.recipe_captures as capture
where page.id = capture.pending_page_id
  and capture.status = 'ready_to_review'
  and capture.art_status = 'ready';

update nutriai.recipe_captures
set status = case
  when status = 'added' then 'ready'
  when status = 'needs_help' then 'needs_attention'
  when status = 'ready_to_review' and destination_cookbook_id is null then 'needs_destination'
  when status = 'ready_to_review' and art_status = 'ready' then 'ready'
  when status = 'ready_to_review' and art_status = 'failed' then 'needs_attention'
  else 'processing'
end;

update nutriai.cookbook_pages
set lifecycle_status = 'processing'
where lifecycle_status = 'pending_review';

alter table nutriai.recipe_captures
  add constraint recipe_captures_status_check
  check (status in ('processing', 'needs_destination', 'ready', 'needs_attention'));

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_lifecycle_status_check
  check (lifecycle_status in ('processing', 'approved'));

drop index if exists nutriai.recipe_captures_stale_reading_idx;
create index if not exists recipe_captures_stale_processing_idx
  on nutriai.recipe_captures (processing_started_at)
  where status = 'processing';

create or replace function nutriai.enforce_recipe_capture_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then return new; end if;
  if not (
    (old.status = 'processing' and new.status in ('needs_destination', 'ready', 'needs_attention'))
    or (old.status = 'needs_destination' and new.status = 'processing')
    or (old.status = 'needs_attention' and new.status = 'processing')
  ) then
    raise exception 'Invalid recipe capture transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger recipe_captures_enforce_transition
  before update of status on nutriai.recipe_captures
  for each row execute function nutriai.enforce_recipe_capture_transition();

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
  resolved_destination uuid := p_destination_cookbook_id;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
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

  if resolved_destination is not null and not exists (
    select 1 from nutriai.cookbooks
    where id = resolved_destination and user_id = caller_id
  ) then
    raise exception 'Destination cookbook not found' using errcode = 'P0002';
  end if;

  if resolved_destination is null then
    select id into resolved_destination
    from nutriai.cookbooks
    where user_id = caller_id and is_default
    order by created_at, id
    limit 1;
  end if;

  if resolved_destination is null and (
    select count(*) from nutriai.cookbooks where user_id = caller_id
  ) = 1 then
    select id into resolved_destination
    from nutriai.cookbooks
    where user_id = caller_id
    limit 1;
  end if;

  insert into nutriai.recipe_captures (
    user_id, destination_cookbook_id, source_type, source_payload,
    source_storage_path, status, idempotency_key
  ) values (
    caller_id, resolved_destination, p_source_type,
    coalesce(p_source_payload, '{}'::jsonb), p_source_storage_path,
    'processing', p_idempotency_key
  ) on conflict (user_id, idempotency_key) do nothing;

  select * into capture
  from nutriai.recipe_captures
  where user_id = caller_id and idempotency_key = p_idempotency_key;

  if capture.source_type <> p_source_type
    or capture.source_payload is distinct from coalesce(p_source_payload, '{}'::jsonb)
    or capture.source_storage_path is distinct from p_source_storage_path
    or (p_destination_cookbook_id is not null
      and capture.destination_cookbook_id is distinct from p_destination_cookbook_id) then
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
declare capture nutriai.recipe_captures;
begin
  select * into capture from nutriai.recipe_captures
  where id = p_capture_id and user_id = p_user_id for update;
  if not found then raise exception 'Recipe capture not found' using errcode = 'P0002'; end if;
  if capture.status in ('ready', 'needs_destination') then
    return jsonb_build_object('claimed', false, 'capture', to_jsonb(capture));
  end if;
  if capture.status = 'processing'
    and capture.processing_started_at >= now() - interval '10 minutes' then
    return jsonb_build_object('claimed', false, 'capture', to_jsonb(capture));
  end if;
  if capture.status = 'needs_attention' then
    update nutriai.recipe_captures set status = 'processing' where id = capture.id;
  end if;
  update nutriai.recipe_captures
  set processing_started_at = now(), processing_attempt = processing_attempt + 1,
      failure_code = null, failure_message = null, art_warning = null
  where id = capture.id returning * into capture;
  return jsonb_build_object('claimed', true, 'capture', to_jsonb(capture));
end;
$$;

create or replace function nutriai.create_capture_page(
  p_user_id uuid,
  p_capture_id uuid,
  p_recipe_graph jsonb,
  p_style_id text,
  p_style_revision integer,
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
  where id = p_capture_id and user_id = p_user_id for update;
  if not found or capture.destination_cookbook_id is null then
    raise exception 'Capture destination not found' using errcode = 'P0002';
  end if;
  if capture.pending_page_id is not null then return capture.pending_page_id; end if;
  if capture.status <> 'processing' then
    raise exception 'Capture is not processing' using errcode = '55000';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(capture.destination_cookbook_id::text, 0));
  select coalesce(max(sort_order), -1) + 1, coalesce(max(page_number), 0) + 1
  into next_sort, next_page
  from nutriai.cookbook_pages where cookbook_id = capture.destination_cookbook_id;

  insert into nutriai.recipes (
    user_id, title, description, servings, prep_time, cook_time,
    ingredients, steps, source_type, source_url, tags, category, confidence
  ) values (
    p_user_id, coalesce(nullif(p_recipe_graph ->> 'title', ''), 'Untitled Recipe'),
    p_recipe_graph ->> 'description', nullif(p_recipe_graph ->> 'servings', '')::integer,
    nullif(p_recipe_graph ->> 'prepTimeMinutes', '')::integer,
    nullif(p_recipe_graph ->> 'cookTimeMinutes', '')::integer,
    coalesce(p_recipe_graph -> 'ingredientGroups', '[]'::jsonb),
    coalesce(p_recipe_graph -> 'stepGroups', '[]'::jsonb), capture.source_type,
    capture.source_payload ->> 'input', coalesce(p_recipe_graph -> 'tags', '[]'::jsonb),
    p_recipe_graph ->> 'category', capture.confidence
  ) returning id into recipe_id;

  insert into nutriai.cookbook_pages (
    cookbook_id, recipe_id, page_number, section, sort_order, recipe_graph,
    style_id, style_revision, template_id, lifecycle_status, capture_id
  ) values (
    capture.destination_cookbook_id, recipe_id, next_page,
    p_recipe_graph ->> 'category', next_sort, p_recipe_graph,
    p_style_id, p_style_revision, p_template_id, 'processing', capture.id
  ) returning id into page_id;

  update nutriai.recipe_captures
  set pending_page_id = page_id, art_status = 'generating'
  where id = capture.id;
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
  select * into capture
  from nutriai.recipe_captures
  where id = p_capture_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'Recipe capture not found' using errcode = 'P0002';
  end if;

  -- Page generation may finish before the extraction worker records its final
  -- metadata. Treat that race as an idempotent success instead of turning a
  -- completed page back into a failure.
  if capture.status in ('ready', 'needs_attention') then
    update nutriai.recipe_captures
    set recipe_graph = p_recipe_graph,
        confidence = p_confidence,
        extraction_notes = coalesce(p_extraction_notes, '[]'::jsonb),
        inferred_fields = coalesce(p_inferred_fields, '[]'::jsonb)
    where id = capture.id
    returning * into capture;
    return capture;
  end if;

  update nutriai.recipe_captures
  set status = case
        when destination_cookbook_id is null then 'needs_destination'
        when p_art_status = 'ready' and pending_page_id is not null then 'ready'
        else 'processing'
      end,
      recipe_graph = p_recipe_graph, confidence = p_confidence,
      extraction_notes = coalesce(p_extraction_notes, '[]'::jsonb),
      inferred_fields = coalesce(p_inferred_fields, '[]'::jsonb),
      art_status = p_art_status, art_warning = p_art_warning,
      processing_started_at = case
        when destination_cookbook_id is null or p_art_status = 'ready' then null
        else coalesce(processing_started_at, now())
      end,
      failure_code = null, failure_message = null
  where id = p_capture_id and user_id = p_user_id and status = 'processing'
  returning * into capture;
  if not found then raise exception 'Recipe capture cannot be completed' using errcode = '55000'; end if;

  if capture.status = 'ready' then
    update nutriai.cookbook_pages
    set lifecycle_status = 'approved'
    where id = capture.pending_page_id and capture_id = capture.id;
  end if;
  return capture;
end;
$$;

create or replace function nutriai.set_recipe_capture_destination(
  p_capture_id uuid,
  p_destination_cookbook_id uuid
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
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not exists (
    select 1 from nutriai.cookbooks
    where id = p_destination_cookbook_id and user_id = caller_id
  ) then raise exception 'Destination cookbook not found' using errcode = 'P0002'; end if;
  update nutriai.recipe_captures
  set destination_cookbook_id = p_destination_cookbook_id,
      status = 'processing', art_status = 'generating', art_warning = null,
      processing_started_at = now()
  where id = p_capture_id and user_id = caller_id and status = 'needs_destination'
  returning * into capture;
  if not found then raise exception 'Capture does not need a destination' using errcode = '55000'; end if;
  return capture;
end;
$$;

create or replace function nutriai.finalize_recipe_capture_page(
  p_user_id uuid,
  p_page_id uuid
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare capture nutriai.recipe_captures;
begin
  select * into capture from nutriai.recipe_captures
  where user_id = p_user_id and pending_page_id = p_page_id for update;
  if not found then
    -- Agent-created copies and explicit page revisions use the same generator
    -- without creating an import capture. Publish those pages after ownership
    -- is verified through their cookbook.
    update nutriai.cookbook_pages as page
    set lifecycle_status = 'approved'
    from nutriai.cookbooks as cookbook
    where page.id = p_page_id
      and cookbook.id = page.cookbook_id
      and cookbook.user_id = p_user_id;
    return null;
  end if;
  if capture.status = 'ready' then return capture; end if;
  update nutriai.cookbook_pages
  set lifecycle_status = 'approved'
  where id = p_page_id and capture_id = capture.id;
  update nutriai.recipe_captures
  set status = 'ready', art_status = 'ready', art_warning = null,
      processing_started_at = null, failure_code = null, failure_message = null
  where id = capture.id and status = 'processing'
  returning * into capture;
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
  set status = 'needs_attention', processing_started_at = null,
      art_status = case when pending_page_id is null then art_status else 'failed' end,
      failure_code = left(coalesce(p_failure_code, 'processing_failed'), 80),
      failure_message = left(coalesce(p_failure_message, 'Recipe processing failed'), 1000)
  where id = p_capture_id and user_id = p_user_id and status = 'processing'
  returning * into capture;
  if not found then
    select * into capture from nutriai.recipe_captures
    where id = p_capture_id and user_id = p_user_id;
  end if;
  return capture;
end;
$$;

create or replace function nutriai.fail_recipe_capture_page(
  p_user_id uuid,
  p_page_id uuid,
  p_failure_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update nutriai.recipe_captures
  set status = 'needs_attention', art_status = 'failed',
      art_warning = left(p_failure_message, 1000),
      failure_code = 'page_generation_failed',
      failure_message = left(p_failure_message, 1000),
      processing_started_at = null
  where user_id = p_user_id and pending_page_id = p_page_id and status = 'processing';
end;
$$;

drop function if exists nutriai.approve_recipe_capture(uuid);
drop function if exists nutriai.update_recipe_capture_draft(uuid, jsonb);
drop function if exists nutriai.create_capture_pending_page(uuid, uuid, jsonb, text, text);

revoke all on function nutriai.create_capture_page(uuid, uuid, jsonb, text, integer, text)
  from public, anon, authenticated;
revoke all on function nutriai.finalize_recipe_capture_page(uuid, uuid)
  from public, anon, authenticated;
revoke all on function nutriai.fail_recipe_capture_page(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function nutriai.create_capture_page(uuid, uuid, jsonb, text, integer, text)
  to service_role;
grant execute on function nutriai.finalize_recipe_capture_page(uuid, uuid)
  to service_role;
grant execute on function nutriai.fail_recipe_capture_page(uuid, uuid, text)
  to service_role;

revoke all on function nutriai.set_recipe_capture_destination(uuid, uuid) from public, anon;
grant execute on function nutriai.set_recipe_capture_destination(uuid, uuid) to authenticated;
