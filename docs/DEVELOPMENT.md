# Development

## Prerequisites

- Node `20.19.4` from `.nvmrc`.
- npm. Use `npm install --legacy-peer-deps`.
- Expo CLI through `npx expo`.
- Supabase project with SQL from `supabase/sql/` applied in order.
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

## Environment

Client-safe `.env` keys:

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=openai/gpt-oss-20b:free
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
```

Only `EXPO_PUBLIC_*` values are bundled into the app. Never put provider API keys or service-role keys in client env vars.

Supabase Edge Function secrets:

| Secret | Used by |
|---|---|
| `AI_API_KEY` | `ai-chat`, `parse-recipe-source` |
| `AI_API_BASE` | `ai-chat`, `parse-recipe-source` |
| `AI_MODEL` | `ai-chat`, `parse-recipe-source` |
| `GEMINI_API_KEY` | `parse-image-recipe`, `parse-video-recipe` fallbacks |
| `OPENAI_API_KEY` | `generate-cookbook-page` |
| `OPENAI_IMAGE_MODEL` | `generate-cookbook-page` |
| `COOKBOOK_PAGE_BUCKET` | optional generated-page storage bucket override |

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

The table of contents is rendered inside the reader by `BookTableOfContentsPage`; it is not a route.

## Provider Order

Keep the root provider order in `app/_layout.tsx` aligned with the live tree:

```text
QueryClientProvider
  CookbooksProvider
    CookbookImportProvider
      ToastProvider
        GlobalErrorBoundary
          RootLayoutNav
```

`RootLayoutNav` owns the auth redirect logic with `useAuth()` and renders the root Expo Router stack inside `GestureHandlerRootView` and `SafeAreaProvider`.

## App State Conventions

- Shelf data comes from `useCookbooks`.
- One-book reader state comes from `useCookbook(cookbookId)`.
- Import/review state comes from `useCookbookImport`.
- Assistant messages come from `useNoshAssistant` inside `NoshAssistantSheet`.
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

- `ai-chat`
- `parse-recipe-source`
- `parse-image-recipe`
- `parse-video-recipe`
- `generate-cookbook-page`
- `credits`
- `delete-account`

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

`utils/cookbook/sampleCookbook.ts` provides static cookbooks and pages. The shelf and empty state expose sample preview paths so reader UI can be checked without database writes, parser calls, or page-generation credits.

## Common Pitfalls

| Symptom | Likely cause | Fix |
|---|---|---|
| `npm install` fails | peer dependency mismatch | rerun with `npm install --legacy-peer-deps` |
| Signed-in user returns to auth | auth guard or session state changed | inspect `app/_layout.tsx` and `useAuth` |
| Shelf stays empty after creating a book | migration/RLS issue | verify `supabase/sql/20260505_multi_cookbook.sql` and RLS policies |
| Import fails with 401 | missing Supabase JWT | call through `callAuthenticatedFunction` |
| Generated page has no image | missing OpenAI secret or storage bucket issue | check `generate-cookbook-page` logs and secrets |
