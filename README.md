# Nosh

> Your recipes. Your book. Your AI chef.

Nosh is a book-first Expo app for personal digital cookbooks. Users create styled cookbooks, import recipes from links, pasted text, screenshots, or video links, review the extracted recipe, and generate a rendered page that belongs to that book. The embedded AI chef answers questions from the active page and the rest of the current cookbook.

The product is the cookbook. The AI is the chef inside it.

## What It Does

- **My Cookbooks shelf**: the authenticated home screen for a user's cookbook collection.
- **Book Library**: style presets for creating a new cookbook.
- **Book reader**: a swipeable reader with cover, table-of-contents page, recipe pages, add-page controls, and the Nosh assistant.
- **Recipe import**: URL, text, image, and video inputs become structured recipe drafts for review.
- **Page generation**: reviewed recipes become rendered cookbook-page images in the selected book style.
- **Nosh assistant**: contextual chef chat scoped to the active page and cookbook.

Out of scope for this app: legacy non-cookbook product surfaces and persistent bottom navigation.

## Tech Stack

- React Native with Expo SDK 54 and Expo Router.
- TypeScript in strict mode.
- Supabase in the private `nutriai` schema with RLS and Edge Functions.
- TanStack React Query for server state.
- AsyncStorage for shelf and per-book page cache.
- `@nkzw/create-context-hook` for shared provider hooks.

## AI And Import Architecture

- `ai-chat`: OpenRouter-compatible chat completions for the in-book Nosh assistant.
- `parse-recipe-source`: authenticated import orchestrator for URL, text, image, and video payloads. It uses `AI_API_KEY`, `AI_API_BASE`, and `AI_MODEL` for OpenRouter-compatible extraction. Image and video paths can fall back to the direct Gemini functions.
- `parse-image-recipe`: direct Gemini 2.5 Flash image extraction fallback.
- `parse-video-recipe`: direct Gemini 2.5 Flash video extraction fallback.
- `generate-cookbook-page`: OpenAI image generation for cookbook page art, then stores the image in Supabase Storage and spends one generation credit.

API keys stay in Supabase Edge Function secrets. Do not put provider keys in `EXPO_PUBLIC_*`.

## Project Layout

```text
app/
  _layout.tsx                  root providers, auth guard, fonts, splash, offline banner
  (auth)/
    index.tsx                  redirects to sign-in
    sign-in.tsx
    sign-up.tsx
    forgot-password.tsx
  (book)/
    _layout.tsx                authenticated book stack
    index.tsx                  My Cookbooks shelf
    library.tsx                style picker and cookbook creation
    settings.tsx               account, stats, sign out
    [cookbookId]/
      _layout.tsx              per-book stack
      index.tsx                BookReader for one cookbook
      add.tsx                  source composer for a new page
      review.tsx               proof extracted recipe before generation
      generation/[pageId].tsx  generation result for a new page
```

The table of contents is an in-reader page rendered by `BookTableOfContentsPage`, not a standalone route.

## State And Providers

`app/_layout.tsx` currently wraps the app like this:

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

Active hooks:

- `useAuth`: Supabase session/user state and sign-out. It is a hook, not an `AuthProvider`.
- `useCookbooks`: shelf state, create/delete cookbook mutations, credit balance.
- `useCookbook(cookbookId)`: per-book data, page selection, refresh, and page upsert. It is a parameterized hook, not a global provider.
- `useCookbookImport`: import draft, confidence, parser state, and review metadata.
- `useNoshAssistant`: local assistant state for `NoshAssistantSheet`; chat is scoped by current page and book.

## Environment

Required in `.env` for the client:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=openai/gpt-oss-20b:free
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
```

Supabase Edge Function secrets:

```text
AI_API_KEY, AI_API_BASE, AI_MODEL          ai-chat and parse-recipe-source
GEMINI_API_KEY                            parse-image-recipe and parse-video-recipe fallbacks
OPENAI_API_KEY, OPENAI_IMAGE_MODEL         generate-cookbook-page image generation
COOKBOOK_PAGE_BUCKET                       optional generated-page storage bucket override
```

## Commands

```bash
npm install --legacy-peer-deps
npx expo start
npx expo start --web --port 8081
npx expo start --lan
npm test
npm run typecheck
npm run lint
```

Node is pinned to `20.19.4` in `.nvmrc`.

## Builds

`app.config.js` reads `APP_VARIANT` so development and production builds can live side by side:

| Profile | App name | Bundle ID | Scheme |
|---|---|---|---|
| development | Nosh (Dev) | `com.yaz12.nosh.dev` | `nosh` |
| preview / production | Nosh | `com.yaz12.nosh` | `nosh` |

```bash
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile preview --platform ios
npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios
```

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DATABASE.md](docs/DATABASE.md)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [docs/superpowers/specs/](docs/superpowers/specs/)
- [docs/superpowers/plans/](docs/superpowers/plans/)

## Status

Private, pre-launch, and production-bound. The active surface is the cookbook shelf, book reader, recipe import/review flow, generated page result, settings, and in-book assistant.
