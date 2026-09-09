create or replace function nutriai.discard_recipe_capture(p_capture_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  source_capture nutriai.recipe_captures;
  source_page nutriai.cookbook_pages;
  capture_storage_paths text[] := array[]::text[];
  page_storage_paths text[] := array[]::text[];
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_capture_id is null then
    raise exception 'Recipe capture is required' using errcode = '22023';
  end if;

  select capture.*
    into source_capture
  from nutriai.recipe_captures as capture
  where capture.id = p_capture_id
    and capture.user_id = caller_id
  for update;

  if not found then
    raise exception 'Recipe capture not found' using errcode = 'P0002';
  end if;
  if source_capture.status not in ('needs_attention', 'needs_destination') then
    raise exception 'Only unfinished recipe captures can be removed' using errcode = '55000';
  end if;

  select coalesce(array_agg(distinct candidate.path), array[]::text[])
    into capture_storage_paths
  from (
    select source_capture.source_storage_path as path
    union all
    select frame.path
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(source_capture.source_payload -> 'framePaths') = 'array'
          then source_capture.source_payload -> 'framePaths'
        else '[]'::jsonb
      end
    ) as frame(path)
    union all
    select image.path
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(source_capture.source_payload -> 'additionalImagePaths') = 'array'
          then source_capture.source_payload -> 'additionalImagePaths'
        else '[]'::jsonb
      end
    ) as image(path)
  ) as candidate
  where candidate.path is not null
    and candidate.path like caller_id::text || '/%'
    and candidate.path !~ '(^|/)\.\.(/|$)';

  if source_capture.pending_page_id is not null then
    select page.*
      into source_page
    from nutriai.cookbook_pages as page
    where page.id = source_capture.pending_page_id
      and page.capture_id = source_capture.id
      and page.lifecycle_status = 'processing'
    for update;

    if not found then
      raise exception 'The recipe page can no longer be removed as unfinished work'
        using errcode = '55000';
    end if;

    select coalesce(array_agg(distinct version.storage_path), array[]::text[])
      into page_storage_paths
    from nutriai.page_versions as version
    where version.page_id = source_page.id
      and version.storage_path is not null
      and version.storage_path like caller_id::text || '/%'
      and version.storage_path !~ '(^|/)\.\.(/|$)';

    update nutriai.recipe_captures
    set pending_page_id = null
    where id = source_capture.id and user_id = caller_id;

    delete from nutriai.cookbook_pages
    where id = source_page.id and lifecycle_status = 'processing';

    if not exists (
      select 1 from nutriai.cookbook_pages where recipe_id = source_page.recipe_id
    ) then
      delete from nutriai.recipes
      where id = source_page.recipe_id and user_id = caller_id;
    end if;
  end if;

  delete from nutriai.recipe_captures
  where id = source_capture.id and user_id = caller_id;

  insert into nutriai.storage_cleanup_jobs (user_id, bucket, object_path)
  select caller_id, 'cookbook-pages', path
  from unnest(page_storage_paths) as path
  where not exists (
    select 1 from nutriai.page_versions as version
    where version.storage_path = path
  )
  on conflict (bucket, object_path) do nothing;

  insert into nutriai.storage_cleanup_jobs (user_id, bucket, object_path)
  select caller_id, 'recipe-captures', path
  from unnest(capture_storage_paths) as path
  where not exists (
    select 1
    from nutriai.recipe_captures as capture
    where capture.source_storage_path = path
      or exists (
        select 1
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(capture.source_payload -> 'framePaths') = 'array'
              then capture.source_payload -> 'framePaths'
            else '[]'::jsonb
          end
        ) as frame(existing_path)
        where frame.existing_path = path
      )
      or exists (
        select 1
        from jsonb_array_elements_text(
          case
            when jsonb_typeof(capture.source_payload -> 'additionalImagePaths') = 'array'
              then capture.source_payload -> 'additionalImagePaths'
            else '[]'::jsonb
          end
        ) as image(existing_path)
        where image.existing_path = path
      )
  )
  on conflict (bucket, object_path) do nothing;

  if source_page.id is not null then
    update nutriai.cookbooks
    set updated_at = now()
    where id = source_page.cookbook_id and user_id = caller_id;
  end if;

  return jsonb_build_object(
    'captureId', source_capture.id,
    'cookbookId', source_capture.destination_cookbook_id,
    'pageId', source_page.id
  );
end;
$$;

revoke all on function nutriai.discard_recipe_capture(uuid)
  from public, anon, authenticated;
grant execute on function nutriai.discard_recipe_capture(uuid)
  to authenticated;
