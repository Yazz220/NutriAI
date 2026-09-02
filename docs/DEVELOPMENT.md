# Development

## Prerequisites

- Node `20.19.4` from `.nvmrc`.
- npm. Use `npm install --legacy-peer-deps`.
- Expo CLI through `npx expo`.
- Supabase project with the base SQL from `supabase/sql/` applied in order, followed by tracked files in `supabase/migrations/`.
- EAS CLI for device builds and App Store/TestFlight builds.

## Daily Commands

```bash
npm install --legacy-peer-deps
npx expo start
npx expo start --web --port 8081
npx expo start --lan
npm test
npm run test:watch
npm run eval:ingestion
npm run typecheck
npm run lint
```

The dev server connects to the Folio dev build on device. Web preview is useful for reader layout work, but iOS device builds are still required for native auth and platform checks.

Before a Phase 9 release, follow `docs/PHASE9_RELEASE_RUNBOOK.md`. A passing web preview does not satisfy the native-share, dynamic-type, screen-reader, reduced-motion, or representative-device gates.

Before changing capture or generation, read `docs/PRODUCT_FLOW.md` and ADR 0002. The app has one capture pipeline and one complete-page generator.

Before changing an ingestion model, provider, prompt, parser, transcription adapter, or normalizer, read `docs/INGESTION_EVALS.md` and run `npm run eval:ingestion`. A release candidate must also run `npm run eval:ingestion:live` against the deployed candidate with the unchanged versioned corpus.

## Environment

Client-safe `.env` keys:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=qwen/qwen3.6-35b-a3b
EXPO_PUBLIC_ART_MODEL=qwen/qwen-image-3-pro
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_SENTRY_ENVIRONMENT=development
EXPO_PUBLIC_SUPPORT_EMAIL=
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2=false
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_...
```

`EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2` changes conversation presentation only. It must not select a different capture, extraction, or page-generation implementation.

Only `EXPO_PUBLIC_*` values are bundled into the app. The RevenueCat iOS value is a public SDK key. `EXPO_PUBLIC_SUPPORT_EMAIL` must be a monitored private inbox in release builds; Settings otherwise falls back to the public support page. Keep Android and web RevenueCat keys unset for the App Store launch; `docs/MONETIZATION.md` defines the store-mapping work required before enabling them. Never put secret provider keys or service-role keys in client env vars.

Supabase Edge Function secrets:

| Secret | Used by |
|---|---|
| `AI_API_KEY` | `extract-recipe`, `nosh-chat` |
| `AI_API_BASE` | `extract-recipe`, `nosh-chat` |
| `AI_MODEL` | `extract-recipe`, `nosh-chat` |
| `VIDEO_MODEL` | optional video-specific override for `extract-recipe`; defaults to `AI_MODEL` |
| `AUDIO_TRANSCRIPTION_MODEL` | speech-to-text model used by `capture-recipe`; defaults to `openai/whisper-large-v3` |
| `AUDIO_TRANSCRIPTION_API_BASE` | optional OpenAI-compatible speech-to-text base URL; defaults to `AI_API_BASE` |
| `AUDIO_TRANSCRIPTION_API_KEY` | optional speech-to-text provider key; defaults to `AI_API_KEY` |
| `VIDEO_TRANSCRIPTION_MODEL` | direct-media speech-to-text model used for uploaded and direct-file video; defaults to ElevenLabs `scribe_v2` |
| `VIDEO_TRANSCRIPTION_API_BASE` | optional direct-media speech-to-text base URL; defaults to `https://api.elevenlabs.io/v1` |
| `VIDEO_TRANSCRIPTION_API_KEY` | server-only direct-media speech-to-text credential required for narrated uploaded and direct-file video |
| `SOCIAL_VIDEO_ACQUISITION_PROVIDER` | optional external social-video evidence adapter; `guided` by default, `supadata` enables the current adapter |
| `SUPADATA_API_KEY` | server-only Supadata credential used only when the provider is `supadata` |
| `SUPADATA_API_BASE` | optional Supadata base URL; defaults to `https://api.supadata.ai/v1` |
| `SUPADATA_ENABLED_PLATFORMS` | optional comma-separated allowlist; defaults to `youtube,tiktok,instagram,facebook` |
| `ART_MODEL` | `generate-page-art` |
| `SENTRY_DSN` | privacy-scrubbed Edge Function errors and provider failure diagnostics |
| `SENTRY_ENVIRONMENT` | optional environment label; defaults to `production` |
| `APPLE_CLIENT_ID` | `delete-account` |
| `APPLE_TEAM_ID` | `delete-account` |
| `APPLE_KEY_ID` | `delete-account` |
| `APPLE_PRIVATE_KEY` | `delete-account` |
| `REVENUECAT_SECRET_API_KEY` | `sync-subscription`, `revenuecat-webhook`, `delete-account` |
| `REVENUECAT_WEBHOOK_AUTH_TOKEN` | `revenuecat-webhook`; configured bearer token without the `Bearer ` prefix |
| `REVENUECAT_WEBHOOK_SIGNING_SECRET` | `revenuecat-webhook`; RevenueCat HMAC signing secret |
| `REVENUECAT_ACCEPT_SANDBOX_EVENTS` | subscription functions; verified sandbox is accepted by default for TestFlight and App Review; set `false` only as an emergency kill switch |

