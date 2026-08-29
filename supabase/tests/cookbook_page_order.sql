-- Rollback-only proof for canonical, ownership-checked cookbook page ordering.

begin;
set local statement_timeout = '10s';

insert into auth.users (id, aud, role, email)
values
  ('41111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'page-order-owner@example.test'),
  ('42222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'page-order-other@example.test');

insert into nutriai.cookbooks (id, user_id, title, theme_name, theme_prompt)
values
  ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '41111111-1111-4111-8111-111111111111', 'Ordered Book', 'Proof', 'Proof'),
  ('4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', '42222222-2222-4222-8222-222222222222', 'Private Book', 'Proof', 'Proof');

insert into nutriai.recipes (
  id, user_id, title, servings, ingredients, steps, source_type, tags, category, confidence
) values
  ('4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', '41111111-1111-4111-8111-111111111111', 'First', 2, '[]', '[]', 'text', '[]', 'main', 1),
  ('4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', '41111111-1111-4111-8111-111111111111', 'Second', 2, '[]', '[]', 'text', '[]', 'main', 1),
  ('4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', '41111111-1111-4111-8111-111111111111', 'Third', 2, '[]', '[]', 'text', '[]', 'main', 1);

insert into nutriai.cookbook_pages (
  id, cookbook_id, recipe_id, page_number, section, sort_order, lifecycle_status
) values
  ('4ccccccc-cccc-4ccc-8ccc-ccccccccccc1', '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 1, 'main', 0, 'approved'),
  ('4ccccccc-cccc-4ccc-8ccc-ccccccccccc2', '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 2, 'main', 1, 'processing'),
  ('4ccccccc-cccc-4ccc-8ccc-ccccccccccc3', '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', '4bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3', 3, 'main', 2, 'approved');

select set_config(
  'request.jwt.claims',
  '{"sub":"41111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

do $proof$
declare
  first_result jsonb;
  replay_result jsonb;
  ordered_ids uuid[];
  numbered_ids uuid[];
begin
  first_result := nutriai.reorder_cookbook_page(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '4ccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    '4ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'page-order:move-third-first'
  );
  replay_result := nutriai.reorder_cookbook_page(
    '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '4ccccccc-cccc-4ccc-8ccc-ccccccccccc3',
    '4ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
    'page-order:move-third-first'
  );

  if first_result <> replay_result then
    raise exception 'Page order retry returned a different result';
  end if;

  select array_agg(id order by sort_order) into ordered_ids
  from nutriai.cookbook_pages
  where cookbook_id = '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

  if ordered_ids <> array[
    '4ccccccc-cccc-4ccc-8ccc-ccccccccccc3'::uuid,
    '4ccccccc-cccc-4ccc-8ccc-ccccccccccc1'::uuid,
    '4ccccccc-cccc-4ccc-8ccc-ccccccccccc2'::uuid
  ] then
    raise exception 'Unexpected canonical order: %', ordered_ids;
  end if;

  select array_agg(id order by page_number) into numbered_ids
  from nutriai.cookbook_pages
  where cookbook_id = '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';

  if numbered_ids <> ordered_ids then
    raise exception 'Page numbers did not follow canonical order';
  end if;

  begin
    perform nutriai.reorder_cookbook_page(
      '4aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      '4ccccccc-cccc-4ccc-8ccc-ccccccccccc1',
      null,
      'page-order:cross-owner'
    );
    raise exception 'Cross-owner reorder was accepted';
  exception
    when no_data_found then null;
  end;
end
$proof$;

rollback;
