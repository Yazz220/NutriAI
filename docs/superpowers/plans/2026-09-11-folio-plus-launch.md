# Folio Plus Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch Folio Plus with 40 successful designed-page creations per UTC calendar month at USD 9.99 monthly or USD 89.99 annually, fully wired through App Store Connect, RevenueCat, Supabase, EAS, TestFlight, and App Review.

**Architecture:** Keep the existing single `nosh_plus` entitlement and monthly/annual products. Change the server-authoritative Plus allowance through a forward-only database migration, mirror it in the shared catalog and user-facing copy, then verify the purchase lifecycle across RevenueCat and Supabase before creating the final iOS build. StoreKit remains authoritative for localized price display; no hard-coded price is added to the app.

**Tech Stack:** Expo SDK 54, React Native, TypeScript, Supabase/Postgres/Edge Functions, RevenueCat, EAS, App Store Connect.

---

### Task 1: Change the Plus allowance contract

**Files:**
- Create: `supabase/migrations/<generated>_increase_plus_designed_pages_to_40.sql`
- Modify: `supabase/functions/_shared/subscriptionCatalog.ts`
- Modify: `components/subscription/SubscriptionPaywallSheet.tsx`
- Modify: `docs/MONETIZATION.md`
- Modify: `docs/PRODUCT_FLOW.md`
- Test: `supabase/tests/subscription_foundation.sql`
- Test: `__tests__/components/subscription/SubscriptionPaywallSheet.test.tsx`

- [x] **Step 1: Add failing assertions for the 40-page contract**

  Update the subscription SQL test to expect `allowance = 40` for the Plus `designed_pages` feature and update the paywall test to expect “40 designed page creations each month.”

- [x] **Step 2: Run the focused tests and verify they fail against the current 20-page implementation**

  Run: `npm test -- --runInBand __tests__/components/subscription/SubscriptionPaywallSheet.test.tsx`

  Expected: FAIL because the paywall still advertises 20 pages.

- [x] **Step 3: Generate and implement the forward migration**

  Run: `npx supabase migration new increase_plus_designed_pages_to_40`

  Add an idempotent update of `nutriai.subscription_plan_features` for plan `plus`, feature `designed_pages`, setting `allowance = 40`, while also updating the current open Plus calendar-month `usage_periods` rows to 40 so existing subscribers receive the increase immediately.

- [x] **Step 4: Update the mirrored catalog and every active user-facing 20-page statement**

  Change `designedPagesPerPeriod` to `40`, update every paywall reason and benefit statement, and update canonical monetization/product-flow documentation. Keep the historical pricing research unchanged because it is a dated record.

- [x] **Step 5: Run focused subscription tests**

  Run: `npm test -- --runInBand __tests__/components/subscription/SubscriptionPaywallSheet.test.tsx __tests__/components/subscription/SubscriptionPlanCard.test.tsx __tests__/components/subscription/SubscriptionHost.test.tsx __tests__/contexts/NoshSubscriptionContext.test.tsx __tests__/utils/subscriptions`

  Expected: all focused tests pass.

### Task 2: Apply and verify the production Supabase subscription backend

**Files:**
- Verify: `supabase/migrations/`
- Verify: `supabase/functions/sync-subscription/`
- Verify: `supabase/functions/revenuecat-webhook/`
- Verify: `supabase/functions/delete-account/`
- Verify: `supabase/functions/generate-page-art/`
- Verify: `supabase/functions/capture-recipe/`

- [x] **Step 1: Reauthenticate the Supabase CLI to the Folio Production organization and link project `jqngtejmhoibnzlzjlir`**

  Confirm `npx supabase projects list` shows Folio and that the linked ref is `jqngtejmhoibnzlzjlir` before any production write.

- [x] **Step 2: Confirm migration alignment and push the allowance migration**

  Run: `npx supabase migration list --linked`

  Run: `npx supabase db push --linked --include-all`

  Expected: only the new 40-page migration is applied.

- [x] **Step 3: Verify required production secrets by name**

  Confirm `REVENUECAT_SECRET_API_KEY`, `REVENUECAT_WEBHOOK_AUTH_TOKEN`, `REVENUECAT_WEBHOOK_SIGNING_SECRET`, and `REVENUECAT_ACCEPT_SANDBOX_EVENTS` exist without printing their values. Also confirm AI, acquisition, art, Sentry, and Apple deletion secrets required by the active functions.

- [x] **Step 4: Deploy the subscription-dependent functions**

  Deploy `sync-subscription`, `revenuecat-webhook`, `delete-account`, `generate-page-art`, and `capture-recipe` to `jqngtejmhoibnzlzjlir`.

