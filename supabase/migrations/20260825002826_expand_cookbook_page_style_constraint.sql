-- Cookbook pages inherit the book-owned page visual language. The creation
-- Studio introduced three page-language ids after the original page-row
-- constraint was created, so capture could create the cookbook but not its
-- first page for Editorial or Heritage books.

alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_style_id_check;

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_style_id_check
  check (
    style_id is null or style_id in (
      'vintage-garden', 'handwritten', 'editorial', 'watercolor', 'rustic', 'minimal',
      'sage-linen', 'terracotta-cloth', 'navy-leather', 'charcoal-cloth',
      'alabaster-linen', 'umber-leather',
      'illustrated', 'studio-editorial', 'heritage'
    )
  );
