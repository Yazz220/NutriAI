-- Rollback-only proof that artwork candidates do not replace the selected
-- version until the authenticated page owner explicitly chooses one.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values ('55555555-5555-4555-8555-555555555555', 'authenticated', 'authenticated', 'art-owner@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  '55555555-5555-4555-8555-555555555555',
  'Artwork Proof', 'Artwork proof', 'Artwork proof'
);

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
)
values (
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  '55555555-5555-4555-8555-555555555555',
  'Artwork Soup', 2, '[]'::jsonb, '[]'::jsonb, 'text', '[]'::jsonb, 'dinner', 1
);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order, recipe_graph
)
values (
  'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  1, 'dinner', 0,
  '{"title":"Artwork Soup","servings":2,"ingredientGroups":[],"stepGroups":[]}'::jsonb
);

do $proof$
declare
  proof_user_id uuid;
  proof_cookbook_id uuid;
  proof_page_id uuid;
  current_version_id uuid;
  candidate_version_id uuid;
  request_state jsonb;
  request_id uuid;
  selected_version_id uuid;
begin
  select cookbook.user_id, cookbook.id, page.id
    into proof_user_id, proof_cookbook_id, proof_page_id
  from nutriai.cookbook_pages as page
  join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
  order by page.created_at
  limit 1;

  if proof_page_id is null then
    raise exception 'No cookbook page is available for the artwork candidate proof';
  end if;

  insert into nutriai.page_versions (page_id, prompt_payload, model, status, credit_cost)
  values (proof_page_id, '{"proof":"current"}'::jsonb, 'proof-model', 'ready', 0)
  returning id into current_version_id;

  update nutriai.cookbook_pages
  set selected_version_id = current_version_id
  where id = proof_page_id;

  insert into nutriai.page_versions (page_id, prompt_payload, model, status, credit_cost)
  values (proof_page_id, '{"proof":"candidate"}'::jsonb, 'proof-model', 'ready', 0)
  returning id into candidate_version_id;

  request_state := nutriai.begin_generation_request(
    proof_user_id,
    proof_cookbook_id,
    'proof-art-candidate-selection',
    jsonb_build_object('pageId', proof_page_id)
  );
  request_id := (request_state ->> 'id')::uuid;

  update nutriai.generation_requests
  set page_id = proof_page_id
  where id = request_id;

  perform nutriai.complete_art_generation_request(
    proof_user_id,
    request_id,
    candidate_version_id,
    jsonb_build_object('artAsset', jsonb_build_object('id', candidate_version_id)),
    false
  );

  select page.selected_version_id into selected_version_id
  from nutriai.cookbook_pages as page
  where page.id = proof_page_id;

  if selected_version_id <> current_version_id then
    raise exception 'Completing a candidate replaced the current artwork';
  end if;

  if exists (
    select 1
    from nutriai.credit_ledger
    where generation_request_id = request_id
  ) then
    raise exception 'Credit-free completion unexpectedly wrote to the legacy ledger';
  end if;

end
$proof$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', cookbook.user_id, 'role', 'authenticated')::text,
  true
)
from nutriai.page_versions as version
join nutriai.cookbook_pages as page on page.id = version.page_id
join nutriai.cookbooks as cookbook on cookbook.id = page.cookbook_id
where version.prompt_payload = '{"proof":"candidate"}'::jsonb
limit 1;

set local role authenticated;

do $proof$
declare
  proof_page_id uuid;
  candidate_version_id uuid;
begin
  select version.page_id, version.id
    into proof_page_id, candidate_version_id
  from nutriai.page_versions as version
  where version.prompt_payload = '{"proof":"candidate"}'::jsonb
  limit 1;

  if not nutriai.select_page_art_version(proof_page_id, candidate_version_id) then
    raise exception 'The page owner could not select the candidate';
  end if;

  if nutriai.select_page_art_version(proof_page_id, gen_random_uuid()) then
    raise exception 'A version outside the page was accepted';
  end if;
end
$proof$;

rollback;
