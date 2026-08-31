# Monetization

This is the source of truth for Nosh plans, App Store products, entitlements, and designed-page capacity. Read it before changing a price, allowance, purchase flow, cookbook limit, or page-generation entry point.

## Launch product

Nosh launches with two plans and one paid feature tier:

| Capability | Nosh Free | Nosh Plus |
|---|---:|---:|
| Cookbooks | 2 | Unlimited |
| Successful designed-page creations | 5 for the life of the account | 20 per UTC calendar month |
| URL, text, image, video, and audio capture | Included | Included |
| Nosh chef, collection context, cooking help, and tools | Included | Included |
| Reading, sharing, and exporting existing pages | Included | Included |

Plus has monthly and annual billing for the same entitlement. The launch merchandising target is USD 9.99 monthly or USD 79.99 annually, but the app never renders those literals. StoreKit, through RevenueCat, supplies the localized price and billing period shown on the purchase screen.

There is no card-required trial, weaker Free model, paid input format, chat-message meter, or consumable page pack at launch. The five Free pages are the product trial.

## What consumes capacity

One unit is settled only when Nosh successfully produces a new ready designed page version. This includes:

- the first designed page for a captured recipe;
- a saved recipe revision;
- a saved copy that needs its own page;
- a requested visual regeneration or preview.

Nosh reserves capacity before calling the image provider so concurrent requests cannot exceed the plan. A provider failure, invalid output, canceled operation, or failed database completion releases that reservation. Replaying the same generation request is idempotent. Publication retry reuses an existing ready page image and consumes nothing else.

Chat, collection search, timers, walkthroughs, substitutions, session-only scaling, source validation, extraction failures, destination choice, corrections, and ordinary reading do not consume designed-page capacity.

Existing pre-migration cookbooks and pages are grandfathered and do not consume the launch allowance. After this foundation ships, every successful designed page advances the account's five-page Free lifetime counter, including pages created while Plus is active. Deleting a page or cookbook does not restore that lifetime use. A downgrade therefore cannot grant a fresh five pages; it blocks only new work when the lifetime counter is full and never hides or deletes finished content.

## Sources of truth

| Concern | Canonical location |
|---|---|
| Stable plan, entitlement, offering, package, and product identifiers | `supabase/functions/_shared/subscriptionCatalog.ts` |
| Server feature allowances | `nutriai.subscription_plan_features` |
| Store-localized price and introductory-offer data | RevenueCat offering returned by StoreKit |
| Current provider entitlement | `nutriai.user_entitlements` |
| Current usage and in-flight reservations | `nutriai.usage_periods` and `nutriai.usage_reservations` |
| User-facing access snapshot | `nutriai.get_subscription_access()` |
| Client purchase and identity lifecycle | `contexts/NoshSubscriptionContext.tsx` |
| Nosh-native purchase and limit presentation | `components/subscription/` |
| Final designed-page enforcement | `generate-page-art` plus the reservation RPCs |
| Cookbook creation enforcement | `nutriai.create_cookbook_for_current_user(...)` |

The TypeScript catalog repeats the launch allowance values only for stable product copy and tests. Database features remain authoritative for access. Do not decide access from RevenueCat client state, a route parameter, a hard-coded price, or a local counter.

## Stable identifiers

These identifiers are public configuration, but they are effectively permanent after release:

| Kind | Identifier |
|---|---|
| RevenueCat entitlement | `nosh_plus` |
| RevenueCat offering | `default` |
| Monthly package | `$rc_monthly` |
| Annual package | `$rc_annual` |
| App Store monthly product | `com.yaz12.nosh.plus.monthly` |
| App Store annual product | `com.yaz12.nosh.plus.annual` |

Create one App Store subscription group. Put monthly and annual at the same subscription level and attach both products to the `nosh_plus` entitlement in RevenueCat. The `default` offering must expose the standard monthly and annual packages.

Set the RevenueCat project restore behavior to **Transfer to new App User ID** for both production and sandbox. Nosh requires an account before purchasing, uses the Supabase UUID as the RevenueCat App User ID, and allows only one Nosh account at a time to own an App Store purchase. Do not use legacy **Share between App User IDs**: it can make one purchase authorize multiple Nosh accounts and therefore multiple independent page allowances. **Keep with original App User ID** is also a poor launch default because it turns a forgotten Nosh login into a billing-support dead end.

