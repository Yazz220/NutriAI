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
      art_status = case when art_status = 'not_started' then 'generating' else art_status end,
      art_warning = null
  where id = p_capture_id and user_id = caller_id
    and status = 'ready_to_review'
    and (destination_cookbook_id is null or destination_cookbook_id = p_destination_cookbook_id)
  returning * into capture;

  if not found then raise exception 'Capture cannot change destination' using errcode = '55000'; end if;
  return capture;
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
  if capture.status not in ('reading', 'ready_to_review') then
    raise exception 'Capture is not ready to prepare a page' using errcode = '55000';
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

create or replace function nutriai.update_recipe_capture_draft(
  p_capture_id uuid,
  p_recipe_graph jsonb
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
  if nullif(p_recipe_graph ->> 'title', '') is null then
    raise exception 'Recipe title is required' using errcode = '22023';
  end if;

  update nutriai.recipe_captures
  set recipe_graph = p_recipe_graph
  where id = p_capture_id and user_id = caller_id and status = 'ready_to_review'
  returning * into capture;
  if not found then raise exception 'Capture is not editable' using errcode = '55000'; end if;

  if capture.pending_page_id is not null then
    update nutriai.cookbook_pages
    set recipe_graph = p_recipe_graph, section = p_recipe_graph ->> 'category'
    where id = capture.pending_page_id and capture_id = capture.id;
    update nutriai.recipes
    set title = p_recipe_graph ->> 'title', description = p_recipe_graph ->> 'description',
        servings = nullif(p_recipe_graph ->> 'servings', '')::integer,
        prep_time = nullif(p_recipe_graph ->> 'prepTimeMinutes', '')::integer,
        cook_time = nullif(p_recipe_graph ->> 'cookTimeMinutes', '')::integer,
        tags = coalesce(p_recipe_graph -> 'tags', '[]'::jsonb),
        category = p_recipe_graph ->> 'category'
    where id = (select recipe_id from nutriai.cookbook_pages where id = capture.pending_page_id);
  end if;
  return capture;
end;
$$;

create or replace function nutriai.approve_recipe_capture(p_capture_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  capture nutriai.recipe_captures;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into capture from nutriai.recipe_captures
  where id = p_capture_id and user_id = caller_id for update;
  if not found then raise exception 'Recipe capture not found' using errcode = 'P0002'; end if;
  if capture.status = 'added' then
    return jsonb_build_object('captureId', capture.id, 'cookbookId', capture.destination_cookbook_id, 'pageId', capture.pending_page_id, 'alreadyApproved', true);
  end if;
  if capture.status <> 'ready_to_review'
    or capture.destination_cookbook_id is null
    or capture.pending_page_id is null then
    raise exception 'Recipe capture is not ready for approval' using errcode = '55000';
  end if;
  if capture.art_status in ('not_started', 'generating') then
    raise exception 'Recipe artwork is still being prepared' using errcode = '55000';
  end if;

  update nutriai.cookbook_pages set lifecycle_status = 'approved'
  where id = capture.pending_page_id and capture_id = capture.id;
  if not found then raise exception 'Pending cookbook page not found' using errcode = 'P0002'; end if;
  update nutriai.recipe_captures set status = 'added' where id = capture.id returning * into capture;

  return jsonb_build_object('captureId', capture.id, 'cookbookId', capture.destination_cookbook_id, 'pageId', capture.pending_page_id, 'alreadyApproved', false);
end;
$$;

revoke all on function nutriai.set_recipe_capture_destination(uuid, uuid) from public, anon;
revoke all on function nutriai.update_recipe_capture_draft(uuid, jsonb) from public, anon;
revoke all on function nutriai.approve_recipe_capture(uuid) from public, anon;
grant execute on function nutriai.set_recipe_capture_destination(uuid, uuid) to authenticated;
grant execute on function nutriai.update_recipe_capture_draft(uuid, jsonb) to authenticated;
grant execute on function nutriai.approve_recipe_capture(uuid) to authenticated;

revoke all on function nutriai.create_capture_pending_page(uuid, uuid, jsonb, text, text)
  from public, anon, authenticated;
grant execute on function nutriai.create_capture_pending_page(uuid, uuid, jsonb, text, text)
  to service_role;
