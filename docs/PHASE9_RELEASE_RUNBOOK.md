# Folio Phase 9 Release Runbook

This runbook separates code-complete hardening from checks that require a linked backend, physical devices, or a production rollout. Do not call Phase 9 complete until every required gate below has evidence.

## Release order

1. Run the local automated gate: `npm test`, `npm run eval:ingestion`, `npm run typecheck`, and `npm run lint`.
2. Apply all pending migrations to a non-production Supabase branch or staging project in timestamp order.
3. Run the rollback-only SQL proofs in `supabase/tests/` against staging.
4. Run Supabase security and performance advisors. Review new findings; do not waive ownership, RLS, function-grant, mutable-search-path, or foreign-key-index findings.
5. Deploy `extract-recipe`, `capture-recipe`, `nosh-chat`, `generate-page-art`, and `delete-account` to staging.
6. Run `npm run eval:ingestion:live` against the staged extraction configuration and retain the ignored result artifact with the release evidence.
7. Choose the `EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2` conversation presentation for the internal build. Both values must use the same capture pipeline.
8. Complete the device matrix and inspect the monitoring signals below.
9. Promote the same tested migration/function/client versions to production in that order.

The connected production-like Folio project was audited read-only on 2026-08-21. It had zero cookbook rows and was several migrations behind the repository. No migration or Edge Function was deployed during that audit.

## Automated and database gates

The automated suite must cover:

- shelf, recipe, capture, share, and walkthrough entry-point contracts;
- focus stability when the visible reader page changes;
- empty, resolved, and ambiguous collection retrieval;
- the five-candidate search cap and three-loaded-recipe request cap;
- persisted concurrent captures, stale work, retries, destination choice, duplicate share delivery, and lost-response idempotency;
- recipe, non-recipe, insufficient-evidence, critical-fact, and quality-routing gates across URL, text, image, video, and audio sources;
- preview-before-commit for recipe and collection mutations;
- account deletion of database rows plus private capture/art Storage objects.

Staging SQL proofs must demonstrate that a second authenticated user cannot retrieve another user's recipe, processing page, capture, generation request, or collection mutation. Service-owned tables such as `generation_requests` must keep RLS enabled with no authenticated client policy.

## Privacy and security gate

- The mobile bundle contains only the Supabase anon key. Provider and service-role keys remain Edge Function secrets.
- `recipe-captures` remains private and user-prefixed. Source media is retained so the user can review provenance and retry processing; it is removed when the account is deleted. A shorter retention policy requires a separate product decision and migration.
- Complete generated recipe pages remain user-prefixed in the existing public cookbook-page bucket so current URLs keep working. These images include recipe text. Object names use unguessable UUID paths, but the images are not access-controlled. Treat private storage with signed URLs as an unresolved production privacy gate. Account deletion removes page objects before deleting the auth user.
- Generated tool arguments are treated as untrusted. Persistent mutations use exact ids plus database ownership checks and idempotency keys.
- Before production, enable leaked-password protection in Supabase Auth and re-run the security advisor.
- Before deploying the cleanup migration, verify the five retired nutrition tables are empty and take a database backup. The migration deliberately avoids `CASCADE`.

## Monitoring signals

Edge Functions emit structured JSON logs. Preserve these event names in dashboards and alerts:

| Signal | Event or field |
|---|---|
| Chat latency and prompt cost | `nosh-chat completed`: `durationMs`, token fields, `cost`, `task`, `entryPoint` |
| Retrieval quality | `nosh collection search outcome`; client event `nosh_collection_search_completed` |
| Retrieval latency | client event `nosh_collection_search_completed.durationMs` |
| Capture progress/failure | `Recipe capture page is being produced`, `Recipe capture needs a destination`, `Recipe capture processing failed` |
| Duplicate capture delivery | `Recipe capture delivery deduplicated` |
| Page latency/cost/failure | `generate recipe page completed` or `generate recipe page failed` |
| Lost-response replay | `generate-page-art idempotent replay` |
| Account deletion | `delete-account completed` with removed object counts |

The client analytics shim currently writes only in development. Connect `utils/analytics.ts` to the approved production analytics sink before using client retrieval rates as a rollout gate. Never send recipe text, search queries, allergy data, or source URLs as analytics properties.

Initial alerts should cover elevated authentication failures, capture-processing failures, art failures after a credit reservation, account-deletion failures, and p95 latency regressions. Establish thresholds from internal-build traffic rather than guessing them in code.

## Physical-device matrix

Run on at least one supported iPhone and one supported Android device, including a mid-range device:

- native share from a browser, social app, Photos/Gallery, and selected text;
- signed out, offline, app cold, app already open, duplicate delivery, and interrupted processing;
- three simultaneous captures with one failure and one missing destination;
- screen reader order, large dynamic type, reduced motion, 44-point touch targets, status announcements, close/back/resume/retry paths;
- conversation restoration, recipe focus switching, timers, and optional walkthrough controls;
- cold restoration and processing-page publication with a representative large collection.

Record device, OS, build, network condition, result, and evidence. Native sharing is not accepted from a web preview or simulator-only run.

## Rollback

- Client: publish an internal or production build with the last tested conversation presentation. The feature flag may change wrappers, but it must not change capture or page-generation ownership.
- Edge Functions: redeploy the last known-good version. Keep request/response contracts backward compatible for unfinished captures and generation jobs.
- Database: prefer a forward repair migration. Never reverse a migration that could discard captures, pages, versions, idempotency records, or credits. Restore from backup only for an incident that cannot be repaired forward.
- Native share: disable one platform's share-extension release independently if its physical-device gate fails; in-app capture remains available.
- Cleanup: do not remove compatibility routes or the feature flag until old deep links and unfinished jobs have aged out and production monitoring is stable.

## Final decision

Phase 9 is locally code-complete when automated checks pass and the staged advisor/SQL gates pass. It is production-complete only after the physical-device matrix, internal rollout, monitoring baseline, privacy disclosures, and production promotion are complete.
