# CLAUDE.md

Operating manual for AI agents working on this repo. Keep this file factual and current.

## Product

Nosh is a personal digital cookbook app. Users create styled cookbooks, add recipes as pages from URL/text/image/video sources, and cook from a swipeable book reader. The Nosh assistant lives inside the reader and answers questions using the active page first, then the rest of the current cookbook.

Keep product work book-first. Do not reintroduce legacy non-cookbook product surfaces or persistent bottom navigation without an explicit product decision.

## Stack

- React Native with Expo SDK 54.
- Expo Router.
- TypeScript strict.
- Supabase in the `nutriai` schema with RLS and Edge Functions.
- TanStack React Query for server state.
- AsyncStorage for shelf and per-book page cache.
- `@nkzw/create-context-hook` for shared context hooks.

Node is `20.19.4`. Install dependencies with `npm install --legacy-peer-deps`.

## Commands

```bash
npx expo start
npx expo start --web --port 8081
npx expo start --lan
npm test
npm run typecheck
npm run lint
```

## Builds

```bash
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios
```

`APP_VARIANT=development` produces `Nosh (Dev)` with bundle id `com.yaz12.nosh.dev`. Preview and production use `Nosh` with bundle id `com.yaz12.nosh`.

## Routes

```text
app/_layout.tsx
app/(auth)/index.tsx
app/(auth)/sign-in.tsx
app/(auth)/sign-up.tsx
app/(auth)/forgot-password.tsx
app/(book)/_layout.tsx
app/(book)/index.tsx
app/(book)/library.tsx
app/(book)/settings.tsx
app/(book)/[cookbookId]/_layout.tsx
app/(book)/[cookbookId]/index.tsx
app/(book)/[cookbookId]/add.tsx
app/(book)/[cookbookId]/review.tsx
app/(book)/[cookbookId]/generation/[pageId].tsx
```

The table of contents is an in-reader page rendered by `BookTableOfContentsPage`, not a route. There is no direct `app/(book)/[cookbookId]/[pageId].tsx` file in the live branch.

## Provider Order

Do not reorder the root tree in `app/_layout.tsx` without checking every consumer:

```text
QueryClientProvider
  CookbooksProvider
    CookbookImportProvider
      ToastProvider
        GlobalErrorBoundary
          RootLayoutNav
            GestureHandlerRootView
              SafeAreaProvider
                Stack
                OfflineBanner
```

`useAuth` is a hook used by `RootLayoutNav`; there is no `AuthProvider`. `useCookbook(cookbookId)` is a parameterized hook; there is no global `CookbookProvider`. `useNoshAssistant` is local to the assistant sheet; there is no `NoshAssistantProvider`.

## Active Hooks

| Hook | Purpose |
|---|---|
| `useAuth` | Supabase session/user state and sign-out |
| `useCookbooks` | shelf provider, create/delete cookbook, credit balance |
| `useCookbook(cookbookId)` | one cookbook, pages, selected page, refresh, upsert |
| `useCookbookImport` | parser state, draft, confidence, review reasons |
| `useNoshAssistant` | in-book assistant messages and chat send |
| `useNetworkStatus` | offline banner state |

## AI And Edge Functions

| Function | Provider path | Purpose |
|---|---|---|
| `ai-chat` | OpenRouter-compatible chat completions | Nosh assistant |
| `parse-recipe-source` | OpenRouter-compatible chat completions, with image/video fallbacks | import URL/text/image/video into a structured recipe draft |
| `parse-image-recipe` | Gemini 2.5 Flash | direct image extraction fallback |
| `parse-video-recipe` | Gemini 2.5 Flash | direct video extraction fallback |
| `generate-cookbook-page` | OpenAI image generation | render a reviewed recipe into a cookbook page image |
| `credits` | Supabase service role | read generation-credit balance |
| `delete-account` | Supabase service role | account deletion |

Required Edge Function secrets:

```text
AI_API_KEY, AI_API_BASE, AI_MODEL
GEMINI_API_KEY
OPENAI_API_KEY, OPENAI_IMAGE_MODEL
COOKBOOK_PAGE_BUCKET
```

Do not put API keys in `EXPO_PUBLIC_*`.

## Files Worth Knowing

| File | Purpose |
|---|---|
| `app/_layout.tsx` | providers, auth guard, root stack |
| `app/(book)/index.tsx` | shelf entry |
| `app/(book)/library.tsx` | cookbook creation |
| `app/(book)/[cookbookId]/index.tsx` | reader entry |
| `hooks/useCookbooks.ts` | shelf provider |
| `hooks/useCookbook.ts` | per-book hook |
| `hooks/useCookbookImport.ts` | import/review state |
| `hooks/useNoshAssistant.ts` | assistant state and prompt context |
| `utils/cookbook/api.ts` | Supabase and Edge Function cookbook API |
| `utils/cookbook/cache.ts` | AsyncStorage cache keys |
| `utils/cookbook/pagePrompt.ts` | page-generation prompt payload |
| `utils/cookbook/sections.ts` | section normalization/order |
| `utils/cookbook/sampleCookbook.ts` | offline sample books |
| `constants/cookbookStyles.ts` | style presets |
| `components/cookbook/BookReader.tsx` | swipeable reader |
| `components/cookbook/BookTableOfContentsPage.tsx` | in-reader contents page |

## Conventions

- Use `@/` imports for cross-folder code.
- Keep secrets server-side in Edge Functions.
- Style with `constants/colors.ts`, `constants/spacing.ts`, and `constants/cookbookStyles.ts`.
- Only add config-plugin packages to `app.json` plugins.
- Do not revert unrelated worker changes on the shared cleanup branch.
- Do not commit unless the user explicitly asks.

## Current Docs

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DEVELOPMENT.md`
- `docs/superpowers/specs/`
- `docs/superpowers/plans/`
