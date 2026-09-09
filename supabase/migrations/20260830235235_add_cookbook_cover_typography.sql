alter table nutriai.cookbooks
  add column if not exists cover_title_color_id text not null default 'auto',
  add column if not exists cover_title_placement_id text not null default 'center';

alter table nutriai.cookbooks
  drop constraint if exists cookbooks_cover_title_color_id_check,
  add constraint cookbooks_cover_title_color_id_check
    check (cover_title_color_id in ('auto', 'gilt', 'ivory', 'plum', 'charcoal', 'silver')),
  drop constraint if exists cookbooks_cover_title_placement_id_check,
  add constraint cookbooks_cover_title_placement_id_check
    check (cover_title_placement_id in ('upper', 'center', 'lower'));

comment on column nutriai.cookbooks.cover_title_color_id is
  'Curated stamped title treatment on the physical cookbook cover.';
comment on column nutriai.cookbooks.cover_title_placement_id is
  'Curated vertical placement of the title on the physical cookbook cover.';
