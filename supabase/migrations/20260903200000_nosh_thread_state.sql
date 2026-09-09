-- Persistent conversation working memory for Folio.
--
-- Stores only IDs, titles, and the active task — no message content — so the
-- privacy posture is unchanged from nosh_agent_runs. The server derives this
-- state deterministically from tool results and upserts it each turn; it
-- survives history compaction and enables cross-device thread state.
--
-- RLS: the owner can read and write their own thread state through their JWT.
-- The server uses the caller's JWT client (userClient), not the service role.

create table if not exists nutriai.nosh_thread_state (
  thread_id text not null check (char_length(thread_id) between 1 and 200),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_page_id uuid,
  subject_title text,
  subject_cookbook_id uuid,
  subject_source text check (subject_source in ('tool', 'focus')),
  recent_candidates jsonb not null default '[]'::jsonb,
  loaded_recipes jsonb not null default '[]'::jsonb,
  active_task text check (active_task is null or active_task in (
    'collection', 'cookbook-help', 'recipe-help', 'capture', 'preferences'
  )),
  updated_at timestamptz not null default now()
);

create unique index if not exists nosh_thread_state_user_thread_idx
  on nutriai.nosh_thread_state (user_id, thread_id);

alter table nutriai.nosh_thread_state enable row level security;

drop policy if exists nosh_thread_state_owner_select on nutriai.nosh_thread_state;
create policy nosh_thread_state_owner_select on nutriai.nosh_thread_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists nosh_thread_state_owner_upsert on nutriai.nosh_thread_state;
create policy nosh_thread_state_owner_upsert on nutriai.nosh_thread_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists nosh_thread_state_owner_update on nutriai.nosh_thread_state;
create policy nosh_thread_state_owner_update on nutriai.nosh_thread_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists nosh_thread_state_owner_delete on nutriai.nosh_thread_state;
create policy nosh_thread_state_owner_delete on nutriai.nosh_thread_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table nutriai.nosh_thread_state from public, anon;
grant select, insert, update, delete on table nutriai.nosh_thread_state to authenticated;
grant select, insert, update, delete on table nutriai.nosh_thread_state to service_role;
