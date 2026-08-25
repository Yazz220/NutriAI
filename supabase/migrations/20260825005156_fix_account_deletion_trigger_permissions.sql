-- Deleting auth.users cascades into nutriai.cookbooks. Its AFTER DELETE
-- trigger can run under supabase_auth_admin, which intentionally has no
-- direct access to custom schemas. Run the narrowly scoped trigger function
-- with its postgres owner's privileges and an empty search path.

alter function nutriai.replace_deleted_default_cookbook() security definer;
