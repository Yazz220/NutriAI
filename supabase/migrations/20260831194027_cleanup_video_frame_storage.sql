create or replace function nutriai.remove_recipe_page(p_page_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  source_page nutriai.cookbook_pages;
  source_cookbook_title text;
  removed_capture_id uuid;
  removed_recipe_id uuid;
  capture_storage_paths text[] := array[]::text[];
  page_storage_paths text[] := array[]::text[];
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_page_id is null then
    raise exception 'Recipe page is required' using errcode = '22023';
  end if;

  select page.*
    into source_page
  from nutriai.cookbook_pages as page
  join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
  where page.id = p_page_id
    and page.lifecycle_status = 'approved'
    and cookbook.user_id = caller_id
  for update of page;

  if not found then
    raise exception 'Recipe page not found' using errcode = 'P0002';
  end if;

  select title into source_cookbook_title
  from nutriai.cookbooks
  where id = source_page.cookbook_id and user_id = caller_id;

  removed_capture_id := source_page.capture_id;
  removed_recipe_id := source_page.recipe_id;

  select coalesce(array_agg(distinct version.storage_path), array[]::text[])
    into page_storage_paths
  from nutriai.page_versions as version
  where version.page_id = source_page.id
    and version.storage_path is not null
    and version.storage_path like caller_id::text || '/%';

  if removed_capture_id is not null then
    select coalesce(array_agg(distinct candidate.path), array[]::text[])
      into capture_storage_paths
    from nutriai.recipe_captures as capture
    cross join lateral (
      select capture.source_storage_path as path
      union all
      select frame.path
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(capture.source_payload -> 'framePaths') = 'array'
            then capture.source_payload -> 'framePaths'
          else '[]'::jsonb
        end
      ) as frame(path)
      union all
      select image.path
      from jsonb_array_elements_text(
        case
          when jsonb_typeof(capture.source_payload -> 'additionalImagePaths') = 'array'
            then capture.source_payload -> 'additionalImagePaths'
          else '[]'::jsonb
        end
      ) as image(path)
    ) as candidate
    where capture.id = removed_capture_id
      and capture.user_id = caller_id
      and candidate.path is not null
      and candidate.path like caller_id::text || '/%'
      and candidate.path !~ '(^|/)\.\.(/|$)';

    delete from nutriai.recipe_captures
    where id = removed_capture_id and user_id = caller_id;
  end if;

  delete from nutriai.cookbook_pages
  where id = source_page.id;

  if not exists (
    select 1 from nutriai.cookbook_pages where recipe_id = removed_recipe_id
  ) then
    delete from nutriai.recipes
    where id = removed_recipe_id and user_id = caller_id;
  end if;

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

  update nutriai.cookbooks
  set updated_at = now()
  where id = source_page.cookbook_id and user_id = caller_id;

  return jsonb_build_object(
    'pageId', source_page.id,
    'cookbookId', source_page.cookbook_id,
    'cookbookTitle', source_cookbook_title,
    'captureId', removed_capture_id,
    'recipeId', removed_recipe_id
  );
end;
$$;

revoke all on function nutriai.remove_recipe_page(uuid)
  from public, anon, authenticated;
grant execute on function nutriai.remove_recipe_page(uuid)
  to authenticated;

create or replace function nutriai.delete_cookbook(p_cookbook_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  source_cookbook nutriai.cookbooks;
  removed_recipe_ids uuid[] := array[]::uuid[];
  page_storage_paths text[] := array[]::text[];
  removed_page_count integer := 0;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_cookbook_id is null then
    raise exception 'Cookbook is required' using errcode = '22023';
  end if;

  select cookbook.*
    into source_cookbook
  from nutriai.cookbooks as cookbook
  where cookbook.id = p_cookbook_id
    and cookbook.user_id = caller_id
  for update;

  if not found then
    raise exception 'Cookbook not found' using errcode = 'P0002';
  end if;

  select
    coalesce(array_agg(distinct page.recipe_id), array[]::uuid[]),
    count(distinct page.id)::integer
    into removed_recipe_ids, removed_page_count
  from nutriai.cookbook_pages as page
  where page.cookbook_id = source_cookbook.id;

  select coalesce(array_agg(distinct version.storage_path), array[]::text[])
    into page_storage_paths
  from nutriai.cookbook_pages as page
  join nutriai.page_versions as version on version.page_id = page.id
  where page.cookbook_id = source_cookbook.id
    and version.storage_path is not null
    and version.storage_path like caller_id::text || '/%';

  delete from nutriai.cookbooks
  where id = source_cookbook.id and user_id = caller_id;

  delete from nutriai.recipes as recipe
  where recipe.user_id = caller_id
    and recipe.id = any(removed_recipe_ids)
    and not exists (
      select 1 from nutriai.cookbook_pages as page
      where page.recipe_id = recipe.id
    );

  insert into nutriai.storage_cleanup_jobs (user_id, bucket, object_path)
  select caller_id, 'cookbook-pages', path
  from unnest(page_storage_paths) as path
  where not exists (
    select 1 from nutriai.page_versions as version
    where version.storage_path = path
  )
  on conflict (bucket, object_path) do nothing;

  return jsonb_build_object(
    'cookbookId', source_cookbook.id,
    'cookbookTitle', source_cookbook.title,
    'pageCount', removed_page_count
  );
end;
$$;

revoke all on function nutriai.delete_cookbook(uuid)
  from public, anon, authenticated;
grant execute on function nutriai.delete_cookbook(uuid)
  to authenticated;
