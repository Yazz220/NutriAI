-- The selected artwork constraint is composite so a version can only be
-- selected for the page it belongs to. Match that key order for FK checks.
drop index if exists nutriai.cookbook_pages_selected_version_fk_idx;

create index cookbook_pages_selected_version_fk_idx
  on nutriai.cookbook_pages (id, selected_version_id);
