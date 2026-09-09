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
    'complete-recipe-page-4x5-v3',
    'recipe-capture-publication-v1'
  );
  return new;
end;
$$;

drop trigger if exists finalize_capture_when_page_version_selected
  on nutriai.cookbook_pages;

create trigger finalize_capture_when_page_version_selected
after update of selected_version_id on nutriai.cookbook_pages
for each row
when (new.selected_version_id is distinct from old.selected_version_id)
execute function nutriai.finalize_capture_when_page_version_selected();

revoke all on function nutriai.finalize_capture_when_page_version_selected() from public;
