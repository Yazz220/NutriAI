# Architecture

This document describes the live book-first Nosh app. If it disagrees with the code, update this document after checking the code.

## Product Surface

```text
Signed-out user
  -> app/(auth)/sign-in

Signed-in user
  -> app/(book)/index.tsx
     -> My Cookbooks shelf
     -> Book Library for creating a styled cookbook
     -> BookReader for one cookbook
        -> cover page
        -> table-of-contents reader page
        -> recipe pages
        -> add-page sheet and composer
        -> in-book Nosh assistant
```

There is no persistent bottom navigation. The shelf is the home surface, and a cookbook reader is the primary product surface after a book is opened.

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
    settings.tsx
    [cookbookId]/
      _layout.tsx
      index.tsx
      add.tsx
      review.tsx
      generation/
        [pageId].tsx
```

Route responsibilities:

| File | Purpose |
|---|---|
| `app/_layout.tsx` | Root providers, splash/font loading, auth guard, top-level stack, offline banner |
| `app/(auth)/index.tsx` | Redirects to sign-in |
| `app/(auth)/sign-in.tsx` | Email/password, magic link, Google, Apple sign-in entry |
| `app/(auth)/sign-up.tsx` | Account creation |
| `app/(auth)/forgot-password.tsx` | Password reset email request |
| `app/(auth)/reset-password.tsx` | Password reset form reached via recovery callback |
| `app/(book)/index.tsx` | My Cookbooks shelf and sample-book preview entry |
| `app/(book)/library.tsx` | Two-cover cookbook picker and cookbook creation |
| `app/(book)/settings.tsx` | Account, library stats, sign out |
| `app/(book)/[cookbookId]/index.tsx` | Swipeable reader for a single cookbook |
| `app/(book)/[cookbookId]/add.tsx` | Source composer for URL, text, image, or video import |
| `app/(book)/[cookbookId]/review.tsx` | Review extracted recipe before spending a page credit |
| `app/(book)/[cookbookId]/generation/[pageId].tsx` | Generated-page result screen |

There is no direct `app/(book)/[cookbookId]/[pageId].tsx` file in the current branch. Reader page selection is state inside `app/(book)/[cookbookId]/index.tsx`; generation results use `generation/[pageId].tsx`.

The table of contents is a reader page rendered by `components/cookbook/BookTableOfContentsPage.tsx`, not a standalone route.

## Root Provider Tree

`app/_layout.tsx` wraps the app as follows:

```text
QueryClientProvider
  CookbooksProvider
    CookbookImportProvider
      ToastProvider
        GlobalErrorBoundary
          RootLayoutNav
            GestureHandlerRootView
              SafeAreaProvider
                StatusBar
                Stack
                  (auth)
                  (book)
                OfflineBanner
```

Auth is currently read through `useAuth()` in `RootLayoutNav`; there is no `AuthProvider` in the live code. Per-book state is managed by `useCookbook(cookbookId)`; there is no global `CookbookProvider`. The Nosh assistant uses `@assistant-ui/react-native` with a `LocalRuntime` bridging to the `nosh-chat` Edge Function via `utils/cookbook/noshChatAdapter.ts`; there is no `NoshAssistantProvider`.

## Active Hooks

| Hook | Role |
|---|---|
| `useAuth` | Supabase session, user, and sign-out |
| `useCookbooks` | Shelf list, create/delete cookbook, credit balance, shelf cache hydration |
| `useCookbook(cookbookId)` | One cookbook, its pages, selected page, refresh, and optimistic page upsert |
| `useCookbookImport` | Import draft, parser status, extraction confidence, review reasons |
| `useNetworkStatus` | Connectivity state for the offline banner |

`useCookbooks` and `useCookbookImport` are the context-backed hooks created with `@nkzw/create-context-hook`.

## Data Flow

```text
Shelf
  -> useCookbooks
  -> nutriai.cookbooks
  -> AsyncStorage shelf cache

Reader
  -> useCookbook(cookbookId)
  -> nutriai.cookbooks + nutriai.cookbook_pages (with recipe_graph JSONB)
  -> AsyncStorage per-book pages cache

