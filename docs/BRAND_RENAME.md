# Folio name migration

Folio is the product name and the identity of the assistant inside the app. Nosh was the early working name used before the cookbook product identity settled.

## Current language

- App name: Folio
- Assistant name: Folio
- Product description: a personal cookbook that captures, organizes, and helps people cook from their recipes
- User-facing plan names: Folio Free and Folio Plus

Do not introduce Nosh in user-facing copy, prompts, support text, store metadata, generated recipe commentary, or current product documentation.

## Compatibility identifiers

The rename does not require an internal rewrite. Keep existing identifiers when changing them could break stored data, deep links, builds, billing, deployed functions, or database history. Current examples include:

- the `nosh://` URL scheme and `com.yaz12.nosh` bundle and package identifiers
- the `nosh-chat` Edge Function and related file paths
- `Nosh*`, `useNosh*`, and `NOSH_*` TypeScript exports
- device storage keys and persisted conversation data containing `nosh`
- RevenueCat product and entitlement identifiers containing `nosh`
- database migrations, SQL objects, test fixtures, and historical records
- retired brand files whose paths contain `nosh`

These names are implementation history, not product language. New internal code should follow the surrounding module's existing naming unless a broader compatibility migration has been planned and tested.

## Retired visual assets

The open-book symbol, character, colors, and typography carry forward to Folio. Wordmarks and lockups that visibly spell Nosh are retired. They remain in `brand/` as provenance but the app must not render them. The official Folio wordmark and horizontal lockup are the transparent PNG masters supplied on 1 September 2026. Icon-only placements continue to use the unchanged open-book symbol.

## Build note

The Expo app name and share-extension display name now use Folio. Existing generated native projects may still contain the old target names until the next clean prebuild. Bundle identifiers, app groups, and the URL scheme intentionally remain unchanged.
