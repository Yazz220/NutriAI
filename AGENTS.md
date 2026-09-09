# AGENTS.md

## Project Overview

**Folio** is a React Native mobile app built with Expo. It is a book-first personal cookbook with a persistent conversational chef: users talk to Folio from the shelf or reader, share links, text, images, or video, and receive a complete AI-designed recipe page inside the appropriate book. The extracted RecipeGraph remains available to Folio for reasoning and edits. The conversation follows the user into the open book and can act on the active recipe.

Folio is the current product name and the assistant's name. Nosh was the early working name. Keep `Nosh`, `nosh`, and `NOSH` only where they are stable technical identifiers such as file names, exported symbols, storage keys, URL schemes, bundle identifiers, Edge Function names, database objects, migrations, and provider product IDs. Do not use Nosh in new user-facing copy.

Do not frame the app as a legacy non-cookbook product or a chat-first recipe manager. The active product is the cookbook shelf and reader.

## Tech Stack

- React Native with Expo SDK 54.
- Expo Router for file-based navigation.
- TypeScript strict mode.
- Supabase backend in the private `nutriai` schema with RLS.
- Supabase Edge Functions for AI, import, generation, and account deletion. The legacy credits function is dormant.
- TanStack React Query for server state.
- AsyncStorage for shelf and per-book page cache.
- `@nkzw/create-context-hook` for shared context hooks.

Node version: `20.19.4`. Install dependencies with `npm install --legacy-peer-deps`.

## Commands

### Development

```bash
npx expo start
npx expo start --web --port 8081
npx expo start --lan
```

### Testing

```bash
npm test
npm run test:watch
npm run typecheck
npm run lint
```

### Builds

```bash
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios
```

### Local Simulator Loop

The `ios/` project is prebuilt and gitignored. Build once with `xcodebuild -workspace ios/Folio.xcworkspace -scheme Folio -configuration Debug -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`, then launch with `xcrun simctl launch booted com.yaz12.nosh --initialUrl http://localhost:8081` to skip the dev-client launcher UI. Fast Refresh notifications are unreliable on this machine (no watchman); force a fresh bundle with `curl 'http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true&hot=false&lazy=true'` and relaunch the app to pick up changes.

### Supabase Edge Functions

```bash
supabase functions deploy <function-name> --project-ref <PROJECT_REF>
supabase functions logs <function-name> --project-ref <PROJECT_REF>
```

## Expo Router Shape

```text
app/
  _layout.tsx
  (auth)/
    _layout.tsx
    index.tsx
    sign-in.tsx
    sign-up.tsx
    forgot-password.tsx
    reset-password.tsx
  (book)/
    _layout.tsx
    index.tsx
    library.tsx
    imports.tsx
    share.tsx
    settings.tsx
    [cookbookId]/
      _layout.tsx
      index.tsx
      add.tsx
      review.tsx
      generation/
        [pageId].tsx
```

Key route behavior:

- `app/_layout.tsx`: root providers, auth guard, font/splash loading, root stack, offline banner.
- `app/(book)/index.tsx`: authenticated shelf.
- `app/(book)/library.tsx`: single-book customization studio and cookbook creation.
- `app/(book)/imports.tsx`: recipe-capture history, destination choice, retry, and completed-page links.
- `app/(book)/share.tsx`: native Share to Folio receipt and retry surface.
- `app/(book)/settings.tsx`: account, library stats, sign out.
- `app/(book)/[cookbookId]/index.tsx`: book reader.
- `app/(book)/[cookbookId]/add.tsx`: add source for a new recipe page.
- `app/(book)/[cookbookId]/review.tsx`: compatibility route for the retired blocking review flow; new imports bypass it.
- `app/(book)/[cookbookId]/generation/[pageId].tsx`: compatibility result route; current captures return to the reader.

There is no direct `app/(book)/[cookbookId]/[pageId].tsx` file in this branch. The selected page is reader state inside `[cookbookId]/index.tsx`. The reader contains a bookplate and recipe pages; the table of contents has been retired.

## Provider Tree

Current `app/_layout.tsx` provider order:

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

Current provider/hook reality:

