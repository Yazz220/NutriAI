create or replace function nutriai.apply_recipe_page_revision(
  p_page_id uuid,
  p_recipe_graph jsonb,
  p_version_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  source_page nutriai.cookbook_pages;
  ingredient_rows jsonb;
  step_rows jsonb;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_page_id is null or p_version_id is null then
    raise exception 'Recipe page and version are required' using errcode = '22023';
  end if;
  if jsonb_typeof(p_recipe_graph) <> 'object'
    or nullif(btrim(p_recipe_graph ->> 'title'), '') is null
    or coalesce((p_recipe_graph ->> 'servings')::integer, 0) < 1 then
    raise exception 'Valid recipe data is required' using errcode = '22023';
  end if;

  select page.*
    into source_page
  from nutriai.cookbook_pages as page
  join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
  where page.id = p_page_id
    and cookbook.user_id = caller_id
  for update of page;

  if not found then
    raise exception 'Recipe page not found' using errcode = 'P0002';
  end if;

  perform 1
  from nutriai.page_versions as version
  where version.id = p_version_id
    and version.page_id = source_page.id
    and version.status = 'ready';

  if not found then
    raise exception 'Generated page version does not belong to this recipe page'
      using errcode = '23503';
  end if;

  select coalesce(jsonb_agg(ingredient.value), '[]'::jsonb)
    into ingredient_rows
  from jsonb_array_elements(coalesce(p_recipe_graph -> 'ingredientGroups', '[]'::jsonb)) as ingredient_group(value)
  cross join lateral jsonb_array_elements(coalesce(ingredient_group.value -> 'ingredients', '[]'::jsonb)) as ingredient(value);

  select coalesce(jsonb_agg(to_jsonb(step.value ->> 'text')), '[]'::jsonb)
    into step_rows
  from jsonb_array_elements(coalesce(p_recipe_graph -> 'stepGroups', '[]'::jsonb)) as step_group(value)
  cross join lateral jsonb_array_elements(coalesce(step_group.value -> 'steps', '[]'::jsonb)) as step(value);

  update nutriai.recipes
  set
    title = btrim(p_recipe_graph ->> 'title'),
    description = nullif(btrim(p_recipe_graph ->> 'description'), ''),
    servings = nullif(p_recipe_graph ->> 'servings', '')::integer,
    prep_time = nullif(p_recipe_graph ->> 'prepTimeMinutes', '')::integer,
    cook_time = nullif(p_recipe_graph ->> 'cookTimeMinutes', '')::integer,
    ingredients = ingredient_rows,
    steps = step_rows,
    tags = coalesce(p_recipe_graph -> 'tags', '[]'::jsonb),
    category = coalesce(nullif(p_recipe_graph ->> 'category', ''), category)
  where id = source_page.recipe_id
    and user_id = caller_id;

  if not found then
    raise exception 'Recipe not found' using errcode = 'P0002';
  end if;

  update nutriai.cookbook_pages
  set
    recipe_graph = p_recipe_graph,
    section = coalesce(nullif(p_recipe_graph ->> 'category', ''), section),
    selected_version_id = p_version_id
  where id = source_page.id;

  update nutriai.cookbooks
  set updated_at = now()
  where id = source_page.cookbook_id
    and user_id = caller_id;

  return true;
end;
$$;

revoke all on function nutriai.apply_recipe_page_revision(uuid, jsonb, uuid)
  from public, anon;
grant execute on function nutriai.apply_recipe_page_revision(uuid, jsonb, uuid)
  to authenticated;
