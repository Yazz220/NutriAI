create or replace function nutriai.sync_moved_page_capture_destination()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.capture_id is not null and new.cookbook_id is distinct from old.cookbook_id then
    update nutriai.recipe_captures as capture
    set destination_cookbook_id = new.cookbook_id
    from nutriai.cookbooks as cookbook
    where capture.id = new.capture_id
      and cookbook.id = new.cookbook_id
      and capture.user_id = cookbook.user_id;
  end if;

  return new;
end;
$$;

revoke all on function nutriai.sync_moved_page_capture_destination()
  from public, anon, authenticated;

drop trigger if exists cookbook_pages_sync_moved_capture_destination
  on nutriai.cookbook_pages;
create trigger cookbook_pages_sync_moved_capture_destination
  after update of cookbook_id on nutriai.cookbook_pages
  for each row execute function nutriai.sync_moved_page_capture_destination();

update nutriai.recipe_captures as capture
set destination_cookbook_id = page.cookbook_id
from nutriai.cookbook_pages as page
where page.capture_id = capture.id
  and capture.destination_cookbook_id is distinct from page.cookbook_id;

create or replace function nutriai.remove_recipe_page(p_page_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  source_page nutriai.cookbook_pages;
  source_cookbook_title text;
  removed_capture_id uuid;
  removed_recipe_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_page_id is null then
    raise exception 'Recipe page is required' using errcode = '22023';
  end if;

  select page.*
    into source_page
  from nutriai.cookbook_pages as page
  join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
  where page.id = p_page_id
    and page.lifecycle_status = 'approved'
    and cookbook.user_id = caller_id
  for update of page;

  if not found then
    raise exception 'Recipe page not found' using errcode = 'P0002';
  end if;

  select title into source_cookbook_title
  from nutriai.cookbooks
  where id = source_page.cookbook_id and user_id = caller_id;

  removed_capture_id := source_page.capture_id;
  removed_recipe_id := source_page.recipe_id;

  if removed_capture_id is not null then
    delete from nutriai.recipe_captures
    where id = removed_capture_id and user_id = caller_id;
  end if;

  delete from nutriai.cookbook_pages
  where id = source_page.id;

  if not exists (
    select 1 from nutriai.cookbook_pages where recipe_id = removed_recipe_id
  ) then
    delete from nutriai.recipes
    where id = removed_recipe_id and user_id = caller_id;
  end if;

  update nutriai.cookbooks
  set updated_at = now()
  where id = source_page.cookbook_id and user_id = caller_id;

  return jsonb_build_object(
    'pageId', source_page.id,
    'cookbookId', source_page.cookbook_id,
    'cookbookTitle', source_cookbook_title,
    'captureId', removed_capture_id,
    'recipeId', removed_recipe_id
  );
end;
$$;

revoke all on function nutriai.remove_recipe_page(uuid)
  from public, anon, authenticated;
grant execute on function nutriai.remove_recipe_page(uuid)
  to authenticated;
