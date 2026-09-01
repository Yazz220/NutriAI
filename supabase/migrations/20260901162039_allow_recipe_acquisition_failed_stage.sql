alter table nutriai.recipe_captures
  drop constraint if exists recipe_captures_failed_stage_check;

alter table nutriai.recipe_captures
  add constraint recipe_captures_failed_stage_check
  check (
    failed_stage is null
    or failed_stage in (
      'source', 'acquisition', 'transcription', 'extraction', 'normalization',
      'quality', 'destination', 'page_generation', 'publication'
    )
  );
