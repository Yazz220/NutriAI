# Nosh

> Your recipes. Your book. Your AI chef.

Nosh is a book-first Expo app for personal digital cookbooks. Users create styled cookbooks and capture recipes from links, pasted text, screenshots, or video links. Nosh extracts the structured recipe for reasoning, generates the complete designed recipe page, and places it directly into the appropriate book. The embedded AI chef answers questions from the active page and the user’s wider recipe collection.

The product is the cookbook. The AI is the chef inside it.

## What It Does

- **My Cookbooks shelf**: the authenticated home screen for a user's cookbook collection.
- **Book Library**: style presets for creating a new cookbook.
- **Book reader**: a swipeable reader with a physical cover, recipe pages, add-page controls, and the Nosh assistant.
- **Recipe import**: one durable multimodal pipeline accepts URL, text, image, or video sources and resolves the explicit, default, or sole destination book automatically.
- **Page generation**: Qwen Image creates the complete portrait recipe page, including dish imagery, title, ingredients, instructions, typography, and composition, using the destination book's versioned visual identity.
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

One durable pipeline coordinates four responsibilities:

- `extract-recipe`: multimodal extraction (URL, text, image, video) → RecipeGraphDraft. Uses Qwen3.6-35B-A3B via OpenRouter.
- `nosh-chat`: multi-turn kitchen chat with tool-calling (scale, substitute, timer, guide, update). Uses Qwen3.6-35B-A3B via OpenRouter.
- `capture-recipe`: durable orchestration from saved source through extraction, destination resolution, full-page generation, and publication.
- `generate-page-art`: style-conditioned complete recipe-page generation, including the visible recipe text. Uses Qwen Image 3 Pro via OpenRouter.

`recipe_graph` remains the canonical machine-readable recipe used by Nosh. The selected generated page image is the user-facing book page. Saved recipe edits therefore generate a replacement page before the graph and selected version are switched together.

No other screen or assistant tool creates recipe pages directly. The retired review route, legacy typesetter, and old generation-result route exist only for compatibility.

## Typical use

```text
Create a cookbook
  -> share a recipe to Nosh or choose Add page
  -> Nosh extracts the Recipe Graph
  -> the explicit, default, or sole cookbook supplies the visual identity
  -> Nosh generates and publishes the complete page
  -> open the book, flip to the recipe, and Ask Nosh while cooking
```

See [docs/PRODUCT_FLOW.md](docs/PRODUCT_FLOW.md) for entry points, states, edge cases, and debugging ownership.

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
    reset-password.tsx
  (book)/
    _layout.tsx                authenticated book stack
    index.tsx                  My Cookbooks shelf
    library.tsx                style picker and cookbook creation
    settings.tsx               account, stats, sign out
    imports.tsx                durable capture status and destination choices
    share.tsx                  native Share to Nosh handoff
    [cookbookId]/
      _layout.tsx              per-book stack
      index.tsx                BookReader for one cookbook
      add.tsx                  source composer for a new page
      review.tsx               compatibility route for the retired review flow
      generation/[pageId].tsx  compatibility generation-result route
```

The reader opens from the cover into a bookplate and recipe pages. The table of contents is retired. Review and generation-result routes are compatibility redirects for old links.

## State And Providers

`app/_layout.tsx` currently wraps the app like this:

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

Active hooks:

- `useAuth`: Supabase session/user state and sign-out. It is a hook, not an `AuthProvider`.
- `useCookbooks`: shelf state, create/delete cookbook mutations, credit balance.
- `useCookbook(cookbookId)`: per-book data, page selection, refresh, and page upsert. It is a parameterized hook, not a global provider.
- `useRecipeCaptures`: durable capture state, retry, polling, and the occasional destination choice.
- The Nosh assistant uses `@assistant-ui/react-native` with a `LocalRuntime`, device-persisted conversation history, and a bridge to the `nosh-chat` Edge Function; each active chat is scoped by the current page and book.

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

- [CONTEXT.md](CONTEXT.md)
- [docs/README.md](docs/README.md)
- [docs/PRODUCT_FLOW.md](docs/PRODUCT_FLOW.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DATABASE.md](docs/DATABASE.md)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [docs/adr/](docs/adr/)

## Status

Private, pre-launch, and production-bound. The active surface is the cookbook shelf, book reader, direct recipe capture, settings, and contextual Nosh assistant.