Leave App Store Family Sharing **off** at launch. A shared Apple subscription would create separate Nosh accounts with separate server allowances and materially multiply generation cost. Apple does not let a developer turn Family Sharing back off after enabling it, so adding it later requires an explicit product, cost, abuse, privacy, and support design.

## Access flow

```text
App starts with a signed-in Supabase user
  -> RevenueCat configures with that Supabase UUID as the custom app user ID
  -> get_subscription_access returns the server plan and usage
  -> RevenueCat offering supplies localized purchase options

Purchase or explicit restore
  -> App Store confirmation through RevenueCat
  -> sync-subscription re-reads the subscriber from RevenueCat's server API
  -> service-only entitlement RPC applies the newest snapshot
  -> get_subscription_access returns the updated Plus state

Renewal, cancellation, refund, billing issue, expiration, or transfer
  -> RevenueCat webhook with Authorization and HMAC verification
  -> event ID is claimed exactly once
  -> affected RevenueCat subscribers are re-read
  -> entitlement is synchronized or deactivated

Designed-page request
  -> idempotent generation_request
  -> reserve_designed_page_generation
  -> image provider call
     -> success: settle_designed_page_generation
     -> failure: release_designed_page_generation
```

Client RevenueCat state improves responsiveness but never grants server work. The backend verifies RevenueCat independently. The webhook is the durable subscription update path; the authenticated sync function closes the delay immediately after purchase or restore.

## Database model

- `subscription_plans` holds stable plan identities.
- `subscription_plan_features` holds enabled capabilities, allowances, and reset policy.
- `subscription_products` maps immutable store products to a plan and entitlement.
- `user_entitlements` holds the newest normalized RevenueCat snapshot per user and entitlement.
- `subscription_webhook_events` records webhook claims, attempts, completion, and failure for retry-safe processing.
- `usage_periods` stores deletion-stable aggregate counters for a lifetime or calendar-month period. The capped Free lifetime counter advances on every successful post-launch page, while Plus also consumes its active UTC-month counter.
- `usage_reservations` gives each generation request exactly one reserved, settled, or released unit.

Subscription and usage tables use RLS and expose no user writes. The authenticated user reads only the shaped access RPC. Service-role functions own provider synchronization and generation accounting. Authenticated cookbook inserts are revoked; the guarded cookbook RPC is the only creation interface.

Plus capacity resets at 00:00 UTC on the first day of each month. The access snapshot includes the precise `periodEnd`; UI copy formats that date in the user's locale. Free capacity has no reset date. If Plus ends while a generation is in flight, that reservation remains valid but is also counted against the Free snapshot until it settles or releases, preventing a temporary extra slot during downgrade.

## Runtime configuration

