# AGENTS.md

## Project Overview

**Nosh** is a React Native mobile app built with Expo. It is a book-first personal cookbook with a persistent conversational chef: users talk to Nosh from the shelf or reader, share links, text, images, or video, and receive a complete AI-designed recipe page inside the appropriate book. The extracted RecipeGraph remains available to Nosh for reasoning and edits. The conversation follows the user into the open book and can act on the active recipe.

Do not frame the app as a legacy non-cookbook product or a chat-first recipe manager. The active product is the cookbook shelf and reader.

## Tech Stack

- React Native with Expo SDK 54.
- Expo Router for file-based navigation.
- TypeScript strict mode.
- Supabase backend in the private `nutriai` schema with RLS.
- Supabase Edge Functions for AI, import, generation, credits, and account deletion.
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
- `app/(book)/library.tsx`: style picker and cookbook creation.
- `app/(book)/imports.tsx`: recipe-capture history, destination choice, retry, and completed-page links.
- `app/(book)/share.tsx`: native Share to Nosh receipt and retry surface.
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
      CookbooksProvider
        NoshConversationProvider
          ToastProvider
            GlobalErrorBoundary
              RootLayoutNav
```

Current provider/hook reality:

- `useAuth`: Supabase auth state; no `AuthProvider` exists.
- `CookbooksProvider` / `useCookbooks`: shelf state, cookbook creation/deletion, credit balance.
- `useCookbook(cookbookId)`: per-book data; no `CookbookProvider` exists.
- `useRecipeCaptures`: durable capture state, polling, retry, and destination selection.
- `NoshConversationProvider` / `useNoshConversation`: persistent chat visibility, intake state, and active cookbook/page context across shelf-to-reader navigation.
- `useNoshAssistant`: removed. The Nosh assistant uses `@assistant-ui/react-native` with a root-mounted `LocalRuntime` plus a device-persisted thread list bridging to the `nosh-chat` Edge Function via `utils/cookbook/noshChatAdapter.ts`. Users can start, switch, restore, and delete conversations. Tools are defined in `utils/cookbook/noshToolkit.tsx`.

## AI And Import Architecture

There is exactly one recipe-capture pipeline. Every recipe source, including a Nosh conversation handoff, must enter `capture-recipe`. Do not call extraction and page creation directly from a screen or assistant tool.

```text
User shares or submits a link, text, photo, or video
  -> capture-recipe durably saves the source
  -> extract-recipe produces a RecipeGraph
     -> URL with schema.org Recipe JSON-LD: deterministic normalization
     -> unstructured text/image/video: Qwen3.6-35B-A3B with strict schema output
  -> destination resolves from the active, explicit, default, or sole cookbook
  -> only an unresolved destination pauses for a simple book picker
  -> one processing CookbookPage stores the RecipeGraph as JSONB
  -> generate-page-art creates the complete designed page with visible recipe text
  -> the versioned cookbook style and reference anchors condition the page
  -> the finished image and capture publish atomically into the reader
  -> the same Nosh conversation remains available in the reader
```

Active functions:

- `extract-recipe`: URL, text, image, and video → RecipeGraphDraft. Uses deterministic Recipe JSON-LD when available and Qwen3.6-35B-A3B via OpenRouter for unstructured sources. Audio intake is not implemented.
- `capture-recipe`: durable orchestration for extraction, destination resolution, complete-page generation, retry, and publication.
- `nosh-chat`: multi-turn kitchen chat with tool-calling (`start_recipe_capture`, collection retrieval, navigation, organization, recipe changes, timers, walkthrough, and complete-page regeneration). Uses Qwen3.6-35B-A3B via OpenRouter.
- `generate-page-art`: complete style-conditioned recipe-page generation, including visible recipe text. Uses Qwen Image 3 Pro via OpenRouter.
- `credits`: credit balance.
- `delete-account`: account deletion.

Pipeline invariants:

- `capture-recipe` owns capture persistence, extraction, destination resolution, page creation, retry, and publication.
- `nosh-chat` may request `start_recipe_capture`, but it does not extract or publish a recipe itself.
- `generate-page-art` is a legacy route name for complete-page generation. Its output includes the visible recipe text and imagery.
- `recipe_graph` is the canonical reasoning record. The selected `page_versions` image is the reading artifact.
- New captures do not use review or approval. Their states are `processing`, `needs_destination`, `needs_attention`, and `ready`.
- The cookbook row owns style id, style revision, and visual references. Never accept a caller-defined per-recipe style as canonical.
- The typesetter is a compatibility renderer for old pages only. It is not a second generation pipeline.

## Environment Variables

Client-safe `.env` keys:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=qwen/qwen3.6-35b-a3b
EXPO_PUBLIC_ART_MODEL=qwen/qwen-image-3-pro
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2=false
```

`EXPO_PUBLIC_NOSH_CONTEXT_MODEL_V2` changes conversation presentation only. It must never select a separate extraction, capture, or page-generation pipeline.

Edge Function secrets in Supabase:

```text
AI_API_KEY, AI_API_BASE, AI_MODEL          extract-recipe and nosh-chat
ART_MODEL                                 generate-page-art
```

Never expose provider API keys through `EXPO_PUBLIC_*`.

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
| `utils/cookbook/api.ts` | Supabase and Edge Function API calls |
| `utils/cookbook/cache.ts` | AsyncStorage shelf/page cache |
| `utils/cookbook/noshChatAdapter.ts` | bridges assistant-ui to nosh-chat Edge Function |
| `utils/cookbook/noshThreadStorage.ts` | user-scoped device persistence for conversation threads and messages |
| `utils/cookbook/noshToolkit.tsx` | Nosh tool definitions with execute + render |
| `utils/cookbook/sampleCookbook.ts` | offline sample book fixtures |
| `constants/cookbookStyles.ts` | persisted cookbook style contracts and the curated creation set |

## Development Guidelines

- Use `@/` path aliases for cross-folder imports.
- Use Edge Functions for provider calls and service-role work.
- Use `constants/colors.ts`, `constants/spacing.ts`, and `constants/cookbookStyles.ts` for styling.
- Keep generated page prompts tied to the active cookbook style.
- Route every new recipe source through `capture-recipe`; do not add a parallel import or image pipeline.
- Keep provider order in `app/_layout.tsx` stable unless all consumers are checked.
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
