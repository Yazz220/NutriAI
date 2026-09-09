-- Add Artisan recipe page style and transition Bold to legacy.

insert into nutriai.recipe_page_style_versions (style_id, revision, display_name, status)
values ('artisan', 1, 'Artisan', 'active')
on conflict (style_id, revision) do update
set display_name = excluded.display_name,
    status = excluded.status;

update nutriai.recipe_page_style_versions
set status = 'legacy'
where style_id = 'bold' and revision = 1;
