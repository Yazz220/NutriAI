-- Ingredient Icons DDL and RLS
-- Schema: nutriai

create schema if not exists nutriai;

create table if not exists nutriai.ingredient_icons (
  slug text primary key,
  display_name text,
  status text not null default 'pending' check (status in ('ready','pending','failed')),
  image_url text,
  storage_path text,
  seed integer,
  prompt_version integer not null default 1,
  prompt text,
  model text,
  fail_count integer not null default 0,
  last_error text,
  last_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ingredient_icons_status_idx on nutriai.ingredient_icons (status);
create index if not exists ingredient_icons_updated_idx on nutriai.ingredient_icons (updated_at desc);
create index if not exists ingredient_icons_requested_idx on nutriai.ingredient_icons (last_requested_at desc);

-- Trigger to auto-update updated_at
create or replace function nutriai.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger ingredient_icons_set_updated_at
before update on nutriai.ingredient_icons
for each row execute procedure nutriai.set_updated_at();

-- RLS
alter table nutriai.ingredient_icons enable row level security;

-- Allow read to authenticated users
create policy ingredient_icons_read for select
  on nutriai.ingredient_icons
  to authenticated
  using (true);

-- Allow service role to insert/update
create policy ingredient_icons_write_service for all
  on nutriai.ingredient_icons
  to service_role
  using (true)
  with check (true);

-- Optional: allow admins (by role claim) to write
-- create policy ingredient_icons_write_admin for all
--   on nutriai.ingredient_icons
--   to authenticated
--   using ((auth.jwt() ->> 'role') = 'admin')
--   with check ((auth.jwt() ->> 'role') = 'admin');

-- Storage bucket (run once via SQL if using storage SQL helpers; otherwise create via dashboard)
-- select storage.create_bucket('ingredient-icons', true, 'public');