- `useAuth`: Supabase auth state; no `AuthProvider` exists.
- `CookbooksProvider` / `useCookbooks`: shelf state and cookbook creation/deletion.
- `useCookbook(cookbookId)`: per-book data; no `CookbookProvider` exists.
- `useRecipeCaptures`: durable capture state, polling, retry, and destination selection.
- `NoshConversationProvider` / `useNoshConversation`: persistent chat visibility, intake state, and active cookbook/page context across shelf-to-reader navigation.
- `NoshSubscriptionProvider` / `useNoshSubscription`: user-scoped RevenueCat identity, store offerings, server access snapshot, purchase, restore, sync, and management.
- `AiDataConsentProvider` / `useAiDataConsent`: versioned explicit permission before Folio sends recipe sources or conversation context to external AI and acquisition providers. Bump `AI_DATA_CONSENT_VERSION`, update the in-app disclosure and `docs/privacy.html`, and add a re-consent test whenever a provider, source type, purpose, or materially different retention practice is introduced.
- `useNoshAssistant`: removed. The Folio assistant uses `@assistant-ui/react-native` with a root-mounted `LocalRuntime` plus a device-persisted thread list bridging to the `nosh-chat` Edge Function via `utils/cookbook/noshChatAdapter.ts`. Users can start, switch, restore, and delete conversations. Tools are defined in `utils/cookbook/noshToolkit.tsx`.

## AI And Import Architecture

There is exactly one recipe-capture pipeline. Every recipe source, including a Folio conversation handoff, must enter `capture-recipe`. Do not call extraction and page creation directly from a screen or assistant tool.

```text
User shares or submits a link, text, photo, video, or existing audio file
  -> capture-recipe durably saves the source
  -> extract-recipe produces a RecipeGraph
     -> URL with schema.org Recipe JSON-LD or Microdata: deterministic normalization
     -> image: normalized bounded image evidence with signature and dimension preflight
     -> video: permissioned private upload or permission-confirmed bounded direct-video evidence
        -> supported containers (MP4, MOV, WebM, MPEG) submitted to the direct-media speech-to-text adapter in capture-recipe
        -> client samples up to eight frames and uploads them as supplementary JPEG evidence
        -> extract-recipe merges transcript + frames + whole video; degraded retry drops whole video
     -> supported public social-video link: replaceable acquisition adapter -> bounded metadata and seen/heard observations
        -> transcription remains Folio-owned and Supadata's transcript endpoint is not used
     -> audio: private bounded file -> replaceable speech-to-text adapter -> transcript evidence
     -> unstructured text/image/video with merged signals/audio transcript: replaceable strict-schema multimodal model
  -> destination resolves from the active, explicit, default, or sole cookbook
  -> only an unresolved destination pauses for a simple book picker
  -> one processing CookbookPage stores the RecipeGraph as JSONB
  -> generate-page-art creates the complete designed page with visible recipe text
  -> the versioned cookbook style and reference anchors condition the page
  -> the finished image and capture publish atomically into the reader
  -> the same Folio conversation remains available in the reader
```

Active functions:

- `extract-recipe`: URL, text, image, resolved video evidence with merged transcript and frame signals, acquired social-video evidence, and audio transcripts → RecipeGraphDraft. Uses deterministic schema.org Recipe JSON-LD or Microdata when available and a replaceable strict-schema model for unstructured sources. URL acquisition distinguishes unavailable, access-restricted, unsupported, and oversized pages before extraction. Image extraction validates the real JPEG, PNG, WebP, or GIF signature and dimensions before the multimodal model decides blankness, readability, cropping, and recipe completeness. Permissioned private MP4, MOV, MPEG, or WebM uploads and permission-confirmed direct files up to 20 MB are supported. For supported containers, `capture-recipe` submits the inspected video file to Folio's direct-media speech-to-text adapter and the client uploads up to eight sampled frames; `extract-recipe` merges transcript, frames, and whole video into one multimodal call, with a degraded retry that drops the whole video if the first attempt fails. Public YouTube, TikTok, Instagram, and Facebook links use the configured replaceable acquisition adapter when enabled, which returns bounded metadata and seen/heard observations rather than a RecipeGraph. Every pasted social-video link enters the durable capture immediately; unsupported or unavailable sources show saved-link recovery only after acquisition fails. Existing MP3, M4A, WAV, AAC, AIFF, OGG, and FLAC files up to 6 MB are transcribed by `capture-recipe`; in-app audio recording is intentionally not implemented.
- `capture-recipe`: durable orchestration for extraction, destination resolution, complete-page generation, retry, and publication.
- `nosh-chat`: multi-turn kitchen chat with tool-calling (`start_recipe_capture`, collection retrieval, navigation, organization, recipe changes, timers, and complete-page regeneration). Uses Qwen3.6-35B-A3B via OpenRouter.
- `generate-page-art`: complete style-conditioned recipe-page generation, including visible recipe text. Uses Qwen Image 3 Pro via OpenRouter.
- `credits`: dormant legacy balance endpoint; the active client and generation path do not use it.
- `delete-account`: account deletion.

