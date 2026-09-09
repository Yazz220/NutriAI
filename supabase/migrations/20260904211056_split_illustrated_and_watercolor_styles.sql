-- Preserve book-owned revisions. Only new selections use the split styles.
update nutriai.recipe_page_style_versions
set status = 'legacy'
where style_id = 'illustrated' and revision = 2;

insert into nutriai.recipe_page_style_versions (style_id, revision, display_name, status)
values
  ('illustrated', 3, 'Illustrated', 'active'),
  ('watercolor', 2, 'Watercolor', 'active')
on conflict (style_id, revision) do update
set display_name = excluded.display_name, status = excluded.status;
