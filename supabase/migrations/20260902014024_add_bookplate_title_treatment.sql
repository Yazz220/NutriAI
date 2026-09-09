alter table nutriai.cookbooks
  drop constraint if exists cookbooks_cover_title_placement_id_check,
  add constraint cookbooks_cover_title_placement_id_check
    check (cover_title_placement_id in ('upper', 'center', 'lower', 'bookplate'));

comment on column nutriai.cookbooks.cover_title_placement_id is
  'Stable cover-title composition identifier. Legacy positional ids map to Editorial, Classic, and Modern; bookplate adds a framed archival treatment.';
