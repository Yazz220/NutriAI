update storage.buckets
set public = false
where id = 'cookbook-pages';

drop policy if exists cookbook_pages_owner_select on storage.objects;
create policy cookbook_pages_owner_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cookbook-pages'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Public URLs are no longer valid delivery artifacts. The app signs the
-- storage_path only after the owning user has passed both page RLS and Storage RLS.
update nutriai.page_versions
set image_url = null
where storage_path is not null;