Client-safe build variables:

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
```

Launch purchases are iOS App Store only. Leave `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` and `EXPO_PUBLIC_REVENUECAT_WEB_API_KEY` unset in every launch build. A client SDK key is an enablement switch: Android or web must not be enabled until store-specific products exist, those immutable product IDs are mapped to the correct store in `nutriai.subscription_products`, the RevenueCat offering exposes them, and the full purchase/sync/restore flow is verified. Without that server mapping a store purchase could complete while Nosh correctly refuses to grant access. Web remains read-only for subscription state at launch.

RevenueCat public SDK keys may be bundled in the app. Secret API and webhook values must remain Supabase secrets:

```text
REVENUECAT_SECRET_API_KEY=sk_...
REVENUECAT_WEBHOOK_AUTH_TOKEN=<random secret without the Bearer prefix>
REVENUECAT_WEBHOOK_SIGNING_SECRET=<RevenueCat HMAC signing secret>
REVENUECAT_ACCEPT_SANDBOX_EVENTS=true
```

Configure the RevenueCat webhook URL as:

```text
https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook
```

Set its Authorization value to `Bearer <REVENUECAT_WEBHOOK_AUTH_TOKEN>` and enable HMAC signing. Verified sandbox snapshots are accepted by default because TestFlight and App Review purchases use Apple’s sandbox against the production binary. The environment remains persisted on the entitlement and webhook event for audit. `REVENUECAT_ACCEPT_SANDBOX_EVENTS=false` is an emergency kill switch, not the production default; enabling it during review would make Apple’s purchase test fail.

## App Store Connect and RevenueCat checklist

Before the purchase UI is enabled in a release build:

1. Accept the Paid Apps Agreement and complete banking and tax information.
2. Create the subscription group and both products with the exact identifiers above.
3. Put monthly and annual at the same subscription level; add localized names, descriptions, prices, review screenshots, and availability. Leave Family Sharing off.
4. Create the RevenueCat iOS app with bundle ID `com.yaz12.nosh` and upload the required App Store Connect credentials.
5. Attach both products to `nosh_plus` and the `default` offering. Set production and sandbox restore behavior to **Transfer to new App User ID**, never legacy sharing.
6. Add the public iOS SDK key to the EAS build environment.
7. Set all four backend secrets, deploy the migration, then deploy `sync-subscription`, `revenuecat-webhook`, `delete-account`, `generate-page-art`, and `capture-recipe`.
8. Configure and test the authorized, HMAC-signed webhook.
9. Verify purchase, cancellation, renewal, billing retry, grace, expiration, refund, transfer, restore, account switching, and account deletion in sandbox and TestFlight. Use a second Nosh account to prove a transfer removes the former owner's access.
10. Add `EXPO_PUBLIC_SUPPORT_EMAIL` as a monitored private billing-support inbox. Never ask users to post receipts, transaction IDs, or account details to the public issue tracker.
11. Put the Privacy Policy and Terms of Use URLs in App Store metadata and verify the in-app links. Have launch counsel review the project-specific Terms and Privacy drafts before submission.
12. Update the App Store Connect privacy questionnaire for linked **User ID** and **Purchase History** used for app functionality; the local privacy manifest does not replace the questionnaire.
13. Add the first subscription group and both products to the same App Review submission as the launch build. Include reviewer steps and a screenshot showing the Nosh Plus screen.
14. Connect `utils/analytics.ts` to the approved production analytics sink before relying on conversion events. Keep the documented subscription event properties content-free.

The EAS `development` profile uses bundle ID `com.yaz12.nosh.dev`, so it cannot exercise the production App Store product configuration by accident. Give that variant a separate RevenueCat app or Test Store key when local native purchase testing is needed. Preview and production must use only the `com.yaz12.nosh` App Store app key.

The app fails closed when the SDK key, offering, backend secret, or server snapshot is unavailable. Existing content remains readable; new capacity-controlled work waits until access can be verified.

## Changing the model later

### Allowance or feature change

Add a migration that updates `subscription_plan_features`. `usage_periods.allowance` is a period snapshot, so decide explicitly whether the change applies only to newly created periods or also updates compatible current periods. A Free lifetime period never recreates itself; an immediate Free allowance increase requires updating those existing period rows as part of the migration.

Update user-facing catalog copy and tests in the same change. Never patch a number independently in a screen.

### Price change

Change the App Store price and RevenueCat merchandising. No database migration is needed when the product identifiers and entitlement stay the same. Continue to render the localized store price.

### Promotion or introductory offer

Configure eligibility and offer terms in App Store Connect and RevenueCat. The package adapter exposes introductory terms only when RevenueCat explicitly reports that the current user is eligible; unknown and ineligible results show standard pricing. Keep duration, renewal price, and eligibility in the centralized package presentation. Keep the base Plus entitlement and server allowance unchanged unless the promotion explicitly changes capacity.

### Additional paid plan

Add the plan and feature rows, map new immutable products, extend the shared plan type, define upgrade and downgrade behavior in the subscription group, and add explicit UI presentation for the new comparison. Keep one server access snapshot and the same generation reservation seam.

### Consumable page pack

Do not place purchased units in `usage_periods`. App Store consumables cannot expire. If page packs are introduced, add a separate non-expiring purchased-unit ledger and consume the resetting plan allowance before that balance. Preserve exact purchase and spend idempotency.

## Release verification

At minimum, verify:

- a Free user can create two books and five successful pages, with failures released;
- concurrent generation cannot exceed the allowance;
- the third book and sixth Free page preserve the user's draft and open the correct Plus explanation;
- a Plus user gets 20 pages in a UTC month and sees the reset date at the limit;
- purchase cancellation is silent and preserves the blocked action;
- a successful purchase or restore synchronizes before the blocked action resumes once;
- cancellation keeps Plus through the paid-through date, and expiration falls back to Free without hiding content;
- webhook duplicates and retries are idempotent, and transfers clear the old account before granting the new one;
- ordinary webhook aliases resolve one Nosh account, while an explicit transfer clears the old owner before granting the new one;
- sign-out and account switching never show another user's plan;
- account deletion warns that App Store renewal is separate, erases the RevenueCat subscriber, and still allows immediate deletion;
- localized annual price is primary, restore works, and Terms and Privacy links open.
