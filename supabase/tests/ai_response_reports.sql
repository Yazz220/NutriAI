-- Rollback-only proof that AI response reports remain private to server operators.

begin;
set local statement_timeout = '10s';

do $proof$
begin
  if has_table_privilege('anon', 'nutriai.ai_response_reports', 'select,insert,update,delete') then
    raise exception 'Anonymous clients can access AI response reports';
  end if;
  if has_table_privilege('authenticated', 'nutriai.ai_response_reports', 'select,insert,update,delete') then
    raise exception 'Authenticated clients can bypass the report Edge Function';
  end if;
  if not has_table_privilege('service_role', 'nutriai.ai_response_reports', 'select,insert,update,delete') then
    raise exception 'Service role cannot manage AI response reports';
  end if;
end
$proof$;

rollback;
