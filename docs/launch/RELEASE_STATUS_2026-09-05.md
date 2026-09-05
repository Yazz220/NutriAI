# Folio release status — 2026-09-05

This is the active handoff for moving the current release candidate to App Store submission. Historical launch plans remain useful background, but this file records the current state.

## Current candidate

- Version: 1.0.0
- iOS build number: 14
- Candidate commit: `f926e1057`
- A production/TestFlight build exists from this commit.
- Build/submission queue monitoring is intentionally out of scope for this pass.
- Subscription products, allowances, paywall validation, and final billing copy are intentionally deferred until the planned final subscription pass. Build 14 is therefore a validation candidate, not the final submission binary.

## Completed or prepared

- App name, icon, bundle identifiers, version, build number, Sign in with Apple, privacy manifest, encryption declaration, and iPhone-only configuration are present.
- Privacy policy, terms, support, AI consent, account deletion, restore/manage subscription surfaces, and content-report entry points exist in the app.
- English (U.S.) product-page copy and version 1.0 release notes are drafted in `APP_STORE_PRODUCT_PAGE_2026-09.md`.
- The selected App Store screenshot campaign is the dark second concept in `marketing/app-store/2026-09-05-native/final-contrast/`.
- Seven selected screenshots are exported at 1290 × 2796, RGB, without alpha. The upload archive is `folio-app-store-midnight-contrast-1290x2796.zip`.
- App Review notes describe the current shelf/reader and capture flows and use placeholders instead of committed credentials.
- The next build configuration no longer requests the unused camera permission; existing Photo Library capture remains unchanged.
- `folio.cookbook.help@outlook.com` is the monitored support address and is configured as `EXPO_PUBLIC_SUPPORT_EMAIL` in the production EAS environment.
- The Folio support, privacy, and terms pages are published at `https://yazz220.github.io/folio-support/`; all public pages were verified over HTTPS.
- App Store Connect now uses the accepted customer-facing name `Folio: Personal Cookbooks`, the subtitle `Recipes become cookbooks`, and the primary category `Food & Drink`.
- The seven selected 1290 × 2796 screenshots are uploaded to the iPhone 6.9-inch display slot in numbered order; App Store Connect reuses that set for the 6.5-inch display.
- Promotional text, description, keywords, support URL, copyright (`© 2026 Yasir Alrutui`), and manual release are saved on the version 1.0 page.
- The privacy-policy URL and third-party content-rights declaration are saved.
- The age-rating questionnaire is saved (13+ in most storefronts, with Apple's regional variations).
- The app is free and available in all 175 storefronts. Apple Silicon Mac distribution is disabled; the current version is already incompatible with Apple Vision Pro.
- The App Privacy data inventory and per-type answers are complete in draft: 12 disclosed data types, no tracking, linked-to-user treatment where applicable, and RevenueCat purchase analytics included. The public privacy label has not yet been published.

### App Privacy draft

- App functionality, linked to the user, not used for tracking: name, email address, photos or videos, audio data, other user content, search history, product interaction, crash data, performance data, and other diagnostic data.
- App functionality and analytics, linked to the user, not used for tracking: user ID and purchase history.
- Not declared because the current app does not collect them: advertising data or identifiers, location, contacts, health or fitness data, financial payment details, browsing history, or sensitive information.

## Local validation completed on 2026-09-05

- `npm test -- --runInBand`: 152 suites passed, 721 tests passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npx expo-doctor`: 18/18 checks passed.

The successful Jest run still emits a non-failing worker-teardown warning. It is worth cleaning up later, but it does not block this candidate or leave a failed test.

## Sentry validation on 2026-09-05

- The local read-only Sentry connection is configured outside the repository; no Sentry API token is committed.
- Sentry has no unresolved `production` or `preview` issues in the last 14 days.
- Two local-development `nosh-chat` 401 events exposed a stale-session path. The client now refreshes the Supabase session and retries the stream once; focused tests cover recovery and the no-loop case. This fix is newer than build 14 and will be included in the final post-subscription build.
- A local Metro transform event pointed to a temporary malformed edit in `BookReader.tsx`. A fresh full iOS export succeeds, so no additional code change is required.
- The remaining native unmount groups are limited to development build 13 on an iOS beta. They have not appeared in build 14 or either release environment. Monitor during final TestFlight validation instead of applying an unverified reader change.
- The production EAS environment contains the secret used by the Sentry build plugin to upload release artifacts.

## Must be finished before the final build

### User/account-side decisions

- Complete the planned subscription pass, including final products, allowances, copy, purchase, restore, entitlement synchronization, and App Review instructions.
- Create and seed a dedicated App Review account. Enter its credentials directly in App Store Connect; do not commit them.

### App Store Connect

- Review and publish the prepared App Privacy label. No advertising identifier or tracking is used by the current app.
- Complete the Digital Services Act trader-status declaration at the account level. This requires the account holder's legal determination and verification details.
- Sign the Paid Apps Agreement and complete tax and banking setup before submitting paid subscriptions. The Free Apps Agreement is active, but the Paid Apps Agreement is currently unsigned.
- Confirm export compliance when the final build is attached. `ITSAppUsesNonExemptEncryption` is already set to `false`; no encryption documentation is currently indicated.
- Attach the final build and all submitted in-app purchases/subscriptions to the version.
- Fill App Review contact details, review credentials, and the final reviewer notes.
- Keep manual release selected for the first launch unless there is a deliberate launch date and coordinated release plan.

### Final validation

- Test the final subscription configuration on a fresh TestFlight account and on an account with purchase history.
- Run one clean-device path: install, sign up/Sign in with Apple, consent, create/open cookbook, import each supported launch source type, generate/read a page, ask Folio, restore purchase, sign out/in, and delete the disposable account.
- Test offline/retry behavior and verify that no developer/demo bypasses or private test content appear in the final binary.
- Re-run `npm test`, `npm run typecheck`, `npm run lint`, and `npx expo-doctor` after the final subscription changes and before building.

## Not a launch blocker today

- Further screenshot polish, additional localizations, an App Preview video, a marketing website, and Product Page Optimization can follow after submission unless an existing asset makes an inaccurate product claim.
- `npm audit --omit=dev` reports transitive advisories in the Expo/React Native toolchain. The automated remedy is a major Expo SDK jump, so no forced upgrade was applied during release stabilization. Reassess against the next supported Expo SDK after launch rather than destabilizing the submission build.
