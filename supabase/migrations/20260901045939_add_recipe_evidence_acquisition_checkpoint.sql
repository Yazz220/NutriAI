create or replace function nutriai.record_recipe_capture_checkpoint(
  p_user_id uuid,
  p_capture_id uuid,
  p_stage text,
  p_version text,
  p_metadata jsonb default '{}'::jsonb
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare
  capture nutriai.recipe_captures;
  checkpoint_metadata jsonb;
begin
  if p_stage not in (
    'source', 'acquisition', 'transcription', 'extraction', 'normalization', 'quality',
    'page_generation', 'publication'
  ) then
    raise exception 'Invalid recipe capture checkpoint' using errcode = '22023';
  end if;
  if nullif(btrim(p_version), '') is null or length(p_version) > 120 then
    raise exception 'Invalid recipe capture checkpoint version' using errcode = '22023';
  end if;
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object' then
    raise exception 'Recipe capture checkpoint metadata must be an object' using errcode = '22023';
  end if;
  if p_stage = 'acquisition'
    and coalesce(p_metadata ->> 'status', '') not in ('pending', 'ready', 'failed') then
    raise exception 'Recipe acquisition checkpoint requires a valid status' using errcode = '22023';
  end if;

  checkpoint_metadata := p_metadata || jsonb_build_object(
    'version', btrim(p_version),
    'updatedAt', now()
  );
  if not (p_stage = 'acquisition' and p_metadata ->> 'status' = 'pending') then
    checkpoint_metadata := checkpoint_metadata || jsonb_build_object('completedAt', now());
  end if;

  update nutriai.recipe_captures
  set stage_checkpoints = coalesce(stage_checkpoints, '{}'::jsonb)
      || jsonb_build_object(p_stage, checkpoint_metadata)
  where id = p_capture_id and user_id = p_user_id
  returning * into capture;

  if not found then
    raise exception 'Recipe capture not found' using errcode = 'P0002';
  end if;
  return capture;
end;
$$;

create or replace function nutriai.fail_recipe_capture(
  p_user_id uuid,
  p_capture_id uuid,
  p_failure_code text,
  p_failure_message text,
  p_failed_stage text
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare capture nutriai.recipe_captures;
begin
  if p_failed_stage is not null and p_failed_stage not in (
    'source', 'acquisition', 'transcription', 'extraction', 'normalization', 'quality',
    'destination', 'page_generation', 'publication'
  ) then
    raise exception 'Invalid failed recipe capture stage' using errcode = '22023';
  end if;

  update nutriai.recipe_captures
  set status = 'needs_attention', processing_started_at = null,
      art_status = case
        when p_failed_stage = 'publication' then 'ready'
        when pending_page_id is null then art_status
        else 'failed'
      end,
      failure_code = left(coalesce(p_failure_code, 'processing_failed'), 80),
      failure_message = left(coalesce(p_failure_message, 'Recipe processing failed'), 1000),
      failed_stage = p_failed_stage
  where id = p_capture_id and user_id = p_user_id and status = 'processing'
  returning * into capture;
  if not found then
    select * into capture from nutriai.recipe_captures
    where id = p_capture_id and user_id = p_user_id;
  end if;
  return capture;
end;
$$;

revoke all on function nutriai.record_recipe_capture_checkpoint(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function nutriai.fail_recipe_capture(uuid, uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function nutriai.record_recipe_capture_checkpoint(uuid, uuid, text, text, jsonb)
  to service_role;
grant execute on function nutriai.fail_recipe_capture(uuid, uuid, text, text, text)
  to service_role;
