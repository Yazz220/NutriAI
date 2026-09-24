# Folio release readiness — September 24, 2026

## Decision

Not ready to submit. The production backend has been restored, but Apple still has the former U.S. legal address, an incomplete W-9, a Pending User Info Paid Apps agreement, and a bank update stuck in Processing. Monthly/annual subscriptions still need review completion and a successful physical-device purchase/restore test. A new binary would not fix these account issues.

## Completed this audit

- Read the current Apple Finance response and searched the separate Developer Support address-change case and newer Apple messages. No address-change approval was found. The latest address-case response is September 19; the latest Finance response is September 23.
- Discovered that production Supabase project `jqngtejmhoibnzlzjlir` was paused on September 23 after inactivity. Resumed it in the dashboard and verified the completion notice and Healthy status.
- Verified the production Auth settings endpoint returns HTTP 200. The unauthenticated REST root returned 401; this is not a signed-in app test.
- Ran read-only SQL in production after restoration: all 21 `nutriai` tables have RLS enabled; `cookbook-pages` and `recipe-captures` storage buckets are private; 49 migrations exist through `20260911030427`, matching the local migration count/latest migration.
- Confirmed reviewer email remains confirmed and the preloaded review cookbook page exists. This does not replace signing in on TestFlight.
- Capture inventory: five ready captures and one needs_attention capture with extraction failure code `multiple_recipes`. No mutation or retry of user captures was performed.
- Verified the dashboard lists all ten deployed Edge Functions. No functions were redeployed.
- Updated App Review contact phone to the owner-provided Saudi number ending 3700; the API response confirmed the saved number and preserved reviewer credentials/notes.
- Confirmed App Privacy is published (September 11), seven store screenshots remain present, and build 15 is attached.
- Verified public support, privacy, and terms URLs return HTTP 200.

## Code and build checks

- Fetched origin; `codex/prelaunch-audit` remains at `835b62dcc`, with zero commits ahead/behind its tracked branch. No application-source edits or commits were made. Existing unrelated working-tree changes were preserved.
- TypeScript: passed.
- ESLint: passed with zero allowed warnings.
- Jest: 161 suites and 770 tests passed. Jest retained an open handle after completing; the completed test process was terminated to release resources. This is a test-runner cleanup limitation, not a verified device defect.
- Expo Doctor: 18/18 checks passed.
- EAS authentication works; latest iOS production build is finished build 15, created September 11. Its record has no Git commit hash, so exact source-to-binary correspondence remains unverified.
- The current shell uses Node 22.23.0; project instructions specify 20.19.4. Use the project version for a future reproducible build. No new paid/cloud build was started.
- App Store validation reported zero errors, four warnings, and four informational checks. This validator does not establish Paid Apps agreement readiness, successful purchases, or all review assets.

## Apple blockers and next actions

1. Developer Support case `102960684367`: owner reports documents uploaded. Current App Store Connect still displays the former U.S. address. No approval or upload receipt was found in the searched email. The secure upload portal requires another Terms acceptance to proceed, so no duplicate document upload was made.
2. Finance case `22149727`: September 23 email says to activate the Paid Apps agreement using the current tax setup, then submit a corrected W-8/W-9. The actual available W-9 requires a U.S.-person certification under penalties of perjury. Based on the owner's stated non-U.S. status, that certification cannot be supplied truthfully. No W-9, signature, invented TIN, or tax form was submitted. Ask Finance and Developer Support to coordinate an appropriate non-U.S. setup or manual reset.
3. Bank update has remained Processing since September 12. Apple blocks further banking changes until it clears; the Saudi replacement has not been saved. Include the stuck processing state in the Finance escalation.
4. Monthly and annual Folio Plus products remain MISSING_METADATA in the API; subscription review screenshots are still unverified/missing from prior inspection. Localizations/pricing were previously present. Do not use screenshots showing an unavailable/error paywall.
5. Once account setup permits products to load, test build 15 monthly/annual purchase, Restore Purchases, server entitlement sync and limits, reviewer login, and recipe capture/share/reader flows. Upload a clean real paywall screenshot, attach subscriptions to the first app review, and rerun validation.
6. Version 1.0 remains Prepare for Submission. It has not entered Apple review. Manual release is selected.

Prepared two follow-ups in `tmp/release-audit-2026-09-24/apple-follow-ups.md`. Sending approval was requested; check the conversation for the latest authorization and delivery status before acting. The draft document initially contains unsent copy.

## Supabase reliability and security

- Free plan inactivity caused a real production outage. Restoring resolves this outage, but does not prevent another pause. Recommend Pro before App Review; current published base price is $25/month. No payment method is saved in Folio Production. The upgrade options were opened for the owner; no subscription or charge was made.
- The separate September 24 Supabase email concerns explicit grants on NEW public-schema tables starting October 30. It says existing tables retain their grants and no action is needed to keep them accessible. Folio uses the private `nutriai` schema and existing migrations explicitly grant required access. A search found no CREATE TABLE in `public` in the tracked migration set. Do not apply the email's example grants blindly or grant anonymous access to app data.
- Security Advisor: zero errors, ten warnings. Nine concern signed-in access to SECURITY DEFINER RPCs; one is disabled leaked-password protection. These match the earlier audit. Prior source inspection found authentication/ownership guards and fixed search paths; a fresh two-user authorization test was not performed. Revoking legitimate RPC access just to clear warnings could break the app.
- Current CLI project listing succeeded, but separate SQL/functions calls stalled and were terminated after several minutes; the authenticated dashboard was used to verify the live database and deployed functions instead. CLI deployment access remains unverified.

## Remaining verification limits

- Sentry is logged out and no local Sentry API token is configured. A sign-in tab is left for the owner; no fresh crash-free claim is justified.
- No new physical-device, simulator, payment, or live AI-generation test was completed this audit.
- Restoration and unit tests do not establish provider quota, successful extraction/generation, or StoreKit readiness.

## References

- [Supabase pricing and inactivity policy](https://supabase.com/pricing)
- [IRS W-9 instructions and certification](https://www.irs.gov/pub/irs-pdf/fw9.pdf)
- [App Store Connect version](https://appstoreconnect.apple.com/apps/6762021802/distribution/ios/version/inflight)
- [Folio Production billing](https://supabase.com/dashboard/org/aitphpmqulwdevpsoooh/billing)
- [Physical-device checklist](TESTFLIGHT_RELEASE_CHECK.md)
