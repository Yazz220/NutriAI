# Observability

Folio uses Sentry as a focused error, performance, and external-service diagnostic layer. Supabase remains the source for platform invocation and database logs; Sentry groups actionable failures and shows the client or provider context needed to identify the failing layer quickly.

## Projects

| Sentry project | Scope |
|---|---|
| `folio-mobile` | Expo/React Native JavaScript errors, native crashes, navigation timing, app hangs, slow/frozen frames, and explicitly captured application errors |
| `folio-backend` | Supabase Edge Function errors, including classified provider, configuration, authentication, quota, rate-limit, timeout, invalid-response, and availability failures |

The client initializes Sentry in `utils/observability/sentry.ts`. Edge Functions report through `supabase/functions/_shared/log.ts`, which preserves Supabase JSON logs and forwards error-level events to the shared Sentry adapter.

## Privacy contract

- Do not send recipe source text, prompts, transcripts, media, generated images, request bodies, credentials, email addresses, or URL query strings.
- Sentry receives only the authenticated user's opaque Supabase ID.
- Mobile screenshots and view-hierarchy attachments are disabled.
- Session Replay is disabled. Do not enable it until masking is verified on representative iOS devices, including iOS 26, and the privacy disclosure has been reviewed.
- UI and console breadcrumbs are dropped. Navigation and network breadcrumbs are scrubbed before transmission.
- Trace headers are sent only to Folio's Supabase project and localhost, never to pasted recipe URLs or third-party providers.

Client-side scrubbing lives in `utils/observability/privacy.ts`. Edge Function scrubbing and external-failure classification live in `supabase/functions/_shared/sentry.ts`. Sentry's server-side default data scrubbing and IP-address scrubbing should remain enabled as a second boundary.

## Configuration

Client-safe build variables:

```text
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development|preview|production
```

Supabase Edge Function secrets:

```text
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
```

Build-only protected EAS secret:

```text
SENTRY_AUTH_TOKEN=
```

The Expo config plugin points to organization `all-ot` and project `folio-mobile`. Metro starts from Sentry's Expo config and then applies Folio's existing SVG transformer so source maps remain compatible without changing asset behavior.

## Failure taxonomy

Backend errors receive a `failure.category` tag:

- `authentication`: invalid or rejected provider credentials
- `configuration`: a required provider or model setting is missing
- `quota`: provider credit, billing, or usage exhaustion
- `rate_limit`: HTTP 429 or equivalent throttling
- `timeout`: an aborted or expired provider call
- `unavailable`: provider HTTP 5xx or temporary service outage
- `invalid_response`: schema, parse, validation, or empty-response failures
- `unknown`: application or provider failures that do not yet fit a stable category

Known provider calls add `provider`, `provider.operation`, `provider.model`, and `http.status_code` tags where available. Tags must remain low-cardinality; never use a user ID, page ID, URL, error message, or recipe title as a tag.

## Incident triage

1. Start in `folio-mobile` if the symptom is a crash, frozen interaction, navigation delay, or a client request that never starts.
2. Start in `folio-backend` if capture or generation reached an Edge Function and failed.
3. Filter backend issues by `provider` and `failure.category`. A quota or authentication result is operational; an invalid response usually points to a model or parser contract; an unknown result needs application investigation.
4. Use the event timestamp and function message to correlate with Supabase Edge Function Invocations and Logs.
5. Check the provider's own status/billing console only after the category identifies that layer.

## Verification

- Run `npm run typecheck` and the privacy-scrubber test.
- Start Expo with the mobile DSN configured and confirm the app opens normally.
- Capture one intentional development-only exception, confirm it appears in `folio-mobile`, then remove the trigger.
- Invoke a development-only Edge Function error and confirm it appears in `folio-backend` with `failure.category` and no recipe/source data, then remove the trigger.
- Build a preview after `SENTRY_AUTH_TOKEN` is stored in EAS and verify the event stack is symbolicated.

Do not leave intentional crash routes, buttons, or provider failures in a release build.
