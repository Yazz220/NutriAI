-- Add page_template_id to cookbooks: a book-level default page layout
-- for new recipe pages. Existing rows default to 'clean-cream'.

alter table nutriai.cookbooks
  add column if not exists page_template_id text default 'clean-cream';

alter table nutriai.cookbooks
  drop constraint if exists cookbooks_page_template_id_check;

alter table nutriai.cookbooks
  add constraint cookbooks_page_template_id_check
  check (
    page_template_id in ('clean-cream', 'ink-sketch', 'modern-editorial')
  );