- [ ] **Step 5: Verify database access and function health**

  Query the Plus feature row and confirm `allowance = 40`. Exercise the authenticated subscription access path with a disposable review/test account and confirm function logs contain no new errors.

### Task 3: Finalize RevenueCat

**External configuration:** RevenueCat project for bundle ID `com.yaz12.nosh`.

- [ ] **Step 1: Confirm the production iOS app and public SDK key**

  Verify the RevenueCat iOS app bundle ID is `com.yaz12.nosh` and the public SDK key matches the production EAS environment.

- [ ] **Step 2: Confirm products and entitlement**

  Attach `com.yaz12.nosh.plus.monthly` and `com.yaz12.nosh.plus.annual` to entitlement `nosh_plus`.

- [ ] **Step 3: Confirm the default offering**

  Ensure offering `default` contains `$rc_monthly` and `$rc_annual`, with annual presented first by the app.

- [ ] **Step 4: Configure ownership behavior and webhook**

  Set restore behavior to **Transfer to new App User ID** for production and sandbox. Configure the production Supabase `revenuecat-webhook` URL with matching authorization and signing secrets.

- [ ] **Step 5: Send and verify a sandbox webhook event**

  Confirm the event is accepted once, duplicates are idempotent, and the corresponding entitlement snapshot reaches Supabase.

### Task 4: Finalize App Store Connect subscriptions and commercial agreements

**External configuration:** App Store Connect app ID `6762021802`.

- [ ] **Step 1: Complete account-level commercial requirements**

  Verify the Paid Apps Agreement is active, tax and banking are complete, and the Digital Services Act trader declaration is complete. Pause only for legal attestations, identity verification, tax forms, banking confirmation, or 2FA that require the account holder.

- [ ] **Step 2: Configure the Folio Plus subscription group**

  Put both products at the same subscription level. Keep Family Sharing off and provide English (U.S.) localization.

- [ ] **Step 3: Configure prices**

  Set the U.S. monthly base price to USD 9.99 and annual base price to USD 89.99, accepting Apple’s storefront-equivalent pricing unless a storefront requires manual correction. Add no introductory offer.

- [ ] **Step 4: Complete subscription review information**

  Add display names, descriptions, availability, and an accurate review screenshot showing the Folio Plus purchase screen.

- [ ] **Step 5: Publish the prepared App Privacy label**

  Reconfirm Purchase History and User ID disclosures for app functionality, no tracking, and publish the prepared answers.

### Task 5: Run release gates and produce the final TestFlight build

**Files:**
- Verify: `app.json`
- Verify: `eas.json`
- Verify: `.env` and EAS production environment (secret values are never committed)

- [ ] **Step 1: Confirm production configuration**

  Verify production Supabase URL/key, RevenueCat public key, Sentry environment, support email, no auth bypass, no demo cookbook, version 1.0.0, and an iOS build number greater than 14.

- [ ] **Step 2: Run automated release gates**

  Run: `npm test -- --runInBand`

  Run: `npm run typecheck`

  Run: `npm run lint`

  Run: `npx expo-doctor`

  Run: `npx expo export --platform ios --output-dir dist-release-ios`

  Expected: all commands pass; document any non-blocking warning explicitly.

- [ ] **Step 3: Build and submit the final candidate to TestFlight**

  Run: `npx eas-cli build --profile production --platform ios --auto-submit`

  Expected: EAS creates the next iOS build and App Store Connect finishes processing it for TestFlight.

- [ ] **Step 4: Perform the device acceptance test**

  On a clean TestFlight installation, verify sign-up/Sign in with Apple, consent, cookbook creation, each supported capture path, page generation, reader/cache, chat, purchase, restore, account switching, offline/retry behavior, sign-out/in, and disposable-account deletion.

### Task 6: Prepare and submit App Review

**Files:**
- Modify: `docs/APP_STORE_REVIEW_NOTES.md`
- Modify: `docs/launch/RELEASE_STATUS_2026-09-05.md`

- [ ] **Step 1: Create and seed the dedicated App Review account**

  Seed one or two finished cookbooks/pages and enter credentials only in App Store Connect.

- [ ] **Step 2: Finalize reviewer notes**

  Describe sign-in, AI consent, recipe capture, the 40-page Plus allowance, purchase/restore, account deletion, and any test-source constraints. Do not include secrets in the repository.

- [ ] **Step 3: Attach the build and both subscriptions**

  Select the final processed build, answer export compliance, attach the first subscription group/products to the same submission, and fill App Review contact details.

- [ ] **Step 4: Submit with manual release enabled**

  Resolve every App Store Connect validation error, submit for review, and keep manual release selected so approval does not publish Folio unexpectedly.

- [ ] **Step 5: Update the release handoff**

  Record the final build number, commit, TestFlight result, subscription status, submission timestamp, and any remaining account-holder action.
