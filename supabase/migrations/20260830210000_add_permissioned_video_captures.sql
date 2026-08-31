update storage.buckets
set file_size_limit = 20000000,
    allowed_mime_types = array[
      'image/jpeg', 'image/png', 'image/webp', 'image/heic',
      'audio/aac', 'audio/aiff', 'audio/flac', 'audio/m4a', 'audio/mp4',
      'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/wave',
      'audio/x-aac', 'audio/x-aiff', 'audio/x-flac', 'audio/x-m4a', 'audio/x-wav',
      'video/mp4', 'video/mov', 'video/mpeg', 'video/quicktime',
      'video/webm', 'video/x-m4v'
    ]
where id = 'recipe-captures';

alter table nutriai.recipe_captures
  drop constraint if exists recipe_captures_source_storage_type_check,
  drop constraint if exists recipe_captures_stored_source_path_check;

alter table nutriai.recipe_captures
  add constraint recipe_captures_source_storage_type_check
    check (source_storage_path is null or source_type in ('image', 'video', 'audio')),
  add constraint recipe_captures_stored_source_path_check
    check (source_type not in ('image', 'audio') or source_storage_path is not null);

comment on column nutriai.recipe_captures.source_storage_path is
  'Private recipe-captures bucket path for image, audio, or permissioned video evidence. Video URL bookmarks keep this null.';
