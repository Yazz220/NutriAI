drop function if exists nutriai.create_cookbook_for_current_user(
  text, text, text, text, text, text, text, integer, jsonb, text, jsonb
);

create or replace function nutriai.create_cookbook_for_current_user(
  p_title text,
  p_theme_name text,
  p_theme_prompt text,
  p_cover_style text,
  p_cover_finish_id text,
  p_cover_color_id text,
  p_cover_title_color_id text,
  p_cover_title_placement_id text,
  p_page_style_id text,
  p_style_revision integer,
  p_page_style_references jsonb,
  p_page_template_id text,
  p_sections jsonb
)
returns nutriai.cookbooks
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  effective_plan text;
  cookbook_limit integer;
  cookbook_count integer;
  inserted_cookbook nutriai.cookbooks;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(p_title), '') is null
    or nullif(btrim(p_theme_name), '') is null
    or nullif(btrim(p_theme_prompt), '') is null
    or jsonb_typeof(coalesce(p_page_style_references, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_sections, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid cookbook details' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('cookbooks:' || caller_id::text, 0)
  );

  effective_plan := nutriai.effective_subscription_plan_id(caller_id, now());
  select allowance into cookbook_limit
  from nutriai.subscription_plan_features as feature
  where feature.plan_id = effective_plan
    and feature_key = 'cookbooks'
    and enabled;

  select count(*)::integer into cookbook_count
  from nutriai.cookbooks where user_id = caller_id;

  if cookbook_limit is not null and cookbook_count >= cookbook_limit then
    raise exception 'cookbook_limit_reached' using errcode = 'P0001';
  end if;

  insert into nutriai.cookbooks (
    user_id,
    title,
    theme_name,
    theme_prompt,
    cover_style,
    cover_finish_id,
    cover_color_id,
    cover_title_color_id,
    cover_title_placement_id,
    page_style_id,
    style_revision,
    page_style_references,
    page_template_id,
    sections,
    is_default
  ) values (
    caller_id,
    btrim(p_title),
    btrim(p_theme_name),
    btrim(p_theme_prompt),
    p_cover_style,
    p_cover_finish_id,
    p_cover_color_id,
    p_cover_title_color_id,
    p_cover_title_placement_id,
    p_page_style_id,
    p_style_revision,
    coalesce(p_page_style_references, '[]'::jsonb),
    p_page_template_id,
    coalesce(p_sections, '[]'::jsonb),
    cookbook_count = 0
  )
  returning * into inserted_cookbook;

  return inserted_cookbook;
end;
$$;

revoke all on function nutriai.create_cookbook_for_current_user(
  text, text, text, text, text, text, text, text, text, integer, jsonb, text, jsonb
) from public, anon;

grant execute on function nutriai.create_cookbook_for_current_user(
  text, text, text, text, text, text, text, text, text, integer, jsonb, text, jsonb
) to authenticated;

comment on function nutriai.create_cookbook_for_current_user(
  text, text, text, text, text, text, text, text, text, integer, jsonb, text, jsonb
) is 'Creates an owned cookbook with its complete cover identity while atomically enforcing plan capacity.';
