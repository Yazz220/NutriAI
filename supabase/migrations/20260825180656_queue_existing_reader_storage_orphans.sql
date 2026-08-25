with storage_candidates as (
  select
    object.bucket_id,
    object.name as object_path,
    case
      when split_part(object.name, '/', 1)
        ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then split_part(object.name, '/', 1)::uuid
      else null
    end as user_id
  from storage.objects as object
  where object.bucket_id in ('cookbook-pages', 'recipe-captures')
    and object.created_at < now() - interval '24 hours'
    and object.name !~ '(^|/)\.\.(/|$)'
), stale_orphans as (
  select candidate.*
  from storage_candidates as candidate
  where candidate.user_id is not null
    and exists (
      select 1 from auth.users as owner where owner.id = candidate.user_id
    )
    and (
      (
        candidate.bucket_id = 'cookbook-pages'
        and not exists (
          select 1 from nutriai.page_versions as version
          where version.storage_path = candidate.object_path
        )
        and not exists (
          select 1 from nutriai.generation_requests as request
          where request.storage_path = candidate.object_path
        )
      )
      or (
        candidate.bucket_id = 'recipe-captures'
        and not exists (
          select 1 from nutriai.recipe_captures as capture
          where capture.source_storage_path = candidate.object_path
        )
      )
    )
)
insert into nutriai.storage_cleanup_jobs (user_id, bucket, object_path)
select user_id, bucket_id, object_path
from stale_orphans
on conflict (bucket, object_path) do nothing;
