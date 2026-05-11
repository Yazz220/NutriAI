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
| `app/(book)/index.tsx` | My Cookbooks shelf and sample-book preview entry |
| `app/(book)/library.tsx` | Cookbook style picker and cookbook creation |
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

Auth is currently read through `useAuth()` in `RootLayoutNav`; there is no `AuthProvider` in the live code. Per-book state is managed by `useCookbook(cookbookId)`; there is no global `CookbookProvider`. Assistant state is local to `NoshAssistantSheet` via `useNoshAssistant`; there is no `NoshAssistantProvider`.

## Active Hooks

| Hook | Role |
|---|---|
| `useAuth` | Supabase session, user, and sign-out |
| `useCookbooks` | Shelf list, create/delete cookbook, credit balance, shelf cache hydration |
| `useCookbook(cookbookId)` | One cookbook, its pages, selected page, refresh, and optimistic page upsert |
| `useCookbookImport` | Import draft, parser status, extraction confidence, review reasons |
| `useNoshAssistant` | Assistant messages, quick prompts, and chat requests with current page/book context |
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
  -> nutriai.cookbooks + nutriai.cookbook_pages + nutriai.recipes + page_versions
  -> AsyncStorage per-book pages cache

Import
  -> AddPageComposer
  -> useCookbookImport.parseSource
  -> parse-recipe-source Edge Function
  -> RecipeReviewForm
  -> generate-cookbook-page Edge Function
  -> React Query page cache upsert
```

All database writes are scoped by Supabase Auth and RLS. Edge Functions receive the current JWT through `callAuthenticatedFunction`.

## AI Pipeline

### Assistant Chat

`components/cookbook/NoshAssistantSheet.tsx` calls `useNoshAssistant`, which calls `utils/aiClient.createChatCompletion`. The client calls the `ai-chat` Edge Function, and `ai-chat` forwards the request to an OpenRouter-compatible chat-completions endpoint.

Secrets:

```text
AI_API_KEY
AI_API_BASE
AI_MODEL
```

### Recipe Import

The app calls `parse-recipe-source` through `utils/cookbook/api.ts`.

`parse-recipe-source` handles URL, text, image, and video payloads. It uses OpenRouter-compatible chat completions for the primary extraction path. For image and video inputs, it can fall back to the direct Gemini functions:

- `parse-image-recipe`: Gemini 2.5 Flash over base64 image input.
- `parse-video-recipe`: Gemini 2.5 Flash over video URL/file input.

Secrets:

```text
AI_API_KEY
AI_API_BASE
AI_MODEL
GEMINI_API_KEY
```

### Cookbook Page Generation

`generate-cookbook-page` receives the reviewed structured recipe and the active cookbook style descriptor from `utils/cookbook/pagePrompt.ts`. It generates a page image with OpenAI image generation, stores it in Supabase Storage, records a page version, and reserves one generation credit.

Secrets:

```text
OPENAI_API_KEY
OPENAI_IMAGE_MODEL
COOKBOOK_PAGE_BUCKET
```

## Cookbook Style System

`constants/cookbookStyles.ts` defines the six supported style IDs:

```text
vintage-garden
handwritten
editorial
watercolor
rustic
minimal
```

Each style owns its cover palette, shelf background, and `pagePromptDescriptor`. `cover_style` is stored on `nutriai.cookbooks`, and generated pages use that descriptor so pages stay visually consistent within one book.

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
