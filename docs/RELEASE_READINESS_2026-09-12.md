# Folio release readiness — September 12, 2026

Decision: not ready to submit yet. Build 15 is attached, App Privacy is published, and webhook delivery is working. Finish the reviewer account, subscription screenshots, and physical-device purchase/restore tests. No replacement binary is justified by the checks completed so far.

## Follow-up completion

- Attached build 15 to the existing App Store version without submitting it.
- Verified App Privacy at the current `/distribution/privacy` page: published September 11, with 12 declared data types including user content, identifiers, purchases, usage, and diagnostics.
- Pinned the working RevenueCat webhook to `us-east-1`, verified the URL persisted after reload, and received HTTP 200 from its dashboard TEST event.
- With the owner's explicit approval, deleted broken duplicate `whintgrba909cd08b`. Verified only the working connection remains.
- Live read-only SQL confirmed `cookbook-pages` and `recipe-captures` are PRIVATE and all 21 `nutriai` tables have RLS enabled.
- Pulled store metadata into `metadata/` and prepared credential-free reviewer notes at `metadata/review/notes.txt`.
- Created App Review details `6ec25fdc-f813-4557-8ae0-70b2e61ca549` with the owner-provided contact information. A separate Folio login was created using a Gmail plus alias; it still needs email confirmation and a sample cookbook. Password is outside the repository and stored in Apple's review fields. Account setup is paused while the owner reviews the alias arrangement.
- Physical-device checklist: `docs/TESTFLIGHT_RELEASE_CHECK.md`. No purchase, restoration, or screenshot result has been supplied yet.

## Synced and verified

- Fast-forwarded `codex/prelaunch-audit` from `d5d45b8c7` to `835b62dcc` (`fix: finalize Folio Plus release candidate`). Existing uncommitted `ara/` notes were preserved. No commit was created.
- TypeScript and lint passed. Jest reported 161 passing suites and 770 passing tests. Jest retained an open handle after completion; its completed process was stopped. This is a test-runner cleanup issue, not evidence of a device crash.
- Apple app `6762021802`, bundle `com.yaz12.nosh`: build 15 / marketing version 1.0.0 is VALID and unexpired. EAS production build `889fb3fe-b444-4764-bd11-3335f36e9580` finished September 11. Its EAS record has no Git commit hash, so exact source-to-binary correspondence remains unverified.
- App Store version `65b7e342-9dd6-4a00-a104-9d2a2c0c7c79` is version 1.0, PREPARE_FOR_SUBMISSION, with manual release selected and no review underway.
- Production Supabase `jqngtejmhoibnzlzjlir` is ACTIVE_HEALTHY. All 49 local migrations match remote history, through `20260911030427`.
- Production plan rows: Free has 2 cookbooks and 5 lifetime designed pages; Plus has unlimited cookbooks and 40 pages per calendar month. The old development allowance mentioned in DEVELOPMENT.md is not the current production value.
- All ten listed Edge Functions are ACTIVE, including capture, extraction, generation, chat, subscription sync, webhook, and deletion handlers. This confirms deployment presence, not complete end-to-end behavior.
- EAS production has the App Store RevenueCat public SDK key, support email, and protected Sentry upload token. Build configuration targets the migrated Supabase project and production Sentry environment.
- Existing public Terms and Privacy pages return HTTP 200. Added both URLs to the English App Store description; the Terms-link validation warning is now cleared.

## Required before submission

