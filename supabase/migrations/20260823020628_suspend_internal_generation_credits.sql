-- Internal generation credits were introduced before the current cookbook
-- product model. Keep the historical ledger intact, but do not require a
-- reservation in the active page-generation completion path.

alter table nutriai.page_versions
  alter column credit_cost set default 0;

comment on column nutriai.page_versions.credit_cost is
  'Legacy internal-credit metadata. New generations use 0 while credit enforcement is suspended.';

comment on table nutriai.credit_ledger is
  'Historical internal generation-credit ledger. Preserved for audit; not enforced by the active page-generation pipeline.';

comment on function nutriai.reserve_generation_credit(uuid, uuid) is
  'Legacy reservation RPC retained for historical compatibility. The active page-generation pipeline does not call it.';

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

  -- Requests created before credit enforcement was suspended may already have
  -- a spend row. Link it when present, but never require one for completion.
  update nutriai.credit_ledger
  set related_page_version_id = p_version_id
  where generation_request_id = p_generation_request_id
    and event_type = 'generation_spend';

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
