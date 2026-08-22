create or replace function nutriai.complete_art_generation_request(
  p_user_id uuid,
  p_generation_request_id uuid,
  p_version_id uuid,
  p_response_payload jsonb,
  p_select_version boolean default false
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
    error_message = null
  where id = p_generation_request_id;

  return p_response_payload;
end;
$$;

revoke all on function nutriai.complete_art_generation_request(uuid, uuid, uuid, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function nutriai.complete_art_generation_request(uuid, uuid, uuid, jsonb, boolean)
  to service_role;

create or replace function nutriai.select_page_art_version(
  p_page_id uuid,
  p_version_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update nutriai.cookbook_pages as page
  set selected_version_id = p_version_id
  where page.id = p_page_id
    and exists (
      select 1
      from nutriai.page_versions as version
      where version.id = p_version_id
        and version.page_id = page.id
    )
    and exists (
      select 1
      from nutriai.cookbooks as cookbook
      where cookbook.id = page.cookbook_id
        and cookbook.user_id = (select auth.uid())
    );

  return found;
end;
$$;

revoke all on function nutriai.select_page_art_version(uuid, uuid)
  from public, anon;
grant execute on function nutriai.select_page_art_version(uuid, uuid)
  to authenticated;