1. **Test subscriptions on TestFlight build 15.** The owner confirmed purchase/restore testing has not been done. RevenueCat showed no sandbox transactions. Test monthly and annual purchases, cancellation, restoration, sign-out/account switching, server entitlement sync, and the blocked-action resume behavior. Confirm Plus reaches 40 pages and unlimited books on the server, not just in the client UI. A dashboard TEST webhook does not prove this lifecycle.
2. **Complete both subscription review packages.** Annual `6807573489` and monthly `6807573064` are MISSING_METADATA. Direct App Store API checks found no review screenshot for either. Pricing, localization, and availability checks passed. Upload actual paywall screenshots, revalidate, and attach both subscriptions to the first app review using the authenticated Apple web session. Promotional images are optional unless those merchandising features are used.
3. **Confirm and test the reviewer account.** App Review contact details and the dedicated Folio credentials are saved in Apple. Confirm the account email, add a sample cookbook through the capture pipeline, and verify login on the submitted binary. The owner is reviewing the proposed Gmail-alias arrangement.
4. **Test the attached build.** Build 15 is selected. Build another candidate only if testing finds a binary defect or the PC build cannot be confirmed to contain the intended changes.
5. **App Privacy verified.** The signed-in browser shows published declarations including content, account identifiers, purchases, usage, and diagnostics. No edits were needed during this check.
6. **Finish the native release smoke test.** Exercise fresh sign-up/email confirmation, Apple sign-in, text/link/photo capture, finished-page reading, contextual chat, native Share to Folio, offline recovery, and account deletion on a disposable account. Test larger text and VoiceOver. A simulator cannot establish StoreKit purchase or physical share-extension readiness. No simulator or physical-device smoke test was completed in this audit.

## RevenueCat webhook finding

Initial audit found two integrations. Follow-up resolved the duplicate:

| Connection | Scope | Live dashboard TEST result |
|---|---|---|
| Folio Supabase subscription sync (`whintgrc0b52f384c`) | All apps; production and sandbox; HMAC on; region pinned to us-east-1 | HTTP 200; active |
| Folio Supabase production (`whintgrba909cd08b`) | Broken duplicate | Initially HTTP 401; deleted with owner approval |

There is now one working authenticated delivery path. Real sandbox purchase/renewal event processing remains to be tested; a dashboard TEST event does not exercise subscriber reconciliation.

## Sentry and security

- Sentry search for `release:com.yaz12.nosh@1.0.0+15` in folio-mobile over 14 days returned no matching issues. This is not proof of sufficient build-15 usage or telemetry coverage.
- The newest stream-close issue, FOLIO-MOBILE-A, was a handled development-build-13 event. The inspected native unmount crash, FOLIO-MOBILE-1, also affected development build 13. Do not label these build-15 regressions without reproduction. Test the affected chat/reader transitions on the release binary.
- Supabase Security Advisor: zero errors, ten warnings. Nine concern authenticated SECURITY DEFINER RPCs. The matching repository definitions contain authentication/ownership guards and fixed search paths; the warnings alone do not establish an authorization vulnerability. Fresh two-user isolation SQL tests were not run.
- The remaining warning is disabled leaked-password protection. Review enabling it and the production account's plan requirements.
- Some older Sentry backend failures appeared in the mobile project; verify the backend DSN routes new events to folio-backend.
- The Supabase connector still lists the old account. The local CLI successfully read the new project's state and migrations, but subsequent advisor/secret queries reported missing access-token credentials. The production dashboard remained signed in. Repair CLI/connector authentication before the next deployment; secret values were not verified here.
- Live ingestion-corpus evaluation, source-map upload verification, and full physical-device evidence remain unverified. Current bucket privacy and RLS coverage were verified during follow-up. The older public-bucket warning in PHASE9_RELEASE_RUNBOOK.md is obsolete for the current production state.

## Next working order

Confirm the reviewer-email arrangement and email address; seed and test the reviewer account; test build 15 purchases and restore; capture and upload subscription review screenshots; attach both subscriptions; finish the native smoke test; rerun `asc validate` and subscription validation. Submit only once those checks are complete.

References: [Apple submission guidance](https://developer.apple.com/app-store/review/guidelines/#before-you-submit), [App Store version](https://appstoreconnect.apple.com/apps/6762021802/distribution/ios/version/inflight), [RevenueCat webhooks](https://app.revenuecat.com/projects/a62eb822/integrations/webhooks), [Supabase security advisor](https://supabase.com/dashboard/project/jqngtejmhoibnzlzjlir/advisors/security).
