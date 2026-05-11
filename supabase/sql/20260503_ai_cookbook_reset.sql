create schema if not exists nutriai;

grant usage on schema nutriai to anon, authenticated, service_role;

create table if not exists nutriai.cookbooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My Cookbook',
  theme_name text not null,
  theme_prompt text not null,
  section_order jsonb not null default '["breakfast","lunch","dinner","healthy","desserts","sides","favorites"]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists nutriai.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  servings integer,
  prep_time integer,
  cook_time integer,
  ingredients jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  source_type text not null check (source_type in ('url','text','image','video')),
  source_url text,
  tags jsonb not null default '[]'::jsonb,
  category text not null default 'favorites',
  confidence numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists recipes_id_user_idx on nutriai.recipes(id, user_id);

create table if not exists nutriai.cookbook_pages (
  id uuid primary key default gen_random_uuid(),
  cookbook_id uuid not null references nutriai.cookbooks(id) on delete cascade,
  recipe_id uuid not null references nutriai.recipes(id) on delete cascade,
  page_number integer not null,
  section text not null default 'favorites',
  sort_order integer not null default 0,
  selected_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cookbook_id, page_number)
);

create or replace function nutriai.enforce_cookbook_page_recipe_owner()
returns trigger as $$
declare
  cookbook_owner uuid;
  recipe_owner uuid;
begin
  select user_id into cookbook_owner
  from nutriai.cookbooks
  where id = new.cookbook_id;

  select user_id into recipe_owner
  from nutriai.recipes
  where id = new.recipe_id;

  if cookbook_owner is null or recipe_owner is null or cookbook_owner <> recipe_owner then
    raise exception 'Cookbook page recipe must belong to the cookbook owner';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists cookbook_pages_recipe_owner_check on nutriai.cookbook_pages;
create trigger cookbook_pages_recipe_owner_check
  before insert or update of cookbook_id, recipe_id on nutriai.cookbook_pages
  for each row execute function nutriai.enforce_cookbook_page_recipe_owner();

create table if not exists nutriai.page_versions (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references nutriai.cookbook_pages(id) on delete cascade,
  image_url text,
  storage_path text,
  prompt_payload jsonb not null,
  model text not null,
  status text not null check (status in ('pending','generating','ready','failed')),
  credit_cost integer not null default 1,
  error_message text,
  created_at timestamptz not null default now()
);

create unique index if not exists page_versions_page_id_id_idx on nutriai.page_versions(page_id, id);

alter table nutriai.cookbook_pages
  drop constraint if exists cookbook_pages_selected_version_id_fkey;

alter table nutriai.cookbook_pages
  add constraint cookbook_pages_selected_version_id_fkey
  foreign key (id, selected_version_id) references nutriai.page_versions(page_id, id)
  on delete set null (selected_version_id);

create table if not exists nutriai.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('grant','generation_spend','adjustment')),
  amount integer not null,
  related_page_version_id uuid references nutriai.page_versions(id) on delete set null,
  created_at timestamptz not null default now()
);