Supabase also provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to functions that need them.

Sentry uses separate `folio-mobile` and `folio-backend` projects in the `all-ot` organization. The mobile DSN is client-safe; `SENTRY_AUTH_TOKEN` is build-only and must be stored as a protected EAS environment secret so release source maps and native symbols can be uploaded. Never commit the token. See [OBSERVABILITY.md](./OBSERVABILITY.md) for privacy, verification, and incident-triage details.

## Routes To Know

```text
app/_layout.tsx
app/(auth)/index.tsx
app/(auth)/sign-in.tsx
app/(auth)/sign-up.tsx
app/(auth)/forgot-password.tsx
app/(book)/index.tsx
app/(book)/library.tsx
app/(book)/settings.tsx
app/(book)/[cookbookId]/index.tsx
app/(book)/[cookbookId]/add.tsx
app/(book)/[cookbookId]/review.tsx
app/(book)/[cookbookId]/generation/[pageId].tsx
```

The reader contains a bookplate and recipe pages. The table of contents has been retired; review and generation routes are compatibility redirects.

## Provider Order

Keep the root provider order in `app/_layout.tsx` aligned with the live tree:

```text
ShareIntentProvider
  NoshNativeShareProvider
    QueryClientProvider
      NoshSubscriptionProvider
        SubscriptionUiProvider
          CookbooksProvider
            NoshConversationProvider
              ToastProvider
                GlobalErrorBoundary
                  RootLayoutNav
```

`RootLayoutNav` owns the auth redirect logic with `useAuth()` and renders the root Expo Router stack inside `GestureHandlerRootView` and `SafeAreaProvider`.

## App State Conventions

- Shelf data comes from `useCookbooks`.
- One-book reader state comes from `useCookbook(cookbookId)`.
- Durable import state, polling, retry, and destination choice come from `useRecipeCaptures`.
- Server-authoritative plan and usage plus StoreKit/RevenueCat state come from `useNoshSubscription`; feature surfaces request access through `useSubscriptionUi`.
- Assistant chat uses `@assistant-ui/react-native` `LocalRuntime` bridging to `nosh-chat` via `utils/cookbook/noshChatAdapter.ts`.
- Server state belongs in TanStack React Query.
- Shelf and per-book page caches belong in `utils/cookbook/cache.ts`.

## Edge Functions

Deploy one function:

```bash
supabase functions deploy <function-name> --project-ref <PROJECT_REF>
```

Tail logs:

```bash
supabase functions logs <function-name> --project-ref <PROJECT_REF>
```

Live functions:

- `extract-recipe`
- `capture-recipe`
- `nosh-chat`
- `report-ai-response`
- `generate-page-art`
- `credits` (legacy endpoint; not used by the active client or generation path)
- `delete-account`
- `delete-reader-content`
- `sync-subscription`
- `revenuecat-webhook` (`verify_jwt = false`; verifies RevenueCat Authorization and HMAC itself)

Deploy migrations before deploying Edge Functions that depend on new columns, constraints, buckets, or RPCs. Apply `20260830174134_version_recipe_capture_stages.sql` before the matching capture workers, and apply `20260830210000_add_permissioned_video_captures.sql` before enabling video file selection in the mobile build.

Apply `20260831011239_subscription_foundation.sql` before deploying subscription-aware `generate-page-art`, `capture-recipe`, `sync-subscription`, or `revenuecat-webhook`. Follow [MONETIZATION.md](./MONETIZATION.md) for App Store Connect, RevenueCat, webhook, EAS environment, and sandbox setup. Use TestFlight to exercise the real launch products. The `development` profile has bundle ID `com.yaz12.nosh.dev`; it needs its own matching RevenueCat app/Test Store configuration and profile-specific public key. Never put a test key in preview or production. Expo Go can preview only unavailable/loading presentation, not native purchasing.

### Temporary pre-launch capacity override

The currently linked pre-launch database temporarily gives Folio Free accounts 100 cookbooks and 100 lifetime designed pages so end-to-end development is not blocked by the purchase flow. This is operational test data, not a migration or launch-plan change. Before a production release, restore `nutriai.subscription_plan_features` to the canonical values in [MONETIZATION.md](./MONETIZATION.md): 2 Free cookbooks and 5 lifetime Free designed pages. Refresh `get_subscription_access()` after either change so clients do not retain a stale allowance snapshot.

