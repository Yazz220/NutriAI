-- These functions exist only as trigger entry points. PostgreSQL grants
-- EXECUTE to PUBLIC by default, which unnecessarily exposes them through the
-- Data API when their schemas are exposed.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
revoke all on function nutriai.replace_deleted_default_cookbook() from public, anon, authenticated;
