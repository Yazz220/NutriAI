-- Rollback-only proof that Supabase Auth can cascade a user deletion through
-- the custom nutriai schema and its cookbook default-replacement trigger.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values (
  '55555555-5555-4555-8555-555555555555',
  'authenticated',
  'authenticated',
  'account-deletion-proof@example.test'
);

insert into nutriai.cookbooks (
  id, user_id, title, theme_name, theme_prompt, cover_style, page_template_id, is_default
) values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  '55555555-5555-4555-8555-555555555555',
  'Deletion Proof', 'Deletion proof', 'Deletion proof', 'handwritten', 'clean-cream', true
);

set local role supabase_auth_admin;
delete from auth.users where id = '55555555-5555-4555-8555-555555555555';
reset role;

do $proof$
begin
  if exists (
    select 1 from nutriai.cookbooks
    where user_id = '55555555-5555-4555-8555-555555555555'
  ) then
    raise exception 'Cookbook rows remained after auth user deletion';
  end if;
end
$proof$;

rollback;
