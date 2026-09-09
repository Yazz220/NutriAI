create or replace function nutriai.persist_recipe_capture_analysis(
  p_user_id uuid,
  p_capture_id uuid,
  p_recipe_graph jsonb,
  p_confidence numeric,
  p_extraction_notes jsonb,
  p_inferred_fields jsonb,
  p_extraction_version text,
  p_extraction_metadata jsonb,
  p_normalization_version text,
  p_normalization_metadata jsonb,
  p_quality_version text,
  p_quality_metadata jsonb
)
returns nutriai.recipe_captures
language plpgsql
security definer
set search_path = ''
as $$
declare
  capture nutriai.recipe_captures;
  checkpoint_time timestamptz := now();
begin
  if p_recipe_graph is null or jsonb_typeof(p_recipe_graph) <> 'object' then
    raise exception 'Recipe graph must be an object' using errcode = '22023';
  end if;
  if p_extraction_notes is null or jsonb_typeof(p_extraction_notes) <> 'array'
    or p_inferred_fields is null or jsonb_typeof(p_inferred_fields) <> 'array' then
    raise exception 'Recipe analysis notes and inferred fields must be arrays' using errcode = '22023';
  end if;
  if p_extraction_metadata is null or jsonb_typeof(p_extraction_metadata) <> 'object'
    or p_normalization_metadata is null or jsonb_typeof(p_normalization_metadata) <> 'object'
    or p_quality_metadata is null or jsonb_typeof(p_quality_metadata) <> 'object' then
    raise exception 'Recipe analysis checkpoint metadata must be objects' using errcode = '22023';
  end if;
  if nullif(btrim(p_extraction_version), '') is null
    or nullif(btrim(p_normalization_version), '') is null
    or nullif(btrim(p_quality_version), '') is null
    or length(p_extraction_version) > 120
    or length(p_normalization_version) > 120
    or length(p_quality_version) > 120 then
    raise exception 'Recipe analysis checkpoint versions are invalid' using errcode = '22023';
  end if;

  update nutriai.recipe_captures
  set recipe_graph = p_recipe_graph,
      confidence = p_confidence,
      extraction_notes = p_extraction_notes,
      inferred_fields = p_inferred_fields,
      stage_checkpoints = coalesce(stage_checkpoints, '{}'::jsonb)
        || jsonb_build_object(
          'extraction', p_extraction_metadata || jsonb_build_object(
            'version', btrim(p_extraction_version),
            'completedAt', checkpoint_time,
            'updatedAt', checkpoint_time
          ),
          'normalization', p_normalization_metadata || jsonb_build_object(
            'version', btrim(p_normalization_version),
            'completedAt', checkpoint_time,
            'updatedAt', checkpoint_time
          ),
          'quality', p_quality_metadata || jsonb_build_object(
            'version', btrim(p_quality_version),
            'completedAt', checkpoint_time,
            'updatedAt', checkpoint_time
          )
        )
  where id = p_capture_id
    and user_id = p_user_id
    and status = 'processing'
  returning * into capture;

  if not found then
    raise exception 'Processing recipe capture not found' using errcode = 'P0002';
  end if;
  return capture;
end;
$$;

-- Selecting the ready version is already the atomic publication boundary. Keep
-- the trigger on the current generation contract so the Edge Function does not
-- need a second publication RPC after settling the generation request.
create or replace function nutriai.finalize_capture_when_page_version_selected()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  page_owner_id uuid;
begin
  if new.selected_version_id is null
    or new.selected_version_id is not distinct from old.selected_version_id then
    return new;
  end if;

  perform 1
  from nutriai.page_versions as version
  where version.id = new.selected_version_id
    and version.page_id = new.id
    and version.status = 'ready';
  if not found then return new; end if;

  select cookbook.user_id
    into page_owner_id
  from nutriai.cookbooks as cookbook
  where cookbook.id = new.cookbook_id;
  if page_owner_id is null then return new; end if;

  perform nutriai.finalize_recipe_capture_page(
    page_owner_id,
    new.id,
    'complete-recipe-page-4x5-v4',
    'recipe-capture-publication-v1'
  );
  return new;
end;
$$;

revoke all on function nutriai.persist_recipe_capture_analysis(
  uuid, uuid, jsonb, numeric, jsonb, jsonb, text, jsonb, text, jsonb, text, jsonb
) from public, anon, authenticated;
revoke all on function nutriai.finalize_capture_when_page_version_selected()
  from public;

grant execute on function nutriai.persist_recipe_capture_analysis(
  uuid, uuid, jsonb, numeric, jsonb, jsonb, text, jsonb, text, jsonb, text, jsonb
) to service_role;
