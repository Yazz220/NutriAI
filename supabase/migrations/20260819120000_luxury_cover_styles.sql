-- Widen nutriai.cookbooks.cover_style to admit the six luxury binding
-- presets rendered by the 3D bookshelf and creation studio. Values are
-- additive; existing rows keep their current style.

alter table nutriai.cookbooks
  drop constraint if exists cookbooks_cover_style_check;

alter table nutriai.cookbooks
  add constraint cookbooks_cover_style_check
  check (
    cover_style in (
      'vintage-garden',
      'handwritten',
      'editorial',
      'watercolor',
      'rustic',
      'minimal',
      'sage-linen',
      'terracotta-cloth',
      'navy-leather',
      'charcoal-cloth',
      'alabaster-linen',
      'umber-leather'
    )
  );