Pipeline invariants:

- `capture-recipe` owns capture persistence, extraction, destination resolution, page creation, retry, and publication.
- `nosh-chat` may request `start_recipe_capture`, but it does not extract or publish a recipe itself.
- `generate-page-art` is a legacy route name for complete-page generation. Its output includes the visible recipe text and imagery.
- `recipe_graph` is the canonical reasoning record. The selected `page_versions` image is the reading artifact.
- Source provenance, confidence, inferred fields, and quality diagnostics remain on the durable capture. Project clean cooking data before creating a cookbook page or generation prompt; never render extraction commentary as recipe copy.
- New captures do not use review or approval. Their states are `processing`, `needs_destination`, `needs_attention`, and `ready`.
- `recipe_captures.stage_checkpoints` versions source, optional external acquisition, optional Folio-owned transcription, extraction, normalization, quality, page generation, and publication. Retry resumes from compatible saved artifacts. A publication retry must reuse the ready selected page image rather than generate another page.
- `recipe_captures.failed_stage` identifies where work stopped. `failure_code` decides the user recovery action; provider and database diagnostics stay in server logs.
- Ingestion model, provider, prompt, parser, transcription, or normalization changes must run the versioned corpus in `supabase/functions/extract-recipe/evals/`; release cases fail closed and diagnostic cases record hard-source coverage still awaiting stable fixtures.
- The cookbook row owns an independent physical `cover_style` and generated-page `page_style_id`; page style revision and visual references belong to `page_style_id`. Never accept a caller-defined per-recipe style as canonical.
- The typesetter is a compatibility renderer for old pages only. It is not a second generation pipeline.
- Internal generation credits are suspended. New generations use `credit_cost = 0` and must not call `reserve_generation_credit`; see ADR 0003 before changing this policy.
- Free and Plus capacity is enforced by `usage_periods` and idempotent `usage_reservations`, not the dormant credit ledger. Every complete-page path goes through `generate-page-art`, which reserves before provider work and settles only a ready page. Read `docs/MONETIZATION.md` before changing plans, products, allowances, cookbook creation, or page generation.

## Environment Variables

