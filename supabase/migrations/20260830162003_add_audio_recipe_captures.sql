update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'audio/aac', 'audio/aiff', 'audio/flac', 'audio/m4a', 'audio/mp4',
      'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/wave',
      'audio/x-aac', 'audio/x-aiff', 'audio/x-flac', 'audio/x-m4a', 'audio/x-wav'
    ]
where id = 'recipe-captures';

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'nutriai.recipe_captures'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source_type%'
  loop
    execute format(
      'alter table nutriai.recipe_captures drop constraint %I',
      constraint_row.conname
    );
  end loop;

  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'nutriai.recipes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%source_type%'
  loop
    execute format(
      'alter table nutriai.recipes drop constraint %I',
      constraint_row.conname
    );
  end loop;
end;
$$;

alter table nutriai.recipe_captures
  add constraint recipe_captures_source_type_check
    check (source_type in ('url', 'text', 'image', 'video', 'audio')),
  add constraint recipe_captures_source_storage_type_check
    check (source_storage_path is null or source_type in ('image', 'audio')),
  add constraint recipe_captures_stored_source_path_check
    check (source_type not in ('image', 'audio') or source_storage_path is not null);

alter table nutriai.recipes
  add constraint recipes_source_type_check
    check (source_type in ('url', 'text', 'image', 'video', 'audio'));

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
  if p_source_type not in ('url', 'text', 'image', 'video', 'audio') then
    raise exception 'Invalid source type' using errcode = '22023';
  end if;
  if length(p_idempotency_key) < 16 or length(p_idempotency_key) > 160 then
    raise exception 'Invalid capture idempotency key' using errcode = '22023';
  end if;
  if p_source_type in ('image', 'audio') and p_source_storage_path is null then
    raise exception 'File capture requires a storage path' using errcode = '22023';
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
