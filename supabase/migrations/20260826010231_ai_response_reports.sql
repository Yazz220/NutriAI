create table if not exists nutriai.ai_response_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null check (char_length(message_id) between 1 and 200),
  response_text text not null check (char_length(response_text) between 1 and 8000),
  status text not null default 'open' check (status in ('open', 'reviewed', 'resolved')),
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists ai_response_reports_status_created_idx
  on nutriai.ai_response_reports (status, created_at desc);

alter table nutriai.ai_response_reports enable row level security;

revoke all on table nutriai.ai_response_reports from public, anon, authenticated;
grant select, insert, update, delete on table nutriai.ai_response_reports to service_role;