`APPLE_PRIVATE_KEY` is the Sign in with Apple `.p8` key. Store it as an Edge Function secret with literal newlines or escaped `\\n`; never put it in an Expo environment variable. The deletion function exchanges the fresh authorization code supplied by iOS and calls Apple's revocation endpoint before removing Supabase data.

## EAS Builds

`app.config.js` reads `APP_VARIANT`:

| Profile | App name | Bundle ID | Scheme |
|---|---|---|---|
| development | Folio (Dev) | `com.yaz12.nosh.dev` | `nosh` |
| preview | Folio | `com.yaz12.nosh` | `nosh` |
| production | Folio | `com.yaz12.nosh` | `nosh` |

```bash
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios
```

## Code Conventions

- Use the `@/` path alias for cross-folder imports.
- Use `constants/colors.ts`, `constants/spacing.ts`, and `constants/cookbookStyles.ts` for styling.
- Keep API keys in Edge Function secrets.
- Add only packages with config plugins to the `app.json` plugins array. Check for `node_modules/<pkg>/app.plugin.js` before adding one.
- Keep cookbook-domain helpers in `utils/cookbook/*`.
- Add focused tests for pure cookbook utilities.

## Sample Book

`utils/cookbook/sampleCookbook.ts` provides static cookbooks and pages. The shelf and empty state expose sample preview paths so reader UI can be checked without database writes, parser calls, or provider generation.

## Common Pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| `npm install` fails | peer dependency mismatch | rerun with `npm install --legacy-peer-deps` |
| Signed-in user returns to auth | auth guard or session state changed | inspect `app/_layout.tsx` and `useAuth` |
| Shelf stays empty after creating a book | migration/RLS issue | verify `supabase/sql/20260505_multi_cookbook.sql` and RLS policies |
| Import fails with 401 | missing Supabase JWT | call through `callAuthenticatedFunction` |
| Generated page has no image | missing `ART_MODEL` secret, OpenRouter failure, or an unselected page version | check `generate-page-art` logs, `generation_requests`, and `selected_version_id` |
| Capture stays in processing | stale worker, failed generator callback, or migration mismatch | inspect `recipe_captures`, `generation_requests`, and `capture-recipe` logs; retry the same capture id |
| Retry starts too early or repeats a provider call | missing, legacy, or incompatible stage checkpoint | inspect `recipe_captures.stage_checkpoints`, `failed_stage`, and the artifact saved by the previous stage |
| Generated image exists but the page is absent | capture publication failed after page generation | confirm `failed_stage = publication`, `art_status = ready`, and a ready `selected_version_id`; retry the same capture to publish that version |
| Recipe image fails before capture starts | source exceeds 15 MB, native decoder cannot read it, or normalization cannot produce an artifact below 8 MB | reproduce through `recipeCaptureImage.ts`; inspect the original dimensions/size and the adaptive normalization attempts |
| Image capture asks for another source | extractor classified it as blank, unreadable, blurry/low-resolution, cropped, or incomplete | inspect `extract-recipe` logs for the provider-neutral `reasonCode` and internal `diagnostic`; keep user-facing copy in `recipeEvidence.ts` |
| Social link fails before extraction | the external provider is disabled, the platform is not enabled, or the provider does not support the link | retry the saved link or open the original and choose another source; the composer should never interrupt a pasted link before this durable failure |
| Social capture reaches technical retry | provider configuration, rate limiting, timeout, or temporary acquisition failure | inspect the `acquisition` checkpoint and `capture-recipe` logs; retry the same capture so a saved provider job resumes instead of starting another one |
| Social capture reports unavailable | the public post is missing, private, restricted, or unsupported by the provider | keep the saved link and use Open original to add a video file, screenshots, audio, or recipe text |
| Video capture asks for permission | the source did not pass through the Composer confirmation | add the video again and confirm that the user made it or has permission to process it |
| Uploaded video reaches technical retry | `VIDEO_MODEL` does not accept the selected video format, or its provider is unavailable | choose a compatible video model or use a supported file format; keep the video adapter and capture lifecycle unchanged |
| Audio is rejected before capture | unsupported format or file exceeds 6 MB | choose MP3, M4A, WAV, AAC, AIFF, OGG, or FLAC below the source limit |
| Saved audio cannot be transcribed | `AUDIO_TRANSCRIPTION_MODEL` is unavailable, misconfigured, or the provider is temporarily failing | inspect `capture-recipe` logs and retry the same capture; do not create another extraction path |
| Capture asks for review or approval | stale client or stale documentation | confirm commit and deployed bundle; the current lifecycle has no review state |
| New page uses the typesetter | caller bypassed the capture contract or page has no complete image | trace the source through `capture-recipe`; do not add another generation path |
| Page style differs from its book | stale cookbook page-style fields or caller-defined references | inspect `page_style_id`, `style_revision`, and `page_style_references`; generation must read them from the database |
