-- Keep the Folio book construction canonical while broadening the curated
-- phone-legible finish and color vocabulary. Existing ids remain valid.

alter table nutriai.cookbooks
  drop constraint if exists cookbooks_cover_finish_id_check,
  add constraint cookbooks_cover_finish_id_check
    check (cover_finish_id in (
      'fine-cloth',
      'natural-linen',
      'pressed-paper',
      'soft-grain'
    )),
  drop constraint if exists cookbooks_cover_color_id_check,
  add constraint cookbooks_cover_color_id_check
    check (cover_color_id in (
      'sage',
      'clay',
      'ochre',
      'midnight',
      'alabaster',
      'charcoal',
      'umber'
    ));

comment on column nutriai.cookbooks.cover_finish_id is
  'Curated phone-legible surface finish on the canonical Folio book.';

comment on column nutriai.cookbooks.cover_color_id is
  'Curated cover color; legacy ids remain stable while their art direction may evolve.';
