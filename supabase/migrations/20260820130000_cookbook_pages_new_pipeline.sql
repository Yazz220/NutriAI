-- Phase 4.5: Add new-pipeline columns to cookbook_pages.
--
-- These columns store the data the typesetter needs to render a page
-- from the new pipeline (RecipeGraph + art asset + style/template).
-- Legacy pages (with imageUrl only) are unaffected — the new columns
-- are nullable and only populated for new-pipeline pages.
--
-- recipe_graph  — the canonical RecipeGraph JSON (structured culinary data)
-- style_id      — which CookbookStyleId preset conditioned the art
-- template_id   — which RecipeTemplateId controls the page layout

alter table nutriai.cookbook_pages
  add column if not exists recipe_graph jsonb;

alter table nutriai.cookbook_pages
  add column if not exists style_id text;

alter table nutriai.cookbook_pages
  add column if not exists template_id text;

-- style_id must be one of the valid CookbookStyleId values (if present)
alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_style_id_check;

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_style_id_check
  check (
    style_id is null or style_id in (
      'vintage-garden', 'handwritten', 'editorial', 'watercolor',
      'rustic', 'minimal', 'sage-linen', 'terracotta-cloth',
      'navy-leather', 'charcoal-cloth', 'alabaster-linen', 'umber-leather'
    )
  );

-- template_id must be one of the valid RecipeTemplateId values (if present)
alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_template_id_check;

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_template_id_check
  check (
    template_id is null or template_id in ('clean-cream', 'ink-sketch', 'modern-editorial')
  );