Import
  -> UnifiedIntakeComposer (auto-detects source type)
  -> useCookbookImport.extractRecipe
  -> extract-recipe Edge Function (Qwen3.6-35B-A3B)
  -> RecipeGraphDraft → ParsedRecipeDraft bridge
  -> RecipeReviewForm
  -> createRecipePageWithGraph (stores RecipeGraph as JSONB)
  -> generate-page-art Edge Function (Qwen Image 3 Pro)
  -> TypesetterPage renders live vector text + art
  -> React Query page cache upsert

Assistant
  -> NoshAssistantChat (assistant-ui LocalRuntime)
  -> nosh-chat Edge Function (Qwen3.6-35B-A3B with tool-calling)
  -> tools execute against RecipeGraph → live typesetter re-render
  -> changes persisted to cookbook_pages.recipe_graph
```

All database writes are scoped by Supabase Auth and RLS. Edge Functions receive the current JWT through `callAuthenticatedFunction`.

## AI Pipeline

The pipeline has three independent engines, each doing one thing well:

1. **Multimodal Extraction (Qwen3.6-35B-A3B):** Ingests URL, text, image, video → structured RecipeGraphDraft
2. **Culinary Reasoning / Nosh Agent (Qwen3.6-35B-A3B):** Multi-turn chat with tool calls that mutate the graph live
3. **Generative Art (Qwen Image 3 Pro):** Isolated, style-conditioned illustrations — no text, ever

The page the user sees is a composite: vector text from the typesetter + artwork from the generator, layered at render time. Editing a recipe re-flows text instantly with zero image re-generation cost.

### Assistant Chat

`components/cookbook/NoshAssistantChat.tsx` uses `@assistant-ui/react-native` with a `LocalRuntime`. The runtime bridges to the `nosh-chat` Edge Function via `utils/cookbook/noshChatAdapter.ts`. Tools are defined in `utils/cookbook/noshToolkit.tsx` and execute against the active page's RecipeGraph, triggering live typesetter re-renders.

Available tools: `scale_servings`, `substitute_ingredient`, `start_timer`, `guide_next_step`, `update_page_data`.

Secrets:

```text
AI_API_KEY
AI_API_BASE
AI_MODEL
```

### Recipe Import

The app calls `extract-recipe` through `utils/cookbook/api.ts`. This single multimodal model handles URL, text, image, and video inputs natively — no fallback functions needed.

Secrets:

```text
AI_API_KEY
AI_API_BASE
AI_MODEL
```

### Cookbook Page Art Generation

`generate-page-art` receives the RecipeGraph and cookbook style descriptor. It generates an isolated illustration (no text) with Qwen Image 3 Pro via OpenRouter, stores it in Supabase Storage, and links it to the page. The typesetter renders the page live by layering vector text over the art asset.

Secrets:

```text
AI_API_KEY
AI_API_BASE
ART_MODEL
```

## Cookbook Covers And Page Templates

`constants/cookbookStyles.ts` still defines the six persisted style IDs so existing cookbooks render safely:

```text
vintage-garden
handwritten
editorial
watercolor
rustic
minimal
```

The creation flow only exposes two covers: Classic Kitchen (`vintage-garden`) and Modern Journal (`minimal`). `cover_style` remains stored on `nutriai.cookbooks`.

Recipe page styling is now selected per import from `constants/recipeTemplates.ts`. The selected template is held in `useCookbookImport`, favorites persist locally in `nosh:favorite-page-templates:v1`, and the template ID is stored on `cookbook_pages.template_id`. The typesetter uses the template to lay out vector text from the RecipeGraph.

## Offline Sample Book

`utils/cookbook/sampleCookbook.ts` defines static demo cookbooks and pages. When `useCookbook` receives a static cookbook id, Supabase queries are skipped and fixture data is returned. This supports reader and assistant UI checks without database writes or AI calls.

## Cache Keys

- `nosh:cookbook-shelf:v2:<userId>`: cached `Cookbook[]` for the shelf.
- `nosh:cookbook-pages:v2:<cookbookId>`: cached `CookbookPage[]` for one book.

The caches are hydrated before network responses and then updated from React Query results.

## Current Boundaries

Keep product work inside these domains:

- cookbooks and pages
- recipe import and review
- generated cookbook-page images
- in-book assistant
- account and auth surfaces

Do not add legacy non-cookbook surfaces or persistent bottom navigation unless the product direction changes explicitly.
