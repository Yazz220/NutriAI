-- Separate the physical cover finish from the book-owned recipe-page visual
-- language. Existing books keep their previous cover-linked style id so their
-- generated pages do not change unexpectedly. New books default to the Studio's
-- Illustrated language and explicitly persist the user's selection.

alter table nutriai.cookbooks
  add column if not exists page_style_id text;

update nutriai.cookbooks
   set page_style_id = coalesce(nullif(page_style_id, ''), cover_style, 'handwritten')
 where page_style_id is null
    or page_style_id = '';

alter table nutriai.cookbooks
  alter column page_style_id set default 'illustrated',
  alter column page_style_id set not null;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'cookbooks_page_style_id_check'
       and conrelid = 'nutriai.cookbooks'::regclass
  ) then
    alter table nutriai.cookbooks
      add constraint cookbooks_page_style_id_check
      check (
        page_style_id in (
          'vintage-garden', 'handwritten', 'editorial', 'watercolor', 'rustic', 'minimal',
          'sage-linen', 'terracotta-cloth', 'navy-leather', 'charcoal-cloth',
          'alabaster-linen', 'umber-leather',
          'illustrated', 'studio-editorial', 'heritage'
        )
      );
  end if;
end $$;

comment on column nutriai.cookbooks.page_style_id is
  'Book-owned recipe-page visual language. Independent from the physical cover_style.';
