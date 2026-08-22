-- Phase 1: user-scoped recipe collection retrieval for Nosh.
--
-- The canonical search document is cookbook_pages.recipe_graph. The generated
-- vector stays in sync when Nosh edits the graph, while title similarity covers
-- small voice-to-text variations such as "cheese cake" / "cheesecake".

create extension if not exists pg_trgm with schema extensions;

create or replace function nutriai.recipe_graph_search_vector(graph jsonb)
returns tsvector
language sql
immutable
returns null on null input
set search_path = ''
as $function$
  select
    setweight(to_tsvector('english', coalesce(graph ->> 'title', '')), 'A')
    || setweight(to_tsvector('english', concat_ws(' ',
      graph ->> 'description',
      graph ->> 'cuisine',
      graph ->> 'category',
      (
        select string_agg(value, ' ')
        from jsonb_array_elements_text(coalesce(graph -> 'tags', '[]'::jsonb)) as tag(value)
      ),
      (
        select string_agg(value, ' ')
        from jsonb_array_elements_text(coalesce(graph -> 'dietaryTags', '[]'::jsonb)) as dietary_tag(value)
      )
    )), 'B')
    || setweight(to_tsvector('english', concat_ws(' ',
      (
        select string_agg(concat_ws(' ', ingredient_group ->> 'label', ingredient ->> 'name', ingredient ->> 'preparation'), ' ')
        from jsonb_array_elements(coalesce(graph -> 'ingredientGroups', '[]'::jsonb)) as ingredient_group
        cross join lateral jsonb_array_elements(coalesce(ingredient_group -> 'ingredients', '[]'::jsonb)) as ingredient
      ),
      (
        select string_agg(value, ' ')
        from jsonb_array_elements_text(coalesce(graph -> 'notes', '[]'::jsonb)) as note(value)
      ),
      (
        select string_agg(value, ' ')
        from jsonb_array_elements_text(coalesce(graph -> 'equipment', '[]'::jsonb)) as equipment(value)
      ),
      graph #>> '{provenance,sourceAttribution}'
    )), 'C')
    || setweight(to_tsvector('english', coalesce((
      select string_agg(concat_ws(' ', step_group ->> 'label', step ->> 'heading', step ->> 'text'), ' ')
      from jsonb_array_elements(coalesce(graph -> 'stepGroups', '[]'::jsonb)) as step_group
      cross join lateral jsonb_array_elements(coalesce(step_group -> 'steps', '[]'::jsonb)) as step
    ), '')), 'D');
$function$;

alter table nutriai.cookbook_pages
  add column if not exists search_vector tsvector
  generated always as (nutriai.recipe_graph_search_vector(recipe_graph)) stored;

create index if not exists cookbook_pages_recipe_search_idx
  on nutriai.cookbook_pages using gin (search_vector);

create index if not exists cookbook_pages_recipe_title_trgm_idx
  on nutriai.cookbook_pages using gin
  (lower(recipe_graph ->> 'title') extensions.gin_trgm_ops)
  where recipe_graph is not null;

create or replace function nutriai.search_recipe_collection(
  search_query text,
  cookbook_filter uuid default null,
  recent_first boolean default false,
  result_limit integer default 5
)
returns table (
  page_id uuid,
  cookbook_id uuid,
  cookbook_title text,
  title text,
  description text,
  category text,
  cuisine text,
  servings integer,
  tags text[],
  ingredient_preview text[],
  updated_at timestamptz,
  score real
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with input as (
    select
      nullif(btrim(search_query), '') as raw_query,
      websearch_to_tsquery('english', coalesce(nullif(btrim(search_query), ''), '')) as parsed_query,
      greatest(1, least(coalesce(result_limit, 5), 5)) as capped_limit
  ), ranked as (
    select
      page.id as page_id,
      page.cookbook_id,
      cookbook.title as cookbook_title,
      page.recipe_graph ->> 'title' as title,
      page.recipe_graph ->> 'description' as description,
      page.recipe_graph ->> 'category' as category,
      page.recipe_graph ->> 'cuisine' as cuisine,
      case
        when page.recipe_graph ->> 'servings' ~ '^[0-9]+$'
          then (page.recipe_graph ->> 'servings')::integer
        else null
      end as servings,
      coalesce((
        select array_agg(value)
        from jsonb_array_elements_text(coalesce(page.recipe_graph -> 'tags', '[]'::jsonb)) as tag(value)
      ), array[]::text[]) as tags,
      (coalesce((
        select array_agg(ingredient.value ->> 'name' order by group_index, ingredient_index)
        from jsonb_array_elements(coalesce(page.recipe_graph -> 'ingredientGroups', '[]'::jsonb))
          with ordinality as ingredient_group(value, group_index)
        cross join lateral jsonb_array_elements(coalesce(ingredient_group.value -> 'ingredients', '[]'::jsonb))
          with ordinality as ingredient(value, ingredient_index)
        where ingredient.value ->> 'name' is not null
      ), array[]::text[]))[1:5] as ingredient_preview,
      page.updated_at,
      (
        ts_rank_cd(page.search_vector, input.parsed_query)
        + extensions.similarity(lower(page.recipe_graph ->> 'title'), lower(input.raw_query)) * 2
        + case when lower(page.recipe_graph ->> 'title') = lower(input.raw_query) then 5 else 0 end
        + case when lower(cookbook.title) = lower(input.raw_query) then 0.5 else 0 end
      )::real as score,
      input.capped_limit
    from nutriai.cookbook_pages as page
    join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
    cross join input
    where input.raw_query is not null
      and cookbook.user_id = (select auth.uid())
      and page.recipe_graph is not null
      and (cookbook_filter is null or page.cookbook_id = cookbook_filter)
      and (
        page.search_vector @@ input.parsed_query
        or extensions.similarity(lower(page.recipe_graph ->> 'title'), lower(input.raw_query)) >= 0.25
        or extensions.similarity(lower(cookbook.title), lower(input.raw_query)) >= 0.35
      )
  )
  select
    ranked.page_id,
    ranked.cookbook_id,
    ranked.cookbook_title,
    ranked.title,
    ranked.description,
    ranked.category,
    ranked.cuisine,
    ranked.servings,
    ranked.tags,
    ranked.ingredient_preview,
    ranked.updated_at,
    ranked.score
  from ranked
  order by
    case when recent_first then ranked.updated_at else null end desc,
    ranked.score desc,
    ranked.title,
    ranked.page_id
  limit (select capped_limit from input);
$function$;

revoke execute on function nutriai.recipe_graph_search_vector(jsonb) from public, anon;
grant execute on function nutriai.recipe_graph_search_vector(jsonb) to authenticated, service_role;
revoke execute on function nutriai.search_recipe_collection(text, uuid, boolean, integer) from public, anon;
grant execute on function nutriai.search_recipe_collection(text, uuid, boolean, integer) to authenticated;
