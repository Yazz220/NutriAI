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
npm run typecheck
npm run lint
```

The dev server connects to the Nosh dev build on device. Web preview is useful for reader layout work, but iOS device builds are still required for native auth and platform checks.

Before a Phase 9 release, follow `docs/PHASE9_RELEASE_RUNBOOK.md`. A passing web preview does not satisfy the native-share, dynamic-type, screen-reader, reduced-motion, or representative-device gates.

Before changing capture or generation, read `docs/PRODUCT_FLOW.md` and ADR 0002. The app has one capture pipeline and one complete-page generator.

## Environment

Client-safe `.env` keys:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=qwen/qwen3.6-35b-a3b
EXPO_PUBLIC_ART_MODEL=qwen/qwen-image-3-pro
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2=false
```

`EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2` changes conversation presentation only. It must not select a different capture, extraction, or page-generation implementation.

Only `EXPO_PUBLIC_*` values are bundled into the app. Never put provider API keys or service-role keys in client env vars.

Supabase Edge Function secrets:

| Secret | Used by |
|---|---|
| `AI_API_KEY` | `extract-recipe`, `nosh-chat` |
| `AI_API_BASE` | `extract-recipe`, `nosh-chat` |
| `AI_MODEL` | `extract-recipe`, `nosh-chat` |
| `ART_MODEL` | `generate-page-art` |

Supabase also provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to functions that need them.

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
- `generate-page-art`
- `credits` (legacy endpoint; not used by the active client or generation path)
- `delete-account`

Deploy migrations before deploying Edge Functions that depend on new columns or RPCs. For the simplified pipeline, apply `20260822153000_simplify_recipe_page_pipeline.sql` before the matching `capture-recipe` and `generate-page-art` versions.

## EAS Builds

`app.config.js` reads `APP_VARIANT`:

| Profile | App name | Bundle ID | Scheme |
|---|---|---|---|
| development | Nosh (Dev) | `com.yaz12.nosh.dev` | `nosh` |
| preview | Nosh | `com.yaz12.nosh` | `nosh` |
| production | Nosh | `com.yaz12.nosh` | `nosh` |

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
| Capture asks for review or approval | stale client or stale documentation | confirm commit and deployed bundle; the current lifecycle has no review state |
| New page uses the typesetter | caller bypassed the capture contract or page has no complete image | trace the source through `capture-recipe`; do not add another generation path |
| Page style differs from its book | stale cookbook style fields or caller-defined references | inspect `cover_style`, `style_revision`, and `page_style_references`; generation must read them from the database |
