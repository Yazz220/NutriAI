# AGENTS.md

## Project Overview

**Nosh** is a React Native mobile app built with Expo. It is a book-first personal cookbook: users create styled cookbooks, import recipes from links/text/images/video, review the extracted recipe, and generate a rendered page inside the selected book. The Nosh assistant is an in-book chef assistant that answers from the active page and the rest of the current cookbook.

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
  (book)/
    _layout.tsx
    index.tsx
    library.tsx
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
- `app/(book)/settings.tsx`: account, library stats, sign out.
- `app/(book)/[cookbookId]/index.tsx`: book reader.
- `app/(book)/[cookbookId]/add.tsx`: add source for a new recipe page.
- `app/(book)/[cookbookId]/review.tsx`: proof extracted recipe before generation.
- `app/(book)/[cookbookId]/generation/[pageId].tsx`: generated-page result.

There is no direct `app/(book)/[cookbookId]/[pageId].tsx` file in this branch. The selected page is reader state inside `[cookbookId]/index.tsx`. The table of contents is rendered inside the reader by `components/cookbook/BookTableOfContentsPage.tsx`; it is not a route.

## Provider Tree

Current `app/_layout.tsx` provider order:

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

Current provider/hook reality:

- `useAuth`: Supabase auth state; no `AuthProvider` exists.
- `CookbooksProvider` / `useCookbooks`: shelf state, cookbook creation/deletion, credit balance.
- `useCookbook(cookbookId)`: per-book data; no `CookbookProvider` exists.
- `CookbookImportProvider` / `useCookbookImport`: import draft and review state.
- `useNoshAssistant`: assistant state inside `NoshAssistantSheet`; no `NoshAssistantProvider` exists.

## AI And Import Architecture

```text
User adds source in a book
  -> AddPageComposer
  -> useCookbookImport.parseSource
  -> parse-recipe-source Edge Function
  -> RecipeReviewForm
  -> generate-cookbook-page Edge Function
  -> returned CookbookPage is upserted into React Query
```

Active functions:

- `ai-chat`: OpenRouter-compatible chat proxy for the Nosh assistant.
- `parse-recipe-source`: URL/text/image/video import orchestrator using OpenRouter-compatible extraction, with image/video fallback paths.
- `parse-image-recipe`: Gemini 2.5 Flash direct image extraction fallback.
- `parse-video-recipe`: Gemini 2.5 Flash direct video extraction fallback.
- `generate-cookbook-page`: OpenAI image generation for rendered cookbook pages.
- `credits`: credit balance.
- `delete-account`: account deletion.

## Environment Variables

Client-safe `.env` keys:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth/callback
EXPO_PUBLIC_AI_MODEL=openai/gpt-oss-20b:free
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_SHOW_DEMO_COOKBOOK=false
```

Edge Function secrets in Supabase:

```text
AI_API_KEY, AI_API_BASE, AI_MODEL          ai-chat and parse-recipe-source
GEMINI_API_KEY                            parse-image-recipe and parse-video-recipe fallbacks
OPENAI_API_KEY, OPENAI_IMAGE_MODEL         generate-cookbook-page
COOKBOOK_PAGE_BUCKET                       optional generated-page storage bucket override
```

Never expose provider API keys through `EXPO_PUBLIC_*`.

## Key Files

| File | Purpose |
|---|---|
| `hooks/useAuth.ts` | Supabase auth state |
| `hooks/useCookbooks.ts` | shelf provider |
| `hooks/useCookbook.ts` | one-book hook |
| `hooks/useCookbookImport.ts` | import/review state |
| `hooks/useNoshAssistant.ts` | in-book assistant |
| `components/cookbook/BookReader.tsx` | swipeable reader |
| `components/cookbook/BookTableOfContentsPage.tsx` | in-reader contents page |
| `components/cookbook/AddPageComposer.tsx` | recipe source composer |
| `components/cookbook/RecipeReviewForm.tsx` | review/proof form |
| `components/cookbook/GenerationResult.tsx` | generated-page result |
| `utils/cookbook/api.ts` | Supabase and Edge Function API calls |
| `utils/cookbook/cache.ts` | AsyncStorage shelf/page cache |
| `utils/cookbook/pagePrompt.ts` | page-generation prompt payload |
| `utils/cookbook/sampleCookbook.ts` | offline sample book fixtures |
| `constants/cookbookStyles.ts` | six style presets |

## Development Guidelines

- Use `@/` path aliases for cross-folder imports.
- Use Edge Functions for provider calls and service-role work.
- Use `constants/colors.ts`, `constants/spacing.ts`, and `constants/cookbookStyles.ts` for styling.
- Keep generated page prompts tied to the active cookbook style.
- Keep provider order in `app/_layout.tsx` stable unless all consumers are checked.
- Only packages with config plugins belong in `app.json` plugins.
- Do not edit another worker's unrelated files on the shared cleanup branch.
- Do not commit unless the user explicitly asks.

## Documentation

- `README.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DEVELOPMENT.md`
- `docs/superpowers/specs/`
- `docs/superpowers/plans/`
