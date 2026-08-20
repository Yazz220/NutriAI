# Nosh

> Your recipes. Your book. Your AI chef.

Nosh is a book-first Expo app for personal digital cookbooks. Users create styled cookbooks, import recipes from links, pasted text, screenshots, or video links, review the extracted recipe, and generate a rendered page that belongs to that book. The embedded AI chef answers questions from the active page and the rest of the current cookbook.

The product is the cookbook. The AI is the chef inside it.

## What It Does

- **My Cookbooks shelf**: the authenticated home screen for a user's cookbook collection.
- **Book Library**: style presets for creating a new cookbook.
- **Book reader**: a swipeable reader with cover, table-of-contents page, recipe pages, add-page controls, and the Nosh assistant.
- **Recipe import**: a single multimodal input auto-detects URL, text, image, or video sources and extracts a structured RecipeGraph for review.
- **Page generation**: reviewed recipes become live typesetter pages (vector text) layered over style-conditioned generative art — no baked-in text, instant re-flow on edit.
- **Nosh assistant**: an assistant-ui powered chat with tool-calling that can scale servings, substitute ingredients, start timers, guide steps, and patch the recipe graph live.

Out of scope for this app: legacy non-cookbook product surfaces and persistent bottom navigation.

## Tech Stack

- React Native with Expo SDK 54 and Expo Router.
- TypeScript in strict mode.
- Supabase in the private `nutriai` schema with RLS and Edge Functions.
- TanStack React Query for server state.
- AsyncStorage for shelf and per-book page cache.
- `@nkzw/create-context-hook` for shared provider hooks.
- `@assistant-ui/react-native` for the in-book assistant chat runtime.

## AI And Import Architecture

The pipeline has three engines, each doing one thing well:

- `extract-recipe`: multimodal extraction (URL, text, image, video) → RecipeGraphDraft. Uses Qwen3.6-35B-A3B via OpenRouter.
- `nosh-chat`: multi-turn kitchen chat with tool-calling (scale, substitute, timer, guide, update). Uses Qwen3.6-35B-A3B via OpenRouter.
- `generate-page-art`: isolated style-conditioned illustration — no text, ever. Uses Qwen Image 3 Pro via OpenRouter.

The page the user sees is a composite: vector text from the typesetter + artwork from the generator, layered at render time. Editing a recipe re-flows text instantly with zero image re-generation cost.

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
- The Nosh assistant uses `@assistant-ui/react-native` with a `LocalRuntime` bridging to the `nosh-chat` Edge Function; chat is scoped by current page and book.

## Environment

Required in `.env` for the client:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=qwen/qwen3.6-35b-a3b
EXPO_PUBLIC_ART_MODEL=qwen/qwen-image-3-pro
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
```

Supabase Edge Function secrets:

```text
AI_API_KEY, AI_API_BASE, AI_MODEL          extract-recipe and nosh-chat
ART_MODEL                                 generate-page-art
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