Client-safe `.env` keys:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=qwen/qwen3.6-35b-a3b
EXPO_PUBLIC_ART_MODEL=qwen/qwen-image-3-pro
EXPO_PUBLIC_SUPPORT_EMAIL=
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
```

Edge Function secrets in Supabase:

```text
AI_API_KEY, AI_API_BASE                    shared OpenRouter gateway credentials
EXTRACTION_MODEL                           extract-recipe; legacy fallback is AI_MODEL
CHAT_MODEL                                 nosh-chat; legacy fallback is AI_MODEL
VIDEO_UNDERSTANDING_MODEL                  optional whole-video extraction override; legacy fallback is VIDEO_MODEL
TRANSCRIPTION_MODEL                        capture-recipe audio/video speech-to-text; defaults to mistralai/voxtral-small-24b-2507-stt
TRANSCRIPTION_API_BASE/API_KEY             optional speech override; defaults to the shared OpenRouter gateway
SOCIAL_VIDEO_ACQUISITION_PROVIDER          guided (default) or supadata
SUPADATA_API_KEY                           server-only Supadata credential
SUPADATA_API_BASE                          optional Supadata base URL
SUPADATA_ENABLED_PLATFORMS                 optional per-platform allowlist
ART_MODEL                                 generate-page-art
REVENUECAT_SECRET_API_KEY                 sync-subscription, revenuecat-webhook, and delete-account
REVENUECAT_WEBHOOK_AUTH_TOKEN             revenuecat-webhook Authorization verification
REVENUECAT_WEBHOOK_SIGNING_SECRET         revenuecat-webhook HMAC verification
REVENUECAT_ACCEPT_SANDBOX_EVENTS          verified sandbox defaults on for TestFlight/App Review; false is an emergency kill switch
```

Only RevenueCat public SDK keys belong in `EXPO_PUBLIC_*`; keep all secret provider keys server-side. Launch billing is iOS-only; read `docs/MONETIZATION.md` before adding another store.

## Key Files

| File | Purpose |
|---|---|
| `hooks/useAuth.ts` | Supabase auth state |
| `hooks/useCookbooks.ts` | shelf provider |
| `hooks/useCookbook.ts` | one-book hook |
| `hooks/useRecipeCaptures.ts` | durable capture state, polling, retry, and destination choice |
| `contexts/NoshConversationContext.tsx` | persistent conversation and active book/page context |
| `components/cookbook/BookReader.tsx` | swipeable reader |
| `components/cookbook/UnifiedIntakeComposer.tsx` | multimodal recipe source input |
| `components/cookbook/NoshAssistantChat.tsx` | root-mounted assistant-ui conversation and shelf/reader launchers |
| `components/cookbook/PageCanvas.tsx` | renders complete generated pages with legacy typesetter fallback |
| `utils/cookbook/recipeCaptureVideoFrames.ts` | client-side video frame sampling for on-screen-text evidence |
| `utils/cookbook/api.ts` | Supabase and Edge Function API calls |
| `utils/cookbook/cache.ts` | AsyncStorage shelf/page cache |
| `utils/cookbook/noshChatAdapter.ts` | bridges assistant-ui to nosh-chat Edge Function |
| `utils/cookbook/noshThreadStorage.ts` | user-scoped device persistence for conversation threads and messages |
| `utils/cookbook/noshToolkit.tsx` | Folio tool definitions with execute + render |
| `contexts/NoshSubscriptionContext.tsx` | RevenueCat and server access lifecycle |
| `components/subscription/` | Folio-native plan, paywall, allowance, and limit presentation |
| `docs/MONETIZATION.md` | Canonical plan, identifier, accounting, setup, and extension contract |
| `utils/cookbook/sampleCookbook.ts` | offline sample book fixtures |
| `constants/cookbookStyles.ts` | persisted cookbook style contracts and the curated creation set |

## Development Guidelines

- Use `@/` path aliases for cross-folder imports.
- Use Edge Functions for provider calls and service-role work.
- Use `constants/colors.ts`, `constants/spacing.ts`, and `constants/cookbookStyles.ts` for styling.
- Keep generated page prompts tied to the active cookbook style.
- Route every new recipe source through `capture-recipe`; do not add a parallel import or image pipeline.
- Keep provider order in `app/_layout.tsx` stable unless all consumers are checked.
- Do not put `perspective`/`rotateX`/`rotateY` transforms on views inside the creation studio's preview panel: iOS mis-clips out-of-plane transformed views there (the cover rendered as a diagonal wedge, the spread half-cut). The shelf's Reanimated 3D poses in an unclipped stage are fine.
- Only packages with config plugins belong in `app.json` plugins.
- Do not edit another worker's unrelated files on the shared cleanup branch.
- Do not commit unless the user explicitly asks.

## Documentation

- `CONTEXT.md`: canonical product language.
- `docs/PRODUCT_FLOW.md`: current user and system flow.
- `docs/ARCHITECTURE.md`: live implementation.
- `docs/DATABASE.md`: live schema and state machines.
- `docs/DEVELOPMENT.md`: setup, deployment, and debugging.
- `docs/adr/`: accepted architectural decisions.
- `docs/superpowers/`: dated historical plans and research, never current instructions.
