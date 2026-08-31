create index if not exists cookbooks_page_style_version_idx
  on nutriai.cookbooks (page_style_id, style_revision);

create index if not exists cookbook_pages_style_version_idx
  on nutriai.cookbook_pages (style_id, style_revision);

create policy "Service role reads recipe page style versions"
  on nutriai.recipe_page_style_versions
  for select
  to service_role
  using (true);
