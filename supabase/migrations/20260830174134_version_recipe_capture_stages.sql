alter table nutriai.recipe_captures
  add column if not exists stage_checkpoints jsonb not null default '{}'::jsonb,
  add column if not exists failed_stage text;

alter table nutriai.recipe_captures
  drop constraint if exists recipe_captures_stage_checkpoints_object_check,
  add constraint recipe_captures_stage_checkpoints_object_check
    check (jsonb_typeof(stage_checkpoints) = 'object'),
  drop constraint if exists recipe_captures_failed_stage_check,
  add constraint recipe_captures_failed_stage_check
    check (
      failed_stage is null
      or failed_stage in (
        'source', 'transcription', 'extraction', 'normalization', 'quality',
        'destination', 'page_generation', 'publication'
      )
    );

update nutriai.recipe_captures as capture
set stage_checkpoints =
  jsonb_build_object(
    'source', jsonb_build_object(
      'version', case
        when capture.source_type = 'audio'
          and nullif(capture.source_payload #>> '{transcription,sourceAdapterVersion}', '') is not null
        then capture.source_payload #>> '{transcription,sourceAdapterVersion}'
        else 'legacy-unversioned'
      end,
      'completedAt', capture.created_at,
      'sourceType', capture.source_type
    )
  )
  || case
    when jsonb_typeof(capture.source_payload -> 'transcription') = 'object'
      and nullif(capture.source_payload #>> '{transcription,transcriptionAdapterVersion}', '') is not null
    then jsonb_build_object(
      'transcription',
      (capture.source_payload -> 'transcription')
      || jsonb_build_object(
        'version', capture.source_payload #>> '{transcription,transcriptionAdapterVersion}',
        'completedAt', coalesce(
          capture.source_payload #> '{transcription,transcribedAt}',
          to_jsonb(capture.updated_at)
        )
      )
    )
    else '{}'::jsonb
  end
  || case
    when capture.recipe_graph is not null then jsonb_build_object(
      'extraction', jsonb_build_object(
        'version', 'legacy-unversioned',
        'completedAt', capture.updated_at
      ),
      'normalization', jsonb_build_object(
        'version', 'legacy-unversioned',
        'completedAt', capture.updated_at
      )
    )
    else '{}'::jsonb
  end
  || case
    when coalesce(capture.recipe_graph #>> '{provenance,qualityAssessment,version}', '') ~ '^[0-9]+$'
    then jsonb_build_object(
      'quality', jsonb_build_object(
        'version', 'recipe-quality-v' || (capture.recipe_graph #>> '{provenance,qualityAssessment,version}'),
        'completedAt', capture.updated_at,
        'decision', capture.recipe_graph #>> '{provenance,qualityAssessment,decision}'
      )
    )
    else '{}'::jsonb
  end
  || case
    when capture.art_status = 'ready' and capture.pending_page_id is not null
    then jsonb_build_object(
      'page_generation', jsonb_build_object(
        'version', 'legacy-unversioned',
        'completedAt', capture.updated_at,
        'pageId', capture.pending_page_id
      )
    )
    else '{}'::jsonb
  end
  || case
    when capture.status = 'ready' and capture.pending_page_id is not null
    then jsonb_build_object(
      'publication', jsonb_build_object(
        'version', 'legacy-unversioned',
        'completedAt', capture.updated_at,
        'pageId', capture.pending_page_id
      )
    )
    else '{}'::jsonb
  end
where capture.stage_checkpoints = '{}'::jsonb;

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
begin
  if p_stage not in (
    'source', 'transcription', 'extraction', 'normalization', 'quality',
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

  update nutriai.recipe_captures
  set stage_checkpoints = coalesce(stage_checkpoints, '{}'::jsonb)
      || jsonb_build_object(
        p_stage,
        p_metadata || jsonb_build_object(
          'version', btrim(p_version),
          'completedAt', now()
        )
      )
  where id = p_capture_id and user_id = p_user_id
  returning * into capture;

  if not found then
    raise exception 'Recipe capture not found' using errcode = 'P0002';
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
      failure_code = null, failure_message = null, failed_stage = null,
      art_warning = null
  where id = capture.id returning * into capture;
  return jsonb_build_object('claimed', true, 'capture', to_jsonb(capture));
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
    'source', 'transcription', 'extraction', 'normalization', 'quality',
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

create or replace function nutriai.fail_recipe_capture(
  p_user_id uuid,
  p_capture_id uuid,
  p_failure_code text,
  p_failure_message text
)
returns nutriai.recipe_captures
language sql
security definer
set search_path = ''
as $$
  select nutriai.fail_recipe_capture(
    p_user_id,
    p_capture_id,
    p_failure_code,
    p_failure_message,
    null
  );
$$;

create or replace function nutriai.finalize_recipe_capture_page(
  p_user_id uuid,
  p_page_id uuid,
  p_page_generation_version text,
  p_publication_version text
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare capture nutriai.recipe_captures;
begin
  if nullif(btrim(p_page_generation_version), '') is null
    or nullif(btrim(p_publication_version), '') is null then
    raise exception 'Recipe capture publication versions are required' using errcode = '22023';
  end if;

  select * into capture from nutriai.recipe_captures
  where user_id = p_user_id and pending_page_id = p_page_id for update;
  if not found then
    update nutriai.cookbook_pages as page
    set lifecycle_status = 'approved'
    from nutriai.cookbooks as cookbook
    where page.id = p_page_id
      and cookbook.id = page.cookbook_id
      and cookbook.user_id = p_user_id;
    return null;
  end if;

  update nutriai.cookbook_pages
  set lifecycle_status = 'approved'
  where id = p_page_id and capture_id = capture.id;

  update nutriai.recipe_captures
  set status = 'ready', art_status = 'ready', art_warning = null,
      processing_started_at = null, failure_code = null, failure_message = null,
      failed_stage = null,
      stage_checkpoints = coalesce(stage_checkpoints, '{}'::jsonb)
        || jsonb_build_object(
          'page_generation', jsonb_build_object(
            'version', btrim(p_page_generation_version),
            'completedAt', now(),
            'pageId', p_page_id
          ),
          'publication', jsonb_build_object(
            'version', btrim(p_publication_version),
            'completedAt', now(),
            'pageId', p_page_id
          )
        )
  where id = capture.id and status in ('processing', 'ready')
  returning * into capture;
  return capture;
end;
$$;

create or replace function nutriai.finalize_recipe_capture_page(
  p_user_id uuid,
  p_page_id uuid
)
returns nutriai.recipe_captures
language sql
security definer
set search_path = ''
as $$
  select nutriai.finalize_recipe_capture_page(
    p_user_id,
    p_page_id,
    'legacy-unversioned',
    'legacy-unversioned'
  );
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
      failure_message = 'Nosh understood the recipe, but could not finish its cookbook page. Try again.',
      failed_stage = 'page_generation',
      processing_started_at = null
  where user_id = p_user_id and pending_page_id = p_page_id and status = 'processing';
end;
$$;

create or replace function nutriai.fail_recipe_capture_publication(
  p_user_id uuid,
  p_page_id uuid,
  p_failure_message text,
  p_page_generation_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update nutriai.recipe_captures
  set status = 'needs_attention', art_status = 'ready',
      art_warning = left(p_failure_message, 1000),
      failure_code = 'publication_failed',
      failure_message = left(p_failure_message, 1000),
      failed_stage = 'publication',
      processing_started_at = null,
      stage_checkpoints = coalesce(stage_checkpoints, '{}'::jsonb)
        || jsonb_build_object(
          'page_generation', jsonb_build_object(
            'version', btrim(p_page_generation_version),
            'completedAt', now(),
            'pageId', p_page_id
          )
        )
  where user_id = p_user_id and pending_page_id = p_page_id and status = 'processing';
end;
$$;

revoke all on function nutriai.record_recipe_capture_checkpoint(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function nutriai.fail_recipe_capture(uuid, uuid, text, text, text)
  from public, anon, authenticated;
revoke all on function nutriai.finalize_recipe_capture_page(uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function nutriai.fail_recipe_capture_publication(uuid, uuid, text, text)
  from public, anon, authenticated;

grant execute on function nutriai.record_recipe_capture_checkpoint(uuid, uuid, text, text, jsonb)
  to service_role;
grant execute on function nutriai.fail_recipe_capture(uuid, uuid, text, text, text)
  to service_role;
grant execute on function nutriai.finalize_recipe_capture_page(uuid, uuid, text, text)
  to service_role;
grant execute on function nutriai.fail_recipe_capture_publication(uuid, uuid, text, text)
  to service_role;
