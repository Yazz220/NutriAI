-- Deterministic collection browsing, explicit cooking preferences, and
-- privacy-conscious Nosh run traces.

create or replace function nutriai.browse_recipe_collection(
  cookbook_filters uuid[] default null,
  text_filter text default null,
  ingredients_all text[] default null,
  ingredients_any text[] default null,
  exclude_ingredients text[] default null,
  tag_filters text[] default null,
  category_filter text default null,
  cuisine_filter text default null,
  max_total_minutes integer default null,
  sort_mode text default 'relevance',
  result_offset integer default 0,
  result_limit integer default 12
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
  total_time_minutes integer,
  tags text[],
  dietary_tags text[],
  ingredient_preview text[],
  updated_at timestamptz,
  score real,
  match_reason text,
  total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with input as (
    select
      nullif(btrim(text_filter), '') as query_text,
      case
        when nullif(btrim(text_filter), '') is null then null
        else websearch_to_tsquery('english', btrim(text_filter))
      end as parsed_query,
      greatest(0, least(coalesce(result_offset, 0), 500)) as capped_offset,
      greatest(1, least(coalesce(result_limit, 12), 20)) as capped_limit
  ), recipes as (
    select
      page.id as page_id,
      page.cookbook_id,
      cookbook.title as cookbook_title,
      page.recipe_graph ->> 'title' as title,
      page.recipe_graph ->> 'description' as description,
      page.recipe_graph ->> 'category' as category,
      page.recipe_graph ->> 'cuisine' as cuisine,
      case when page.recipe_graph ->> 'servings' ~ '^[0-9]+$'
        then (page.recipe_graph ->> 'servings')::integer end as servings,
      case
        when page.recipe_graph ->> 'totalTimeMinutes' ~ '^[0-9]+$'
          then (page.recipe_graph ->> 'totalTimeMinutes')::integer
        when page.recipe_graph ->> 'prepTimeMinutes' ~ '^[0-9]+$'
          or page.recipe_graph ->> 'cookTimeMinutes' ~ '^[0-9]+$'
          then coalesce(
            case when page.recipe_graph ->> 'prepTimeMinutes' ~ '^[0-9]+$'
              then (page.recipe_graph ->> 'prepTimeMinutes')::integer end,
            0
          ) + coalesce(
            case when page.recipe_graph ->> 'cookTimeMinutes' ~ '^[0-9]+$'
              then (page.recipe_graph ->> 'cookTimeMinutes')::integer end,
            0
          )
        else null
      end as total_time_minutes,
      coalesce((
        select array_agg(tag.value)
        from jsonb_array_elements_text(coalesce(page.recipe_graph -> 'tags', '[]'::jsonb)) as tag(value)
      ), array[]::text[]) as tags,
      coalesce((
        select array_agg(tag.value)
        from jsonb_array_elements_text(coalesce(page.recipe_graph -> 'dietaryTags', '[]'::jsonb)) as tag(value)
      ), array[]::text[]) as dietary_tags,
      coalesce((
        select array_agg(ingredient.value ->> 'name' order by group_index, ingredient_index)
        from jsonb_array_elements(coalesce(page.recipe_graph -> 'ingredientGroups', '[]'::jsonb))
          with ordinality as ingredient_group(value, group_index)
        cross join lateral jsonb_array_elements(coalesce(ingredient_group.value -> 'ingredients', '[]'::jsonb))
          with ordinality as ingredient(value, ingredient_index)
        where ingredient.value ->> 'name' is not null
      ), array[]::text[]) as ingredient_names,
      page.updated_at,
      page.search_vector,
      input.query_text,
      input.parsed_query,
      input.capped_offset,
      input.capped_limit,
      case when input.query_text is null then 0 else (
        ts_rank_cd(page.search_vector, input.parsed_query)
        + extensions.similarity(lower(page.recipe_graph ->> 'title'), lower(input.query_text)) * 2
        + case when lower(page.recipe_graph ->> 'title') = lower(input.query_text) then 5 else 0 end
      ) end::real as score
    from nutriai.cookbook_pages as page
    join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
    cross join input
    where cookbook.user_id = (select auth.uid())
      and page.recipe_graph is not null
      and (cookbook_filters is null or page.cookbook_id = any(cookbook_filters))
  ), filtered as (
    select recipes.*
    from recipes
    where (
      recipes.query_text is null
      or recipes.search_vector @@ recipes.parsed_query
      or extensions.similarity(lower(recipes.title), lower(recipes.query_text)) >= 0.25
      or extensions.similarity(lower(recipes.cookbook_title), lower(recipes.query_text)) >= 0.35
    )
      and (category_filter is null or lower(recipes.category) = lower(category_filter))
      and (cuisine_filter is null or lower(recipes.cuisine) = lower(cuisine_filter))
      and (max_total_minutes is null or recipes.total_time_minutes <= max_total_minutes)
      and not exists (
        select 1 from unnest(coalesce(ingredients_all, array[]::text[])) as required(value)
        where not exists (
          select 1 from unnest(recipes.ingredient_names) as ingredient(value)
          where lower(ingredient.value) like '%' || lower(required.value) || '%'
        )
      )
      and (
        coalesce(cardinality(ingredients_any), 0) = 0
        or exists (
          select 1
          from unnest(recipes.ingredient_names) as ingredient(value)
          join unnest(ingredients_any) as requested(value)
            on lower(ingredient.value) like '%' || lower(requested.value) || '%'
        )
      )
      and not exists (
        select 1
        from unnest(coalesce(exclude_ingredients, array[]::text[])) as excluded(value)
        join unnest(recipes.ingredient_names) as ingredient(value)
          on lower(ingredient.value) like '%' || lower(excluded.value) || '%'
      )
      and not exists (
        select 1 from unnest(coalesce(tag_filters, array[]::text[])) as required(value)
        where not exists (
          select 1 from unnest(recipes.tags || recipes.dietary_tags) as tag(value)
          where lower(tag.value) = lower(required.value)
        )
      )
  )
  select
    filtered.page_id,
    filtered.cookbook_id,
    filtered.cookbook_title,
    filtered.title,
    filtered.description,
    filtered.category,
    filtered.cuisine,
    filtered.servings,
    filtered.total_time_minutes,
    filtered.tags,
    filtered.dietary_tags,
    filtered.ingredient_names[1:5] as ingredient_preview,
    filtered.updated_at,
    filtered.score,
    case
      when filtered.query_text is not null then 'text'
      when coalesce(cardinality(ingredients_all), 0) > 0
        or coalesce(cardinality(ingredients_any), 0) > 0 then 'ingredients'
      else 'filters'
    end as match_reason,
    count(*) over() as total_count
  from filtered
  order by
    case when sort_mode = 'title' then lower(filtered.title) end,
    case when sort_mode = 'recent' then filtered.updated_at end desc,
    case when sort_mode = 'time' then filtered.total_time_minutes end,
    case when sort_mode = 'relevance' then filtered.score end desc,
    filtered.updated_at desc,
    filtered.page_id
  offset (select capped_offset from input)
  limit (select capped_limit from input);
$function$;

revoke execute on function nutriai.browse_recipe_collection(
  uuid[], text, text[], text[], text[], text[], text, text, integer, text, integer, integer
) from public, anon;
grant execute on function nutriai.browse_recipe_collection(
  uuid[], text, text[], text[], text[], text[], text, text, integer, text, integer, integer
) to authenticated;

create table if not exists nutriai.cooking_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null check (preference_key in (
    'allergy',
    'dietary_restriction',
    'disliked_ingredient',
    'measurement_system',
    'default_servings',
    'appliance',
    'cooking_goal'
  )),
  value text not null check (char_length(btrim(value)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists cooking_preferences_user_key_value_idx
  on nutriai.cooking_preferences (user_id, preference_key, value);

alter table nutriai.cooking_preferences enable row level security;

drop policy if exists cooking_preferences_owner_select on nutriai.cooking_preferences;
create policy cooking_preferences_owner_select on nutriai.cooking_preferences
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists cooking_preferences_owner_insert on nutriai.cooking_preferences;
create policy cooking_preferences_owner_insert on nutriai.cooking_preferences
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists cooking_preferences_owner_update on nutriai.cooking_preferences;
create policy cooking_preferences_owner_update on nutriai.cooking_preferences
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists cooking_preferences_owner_delete on nutriai.cooking_preferences;
create policy cooking_preferences_owner_delete on nutriai.cooking_preferences
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table nutriai.cooking_preferences from public, anon;
grant select, insert, update, delete on table nutriai.cooking_preferences to authenticated;
grant select, insert, update, delete on table nutriai.cooking_preferences to service_role;

create table if not exists nutriai.nosh_agent_runs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null check (char_length(request_id) between 1 and 200),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id text check (thread_id is null or char_length(thread_id) <= 200),
  user_message_id text check (user_message_id is null or char_length(user_message_id) <= 200),
  prompt_version text not null,
  model text not null,
  task text,
  focus_kind text,
  focus_page_id uuid,
  focus_status text,
  visible_page_id uuid,
  tool_names text[] not null default array[]::text[],
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  latency_ms integer,
  status text not null check (status in ('started', 'completed', 'failed', 'cancelled')),
  error_class text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists nosh_agent_runs_user_created_idx
  on nutriai.nosh_agent_runs (user_id, created_at desc);

create unique index if not exists nosh_agent_runs_user_request_idx
  on nutriai.nosh_agent_runs (user_id, request_id);

alter table nutriai.nosh_agent_runs enable row level security;
revoke all on table nutriai.nosh_agent_runs from public, anon, authenticated;
grant select, insert, update, delete on table nutriai.nosh_agent_runs to service_role;

alter table if exists nutriai.ai_response_reports
  add column if not exists agent_request_id text;

create index if not exists ai_response_reports_agent_request_idx
  on nutriai.ai_response_reports (agent_request_id)
  where agent_request_id is not null;
