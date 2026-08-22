-- Transactional proof for generation request, spend, and refund idempotency
-- across provider, storage, version-write, and completion failure stages.
-- Safe against a linked project: all fixture rows are rolled back.

begin;
set local statement_timeout = '5s';

do $proof$
declare
  proof_user_id uuid;
  proof_cookbook_id uuid;
  proof_request_id uuid;
  first_state jsonb;
  duplicate_state jsonb;
  terminal_state jsonb;
  first_spend_id uuid;
  duplicate_spend_id uuid;
  first_failure boolean;
  duplicate_failure boolean;
  spend_count integer;
  refund_count integer;
  request_net integer;
  stage_request_count integer;
  failure_stage text;
  proof_key text;
begin
  select user_id, id
    into proof_user_id, proof_cookbook_id
  from nutriai.cookbooks
  order by created_at
  limit 1;

  if proof_user_id is null then
    raise exception 'No cookbook owner is available for the generation proof';
  end if;

  insert into nutriai.credit_ledger (user_id, event_type, amount)
  values (proof_user_id, 'grant', 8);

  foreach failure_stage in array array[
    'image-provider',
    'storage',
    'version-write',
    'completion'
  ] loop
    proof_key := 'proof-generation-failure-' || failure_stage;

    first_state := nutriai.begin_generation_request(
      proof_user_id,
      proof_cookbook_id,
      proof_key,
      jsonb_build_object(
        'cookbookId', proof_cookbook_id,
        'title', 'Rollback proof',
        'failureStage', failure_stage
      )
    );
    duplicate_state := nutriai.begin_generation_request(
      proof_user_id,
      proof_cookbook_id,
      proof_key,
      jsonb_build_object(
        'cookbookId', proof_cookbook_id,
        'title', 'Rollback proof',
        'failureStage', failure_stage
      )
    );

    proof_request_id := (first_state->>'id')::uuid;
    if coalesce((first_state->>'claimed')::boolean, false) is not true
      or coalesce((duplicate_state->>'claimed')::boolean, true) is not false
      or duplicate_state->>'id' <> first_state->>'id' then
      raise exception 'Request claim was not idempotent for stage %', failure_stage;
    end if;

    first_spend_id := nutriai.reserve_generation_credit(proof_user_id, proof_request_id);
    duplicate_spend_id := nutriai.reserve_generation_credit(proof_user_id, proof_request_id);

    select count(*), coalesce(sum(amount), 0)::integer
      into spend_count, request_net
    from nutriai.credit_ledger
    where generation_request_id = proof_request_id
      and event_type = 'generation_spend';

    if first_spend_id <> duplicate_spend_id or spend_count <> 1 or request_net <> -1 then
      raise exception 'Credit reservation was not exactly once for stage %', failure_stage;
    end if;

    first_failure := nutriai.fail_generation_request(
      proof_user_id,
      proof_request_id,
      'Rollback proof failure: ' || failure_stage
    );
    duplicate_failure := nutriai.fail_generation_request(
      proof_user_id,
      proof_request_id,
      'Rollback proof failure: ' || failure_stage
    );

    select
      count(*) filter (where event_type = 'generation_spend'),
      count(*) filter (where event_type = 'generation_refund'),
      coalesce(sum(amount), 0)::integer
      into spend_count, refund_count, request_net
    from nutriai.credit_ledger
    where generation_request_id = proof_request_id;

    terminal_state := nutriai.begin_generation_request(
      proof_user_id,
      proof_cookbook_id,
      proof_key,
      jsonb_build_object(
        'cookbookId', proof_cookbook_id,
        'title', 'Rollback proof',
        'failureStage', failure_stage
      )
    );

    if first_failure is not true
      or duplicate_failure is not false
      or spend_count <> 1
      or refund_count <> 1
      or request_net <> 0
      or terminal_state->>'status' <> 'failed'
      or coalesce((terminal_state->>'claimed')::boolean, true) is not false then
      raise exception 'Failure refund was not exactly once for stage %', failure_stage;
    end if;
  end loop;

  select count(*)
    into stage_request_count
  from nutriai.generation_requests
  where user_id = proof_user_id
    and idempotency_key like 'proof-generation-failure-%';

  if stage_request_count <> 4 then
    raise exception 'Expected four isolated failure-stage requests, found %', stage_request_count;
  end if;
end
$proof$;

rollback;
