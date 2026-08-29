alter table nutriai.collection_mutation_requests
  drop constraint if exists collection_mutation_requests_action_check;

alter table nutriai.collection_mutation_requests
  add constraint collection_mutation_requests_action_check
  check (action in ('move', 'copy', 'reorder'));

create or replace function nutriai.reorder_cookbook_page(
  p_cookbook_id uuid,
  p_page_id uuid,
  p_before_page_id uuid,
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
  inserted_request_id uuid;
  ordered_page_ids uuid[];
  reordered_page_ids uuid[];
  target_index integer;
  final_index integer;
  changed boolean;
  result jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_cookbook_id is null or p_page_id is null then
    raise exception 'Cookbook and page are required' using errcode = '22023';
  end if;
  if length(p_idempotency_key) < 16
    or length(p_idempotency_key) > 160
    or p_idempotency_key !~ '^[A-Za-z0-9._:-]+$' then
    raise exception 'Invalid page order idempotency key' using errcode = '22023';
  end if;

  request_payload := jsonb_build_object(
    'cookbookId', p_cookbook_id,
    'pageId', p_page_id,
    'beforePageId', p_before_page_id
  );

  select * into existing_request
  from nutriai.collection_mutation_requests
  where user_id = caller_id and idempotency_key = p_idempotency_key;

  if found then
    if existing_request.request_payload <> request_payload then
      raise exception 'Page order idempotency key was reused with different input'
        using errcode = '22023';
    end if;
    if existing_request.response_payload is null then
      raise exception 'Page order change is still processing' using errcode = '55000';
    end if;
    return existing_request.response_payload;
  end if;

  insert into nutriai.collection_mutation_requests (
    user_id, idempotency_key, action, request_payload
  ) values (
    caller_id, p_idempotency_key, 'reorder', request_payload
  )
  on conflict (user_id, idempotency_key) do nothing
  returning id into inserted_request_id;

  if inserted_request_id is null then
    select * into existing_request
    from nutriai.collection_mutation_requests
    where user_id = caller_id and idempotency_key = p_idempotency_key;

    if existing_request.request_payload <> request_payload then
      raise exception 'Page order idempotency key was reused with different input'
        using errcode = '22023';
    end if;
    if existing_request.response_payload is null then
      raise exception 'Page order change is still processing' using errcode = '55000';
    end if;
    return existing_request.response_payload;
  end if;

  perform cookbook.id
  from nutriai.cookbooks as cookbook
  where cookbook.id = p_cookbook_id and cookbook.user_id = caller_id
  for update;

  if not found then
    raise exception 'Cookbook not found' using errcode = 'P0002';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_cookbook_id::text, 0));

  select array_agg(page.id order by page.sort_order, page.page_number, page.id)
    into ordered_page_ids
  from nutriai.cookbook_pages as page
  where page.cookbook_id = p_cookbook_id;

  if array_position(ordered_page_ids, p_page_id) is null then
    raise exception 'Recipe page not found' using errcode = 'P0002';
  end if;
  if p_before_page_id is not null
    and p_before_page_id <> p_page_id
    and array_position(ordered_page_ids, p_before_page_id) is null then
    raise exception 'Target recipe page not found' using errcode = 'P0002';
  end if;

  reordered_page_ids := array_remove(ordered_page_ids, p_page_id);

  if p_before_page_id is null then
    reordered_page_ids := array_append(reordered_page_ids, p_page_id);
  elsif p_before_page_id = p_page_id then
    reordered_page_ids := ordered_page_ids;
  else
    target_index := array_position(reordered_page_ids, p_before_page_id);
    final_index := coalesce(array_length(reordered_page_ids, 1), 0);

    if target_index = 1 then
      reordered_page_ids := array[p_page_id] || reordered_page_ids;
    elsif target_index > final_index then
      reordered_page_ids := array_append(reordered_page_ids, p_page_id);
    else
      reordered_page_ids := reordered_page_ids[1:target_index - 1]
        || array[p_page_id]
        || reordered_page_ids[target_index:final_index];
    end if;
  end if;

  changed := ordered_page_ids <> reordered_page_ids;

  if changed then
    with desired as (
      select page_id, ordinality::integer as page_number
      from unnest(reordered_page_ids) with ordinality as ordered(page_id, ordinality)
    )
    update nutriai.cookbook_pages as page
    set
      page_number = -desired.page_number,
      sort_order = desired.page_number - 1
    from desired
    where page.id = desired.page_id and page.cookbook_id = p_cookbook_id;

    with desired as (
      select page_id, ordinality::integer as page_number
      from unnest(reordered_page_ids) with ordinality as ordered(page_id, ordinality)
    )
    update nutriai.cookbook_pages as page
    set page_number = desired.page_number
    from desired
    where page.id = desired.page_id and page.cookbook_id = p_cookbook_id;

    update nutriai.cookbooks
    set updated_at = now()
    where id = p_cookbook_id and user_id = caller_id;
  end if;

  result := jsonb_build_object(
    'cookbookId', p_cookbook_id,
    'pageId', p_page_id,
    'beforePageId', p_before_page_id,
    'orderedPageIds', to_jsonb(reordered_page_ids),
    'changed', changed
  );

  update nutriai.collection_mutation_requests
  set response_payload = result
  where id = inserted_request_id and user_id = caller_id;

  return result;
end;
$$;

revoke all on function nutriai.reorder_cookbook_page(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function nutriai.reorder_cookbook_page(uuid, uuid, uuid, text)
  to authenticated, service_role;
