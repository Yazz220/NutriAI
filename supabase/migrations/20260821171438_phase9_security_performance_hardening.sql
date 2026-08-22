-- Phase 9 hardening: resolve database-advisor findings without widening the
-- client data boundary. generation_requests intentionally has RLS with no
-- client policies because only Edge Functions should read or write it.

do $$
begin
  if to_regprocedure('public.update_updated_at_column()') is not null then
    execute 'alter function public.update_updated_at_column() set search_path = ''''';
  end if;
end
$$;

create index if not exists cookbook_pages_recipe_id_idx
  on nutriai.cookbook_pages (recipe_id);

create index if not exists cookbook_pages_selected_version_fk_idx
  on nutriai.cookbook_pages (selected_version_id)
  where selected_version_id is not null;

create index if not exists credit_ledger_related_page_version_id_idx
  on nutriai.credit_ledger (related_page_version_id)
  where related_page_version_id is not null;

create index if not exists generation_requests_cookbook_id_idx
  on nutriai.generation_requests (cookbook_id);

create index if not exists generation_requests_page_id_idx
  on nutriai.generation_requests (page_id);

create index if not exists generation_requests_recipe_id_idx
  on nutriai.generation_requests (recipe_id);

create index if not exists generation_requests_version_id_idx
  on nutriai.generation_requests (version_id);

create index if not exists recipe_captures_pending_page_id_idx
  on nutriai.recipe_captures (pending_page_id)
  where pending_page_id is not null;

-- Retired nutrition-tracker tables are intentionally preserved here. Their
-- cleanup is a separate product/data-retention decision, not pipeline work.