create or replace function nutriai.reserve_generation_credit(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = nutriai, public
as $$
declare
  current_balance integer;
  spend_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  select coalesce(sum(amount), 0)::integer
    into current_balance
  from nutriai.credit_ledger
  where user_id = p_user_id;

  if current_balance < 1 then
    raise exception 'Not enough credits' using errcode = 'P0001';
  end if;

  insert into nutriai.credit_ledger (user_id, event_type, amount)
  values (p_user_id, 'generation_spend', -1)
  returning id into spend_id;

  return spend_id;
end;
$$;

create or replace function nutriai.create_cookbook_page(
  p_cookbook_id uuid,
  p_recipe_id uuid,
  p_section text
)
returns nutriai.cookbook_pages
language plpgsql
security definer
set search_path = nutriai, public
as $$
declare
  next_page_number integer;
  inserted_page nutriai.cookbook_pages;
begin
  perform pg_advisory_xact_lock(hashtext(p_cookbook_id::text));

  select coalesce(max(page_number), 0) + 1
    into next_page_number
  from nutriai.cookbook_pages
  where cookbook_id = p_cookbook_id;

  insert into nutriai.cookbook_pages (
    cookbook_id,
    recipe_id,
    page_number,
    section,
    sort_order
  )
  values (
    p_cookbook_id,
    p_recipe_id,
    next_page_number,
    coalesce(nullif(p_section, ''), 'favorites'),
    next_page_number
  )
  returning * into inserted_page;

  return inserted_page;
end;
$$;

create index if not exists cookbooks_user_idx on nutriai.cookbooks(user_id);
create index if not exists recipes_user_idx on nutriai.recipes(user_id);
create index if not exists pages_cookbook_order_idx on nutriai.cookbook_pages(cookbook_id, sort_order);
create index if not exists page_versions_page_idx on nutriai.page_versions(page_id);
create index if not exists credit_ledger_user_idx on nutriai.credit_ledger(user_id, created_at desc);

alter table nutriai.cookbooks enable row level security;
alter table nutriai.recipes enable row level security;
alter table nutriai.cookbook_pages enable row level security;
alter table nutriai.page_versions enable row level security;
alter table nutriai.credit_ledger enable row level security;

drop policy if exists cookbooks_owner_select on nutriai.cookbooks;
create policy cookbooks_owner_select on nutriai.cookbooks
  for select using (auth.uid() = user_id);

drop policy if exists cookbooks_owner_insert on nutriai.cookbooks;
create policy cookbooks_owner_insert on nutriai.cookbooks
  for insert with check (auth.uid() = user_id);

drop policy if exists cookbooks_owner_update on nutriai.cookbooks;
create policy cookbooks_owner_update on nutriai.cookbooks
  for update using (auth.uid() = user_id);

drop policy if exists cookbooks_owner_delete on nutriai.cookbooks;
create policy cookbooks_owner_delete on nutriai.cookbooks
  for delete using (auth.uid() = user_id);

drop policy if exists recipes_owner_all on nutriai.recipes;
create policy recipes_owner_all on nutriai.recipes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists pages_owner_all on nutriai.cookbook_pages;
create policy pages_owner_all on nutriai.cookbook_pages
  for all using (
    exists (
      select 1 from nutriai.cookbooks
      where cookbooks.id = cookbook_pages.cookbook_id
      and cookbooks.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from nutriai.cookbooks
      where cookbooks.id = cookbook_pages.cookbook_id
      and cookbooks.user_id = auth.uid()
    )
  );

drop policy if exists page_versions_owner_all on nutriai.page_versions;
create policy page_versions_owner_all on nutriai.page_versions
  for all using (
    exists (
      select 1
      from nutriai.cookbook_pages p
      join nutriai.cookbooks c on c.id = p.cookbook_id
      where p.id = page_versions.page_id
      and c.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from nutriai.cookbook_pages p
      join nutriai.cookbooks c on c.id = p.cookbook_id
      where p.id = page_versions.page_id
      and c.user_id = auth.uid()
    )
  );

drop policy if exists credit_ledger_owner_select on nutriai.credit_ledger;
create policy credit_ledger_owner_select on nutriai.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists credit_ledger_service_all on nutriai.credit_ledger;
create policy credit_ledger_service_all on nutriai.credit_ledger
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

grant select, insert, update, delete on all tables in schema nutriai to authenticated;
grant all privileges on all tables in schema nutriai to service_role;
grant usage on all sequences in schema nutriai to authenticated, service_role;
grant execute on function nutriai.reserve_generation_credit(uuid) to service_role;
grant execute on function nutriai.create_cookbook_page(uuid, uuid, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cookbook-pages',
  'cookbook-pages',
  true,
  10485760,
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
