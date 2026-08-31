-- Recipe page styles are immutable, versioned publishing contracts. The
-- catalog lets cookbook rows reference an exact contract instead of relying
-- on two independently maintained string check constraints.

create table nutriai.recipe_page_style_versions (
  style_id text not null,
  revision integer not null check (revision > 0),
  display_name text not null,
  status text not null check (status in ('active', 'legacy')),
  created_at timestamptz not null default now(),
  primary key (style_id, revision)
);

create unique index recipe_page_style_versions_one_active_revision
  on nutriai.recipe_page_style_versions (style_id)
  where status = 'active';

comment on table nutriai.recipe_page_style_versions is
  'Persisted identities for immutable recipe-page visual contracts. Prompt definitions live in the shared versioned code registry.';

insert into nutriai.recipe_page_style_versions (style_id, revision, display_name, status)
values
  ('vintage-garden', 1, 'Vintage Garden', 'legacy'),
  ('handwritten', 1, 'Handwritten', 'legacy'),
  ('editorial', 1, 'Editorial', 'legacy'),
  ('watercolor', 1, 'Watercolor', 'legacy'),
  ('rustic', 1, 'Rustic', 'legacy'),
  ('minimal', 1, 'Minimal', 'legacy'),
  ('sage-linen', 1, 'Sage Linen', 'legacy'),
  ('terracotta-cloth', 1, 'Terracotta Cloth', 'legacy'),
  ('navy-leather', 1, 'Navy Leather', 'legacy'),
  ('charcoal-cloth', 1, 'Charcoal Cloth', 'legacy'),
  ('alabaster-linen', 1, 'Alabaster Linen', 'legacy'),
  ('umber-leather', 1, 'Umber Leather', 'legacy'),
  ('studio-editorial', 1, 'Editorial', 'legacy'),
  ('illustrated', 1, 'Illustrated', 'legacy'),
  ('heritage', 1, 'Heritage', 'legacy'),
  ('studio', 1, 'Studio', 'active'),
  ('editorial', 2, 'Editorial', 'active'),
  ('illustrated', 2, 'Illustrated', 'active'),
  ('heritage', 2, 'Heritage', 'active'),
  ('journal', 1, 'Journal', 'active'),
  ('bold', 1, 'Bold', 'active');

alter table nutriai.recipe_page_style_versions enable row level security;
revoke all on table nutriai.recipe_page_style_versions from public, anon, authenticated;
grant select on table nutriai.recipe_page_style_versions to service_role;

alter table nutriai.cookbooks
  drop constraint if exists cookbooks_page_style_id_check;

alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_style_id_check;

alter table nutriai.cookbooks
  alter column page_style_id set default 'studio';

alter table nutriai.cookbooks
  add constraint cookbooks_page_style_version_fkey
  foreign key (page_style_id, style_revision)
  references nutriai.recipe_page_style_versions (style_id, revision)
  on update restrict
  on delete restrict
  not valid;

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_style_version_fkey
  foreign key (style_id, style_revision)
  references nutriai.recipe_page_style_versions (style_id, revision)
  on update restrict
  on delete restrict
  not valid;

alter table nutriai.cookbooks
  validate constraint cookbooks_page_style_version_fkey;

alter table nutriai.cookbook_pages
  validate constraint cookbook_pages_style_version_fkey;
