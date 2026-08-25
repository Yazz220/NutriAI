create table if not exists nutriai.collection_mutation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key text not null,
  action text not null check (action in ('move', 'copy')),
  request_payload jsonb not null,
  response_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index if not exists collection_mutation_requests_user_created_idx
  on nutriai.collection_mutation_requests (user_id, created_at desc);

drop trigger if exists collection_mutation_requests_set_updated_at
  on nutriai.collection_mutation_requests;
create trigger collection_mutation_requests_set_updated_at
  before update on nutriai.collection_mutation_requests
  for each row execute function nutriai.set_updated_at();

alter table nutriai.collection_mutation_requests enable row level security;

revoke all on table nutriai.collection_mutation_requests from public, anon, authenticated;
grant select, insert, update, delete on nutriai.collection_mutation_requests to service_role;

create or replace function nutriai.organize_recipe_page(
  p_action text,
  p_page_id uuid,
  p_destination_cookbook_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  request_payload jsonb;
  existing_request nutriai.collection_mutation_requests;
  source_page nutriai.cookbook_pages;
  source_cookbook_title text;
  destination_title text;
  destination_page_number integer;
  destination_sort_order integer;
  copied_recipe_id uuid;
  result_page_id uuid;
  copied_version_id uuid;
  result jsonb;
  owned_cookbook_count integer;
  inserted_request_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_action not in ('move', 'copy') then
    raise exception 'Unsupported collection action' using errcode = '22023';
  end if;
  if p_page_id is null or p_destination_cookbook_id is null then
    raise exception 'Recipe page and destination cookbook are required' using errcode = '22023';
  end if;
  if length(p_idempotency_key) < 16
    or length(p_idempotency_key) > 160
    or p_idempotency_key !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'Invalid collection action idempotency key' using errcode = '22023';
  end if;

  request_payload := jsonb_build_object(
    'action', p_action,
    'pageId', p_page_id,
    'destinationCookbookId', p_destination_cookbook_id
  );

  select * into existing_request
  from nutriai.collection_mutation_requests
  where user_id = caller_id and idempotency_key = p_idempotency_key;

  if found then
    if existing_request.request_payload <> request_payload then
      raise exception 'Collection action idempotency key was reused with different input'
        using errcode = '22023';
    end if;
    if existing_request.response_payload is null then
      raise exception 'Collection action is still processing' using errcode = '55000';
    end if;
    return existing_request.response_payload;
  end if;

  insert into nutriai.collection_mutation_requests (
    user_id, idempotency_key, action, request_payload
  ) values (
    caller_id, p_idempotency_key, p_action, request_payload
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into inserted_request_id;

  if inserted_request_id is null then
    select * into existing_request
    from nutriai.collection_mutation_requests
    where user_id = caller_id and idempotency_key = p_idempotency_key;

    if existing_request.request_payload <> request_payload then
      raise exception 'Collection action idempotency key was reused with different input'
        using errcode = '22023';
    end if;
    if existing_request.response_payload is null then
      raise exception 'Collection action is still processing' using errcode = '55000';
    end if;
    return existing_request.response_payload;
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
    raise exception 'Approved recipe page not found' using errcode = 'P0002';
  end if;

  select title into source_cookbook_title
  from nutriai.cookbooks
  where id = source_page.cookbook_id and user_id = caller_id;

  perform cookbook.id
  from nutriai.cookbooks as cookbook
  where cookbook.id in (source_page.cookbook_id, p_destination_cookbook_id)
    and cookbook.user_id = caller_id
  order by cookbook.id
  for update;
  get diagnostics owned_cookbook_count = row_count;

  if owned_cookbook_count <> (
    case
      when source_page.cookbook_id = p_destination_cookbook_id then 1
      else 2
    end
  ) then
    raise exception 'Destination cookbook not found' using errcode = 'P0002';
  end if;

  select title into destination_title
  from nutriai.cookbooks
  where id = p_destination_cookbook_id and user_id = caller_id;

  select
    coalesce(max(page_number), 0) + 1,
    coalesce(max(sort_order), -1) + 1
    into destination_page_number, destination_sort_order
  from nutriai.cookbook_pages
  where cookbook_id = p_destination_cookbook_id;

  if p_action = 'move' then
    if source_page.cookbook_id <> p_destination_cookbook_id then
      update nutriai.cookbook_pages
      set
        cookbook_id = p_destination_cookbook_id,
        page_number = destination_page_number,
        sort_order = destination_sort_order
      where id = source_page.id;
    end if;
    result_page_id := source_page.id;
  else
    insert into nutriai.recipes (
      user_id, title, description, servings, prep_time, cook_time,
      ingredients, steps, source_type, source_url, tags, category, confidence
    )
    select
      caller_id, recipe.title, recipe.description, recipe.servings,
      recipe.prep_time, recipe.cook_time, recipe.ingredients, recipe.steps,
      recipe.source_type, recipe.source_url, recipe.tags, recipe.category,
      recipe.confidence
    from nutriai.recipes as recipe
    where recipe.id = source_page.recipe_id and recipe.user_id = caller_id
    returning id into copied_recipe_id;

    if copied_recipe_id is null then
      raise exception 'Recipe data not found' using errcode = 'P0002';
    end if;

    insert into nutriai.cookbook_pages (
      cookbook_id, recipe_id, page_number, section, sort_order,
      recipe_graph, style_id, template_id, lifecycle_status
    ) values (
      p_destination_cookbook_id, copied_recipe_id, destination_page_number,
      source_page.section, destination_sort_order, source_page.recipe_graph,
      source_page.style_id, source_page.template_id, 'approved'
    )
    returning id into result_page_id;

    if source_page.selected_version_id is not null then
      insert into nutriai.page_versions (
        page_id, image_url, storage_path, prompt_payload, model,
        status, credit_cost, error_message
      )
      select
        result_page_id, version.image_url, version.storage_path,
        version.prompt_payload, version.model, version.status, 0,
        version.error_message
      from nutriai.page_versions as version
      where version.id = source_page.selected_version_id
        and version.page_id = source_page.id
      returning id into copied_version_id;

      if copied_version_id is not null then
        update nutriai.cookbook_pages
        set selected_version_id = copied_version_id
        where id = result_page_id;
      end if;
    end if;
  end if;

  update nutriai.cookbooks
  set updated_at = now()
  where id in (source_page.cookbook_id, p_destination_cookbook_id)
    and user_id = caller_id;

  result := jsonb_build_object(
    'action', p_action,
    'sourcePageId', source_page.id,
    'sourceCookbookId', source_page.cookbook_id,
    'sourceCookbookTitle', source_cookbook_title,
    'destinationCookbookId', p_destination_cookbook_id,
    'destinationCookbookTitle', destination_title,
    'resultPageId', result_page_id,
    'changed', p_action = 'copy' or source_page.cookbook_id <> p_destination_cookbook_id
  );

  update nutriai.collection_mutation_requests
  set response_payload = result
  where id = inserted_request_id and user_id = caller_id;

  return result;
end;
$$;

revoke all on function nutriai.organize_recipe_page(text, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function nutriai.organize_recipe_page(text, uuid, uuid, text)
  to authenticated;
