alter table nutriai.cookbooks
  add column if not exists cover_finish_id text,
  add column if not exists cover_color_id text;

update nutriai.cookbooks
set
  cover_finish_id = coalesce(cover_finish_id, 'fine-cloth'),
  cover_color_id = coalesce(
    cover_color_id,
    case cover_style
      when 'terracotta-cloth' then 'clay'
      when 'navy-leather' then 'midnight'
      when 'alabaster-linen' then 'alabaster'
      when 'charcoal-cloth' then 'charcoal'
      when 'umber-leather' then 'umber'
      else 'sage'
    end
  );

alter table nutriai.cookbooks
  alter column cover_finish_id set default 'fine-cloth',
  alter column cover_finish_id set not null,
  alter column cover_color_id set default 'sage',
  alter column cover_color_id set not null;

alter table nutriai.cookbooks
  drop constraint if exists cookbooks_cover_finish_id_check,
  add constraint cookbooks_cover_finish_id_check
    check (cover_finish_id in ('fine-cloth', 'natural-linen')),
  drop constraint if exists cookbooks_cover_color_id_check,
  add constraint cookbooks_cover_color_id_check
    check (cover_color_id in ('sage', 'clay', 'midnight', 'alabaster', 'charcoal', 'umber'));

comment on column nutriai.cookbooks.cover_finish_id is
  'Surface finish of the canonical Nosh cover; independent from color and book construction.';
comment on column nutriai.cookbooks.cover_color_id is
  'Curated cover color; independent from finish and internal recipe-page style.';
comment on column nutriai.cookbooks.cover_style is
  'Legacy compatibility cover preset. New clients derive it from cover_color_id.';
