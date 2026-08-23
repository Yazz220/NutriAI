# Architecture

This document describes the live book-first Nosh app. Read [PRODUCT_FLOW.md](./PRODUCT_FLOW.md) for the user journey and [ADR 0002](./adr/0002-single-capture-and-complete-page-generation.md) before changing recipe capture or page generation. Dated plans under `docs/superpowers/` are historical.

## Product Surface

```text
Signed-out user
  -> app/(auth)/sign-in

Signed-in user
  -> app/(book)/index.tsx
     -> My Cookbooks shelf
     -> persistent Nosh conversation for recipe intake and cooking help
     -> Book Library for creating a styled cookbook
     -> BookReader for one cookbook
        -> cover page
        -> bookplate
        -> recipe pages
        -> Nosh intake entry
        -> the same Nosh conversation with active page context
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
    save.tsx
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
| `app/(book)/save.tsx` | The single recipe source composer plus processing, destination, retry, and ready activity |
| `app/(book)/imports.tsx` | Compatibility redirect into Save a recipe |
| `app/(book)/share.tsx` | Native share receipt and retry screen |
| `app/(book)/settings.tsx` | Account, library stats, sign out |
| `app/(book)/[cookbookId]/index.tsx` | Swipeable reader for a single cookbook |
| `app/(book)/[cookbookId]/add.tsx` | Source composer for URL, text, image, or video import |
| `app/(book)/[cookbookId]/review.tsx` | Compatibility route for the retired blocking review flow |
| `app/(book)/[cookbookId]/generation/[pageId].tsx` | Compatibility generated-page result screen |

There is no direct `app/(book)/[cookbookId]/[pageId].tsx` file in the current branch. Reader page selection is state inside `app/(book)/[cookbookId]/index.tsx`. The review and generation routes are redirects retained only for old links. The reader now contains a bookplate and recipe pages; the table of contents has been retired.

## Root Provider Tree

`app/_layout.tsx` wraps the app as follows:

```text
ShareIntentProvider
  NoshNativeShareProvider
    QueryClientProvider
      CookbooksProvider
        NoshConversationProvider
          ToastProvider
            GlobalErrorBoundary
              RootLayoutNav
                GestureHandlerRootView
                  SafeAreaProvider
                    StatusBar
                    Stack
                      (auth)
                      (book)
                    NoshConversationHost
                    RecipeCaptureResume
                    NativeShareIngestion
                    OfflineBanner
```

Auth is currently read through `useAuth()` in `RootLayoutNav`; there is no `AuthProvider` in the live code. Per-book state is managed by `useCookbook(cookbookId)`; there is no global `CookbookProvider`. `NoshConversationProvider` keeps the assistant sheet and interaction session alive across route changes. The session records an entry point, active task, stable conversation focus, and a separate visible route context. Its root-mounted `LocalRuntime` bridges to the `nosh-chat` Edge Function via `utils/cookbook/noshChatAdapter.ts`.

## Active Hooks

| Hook | Role |
|---|---|
| `useAuth` | Supabase session, user, and sign-out |
| `useCookbooks` | Shelf list, create/delete cookbook, credit balance, shelf cache hydration |
| `useCookbook(cookbookId)` | One cookbook, its pages, selected page, refresh, and optimistic page upsert |
| `useRecipeCaptures` | Durable capture list, polling, retry, and destination selection |
| `useNoshConversation` | Persistent conversation visibility, intake state, and active book/page context |
| `useNetworkStatus` | Connectivity state for the offline banner |

`useCookbooks` is the context-backed shelf hook created with `@nkzw/create-context-hook`. Capture state is ordinary React Query state in `useRecipeCaptures`.

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

Capture from Share to Nosh, Add page, or assistant handoff
  -> capture-recipe durably saves the source
  -> extract-recipe Edge Function
     -> deterministic schema.org Recipe JSON-LD normalization for supported URLs
     -> strict-schema Qwen extraction for unstructured text/image/video
  -> destination resolves from the explicit, active, default, or sole cookbook
  -> only an unresolved destination pauses for a simple cookbook picker
  -> create_capture_page stores one processing page and the canonical RecipeGraph
  -> generate-page-art creates one complete 3:4 recipe page including visible text
  -> finalize_recipe_capture_page publishes the page and marks the capture ready
  -> React Query polling adds the published page to the reader cache

Assistant
  -> root-mounted NoshConversationHost (assistant-ui LocalRuntime)
  -> nosh-chat Edge Function (Qwen3.6-35B-A3B with tool-calling)
  -> same thread persists from shelf to reader
  -> named saved recipe: search_recipe_collection returns at most five RLS-scoped candidates
  -> selected candidate: load_recipe returns its canonical RecipeGraph
  -> explicit "open/show" request: open_recipe navigates to the owning cookbook and page
  -> tools propose changes against the RecipeGraph
  -> saved changes generate a matching replacement page before graph/version selection
```

This is the only recipe-to-page flow. `nosh-chat` can request a capture handoff, but it cannot extract and publish a page itself. Compatibility routes redirect into the active flow. The legacy typesetter can display old pages but cannot produce new ones.

All database writes are scoped by Supabase Auth and RLS. Edge Functions receive the current JWT through `callAuthenticatedFunction`.

## AI Pipeline

The pipeline has four cooperating modules with one public capture lifecycle:

1. **Recipe Extraction:** Uses deterministic Recipe JSON-LD for structured URLs, with Qwen3.6-35B-A3B for unstructured text, image, and video → RecipeGraphDraft
2. **Culinary Reasoning / Nosh Agent (Qwen3.6-35B-A3B):** Multi-turn chat with tool calls that mutate the graph live
3. **Capture Orchestration:** Resolves the destination, owns retry/idempotency, creates one processing page, and publishes it when complete
4. **Complete Page Generation (Qwen Image 3 Pro):** Produces the dish imagery, visible recipe text, typography, paper, and composition as one style-conditioned portrait page

The selected generated image is the page the user reads. The canonical `recipe_graph` is a separate machine-readable layer used by Nosh for questions, substitutions, scaling, and revisions. Legacy vector/typesetter pages remain readable, but new captures do not use that rendering pipeline.

### Assistant Chat

`components/cookbook/NoshAssistantChat.tsx` hosts a root-mounted `@assistant-ui/react-native` `LocalRuntime` wrapped by its remote-thread-list runtime. `utils/cookbook/noshThreadStorage.ts` supplies a user-scoped AsyncStorage adapter, so users can start a clean conversation, browse generated conversation titles, restore messages after an app reload, switch sessions, and delete a session through a two-step confirmation. This history is device-local rather than cross-device cloud history. Each thread stores compact Nosh interaction metadata in its custom record. Capture scratch data is not restored with a general thread. The sheet can be launched from the shelf or reader without remounting. Tools in `utils/cookbook/noshToolkit.tsx` handle capture handoff, collection retrieval, explicit navigation, organization, and focused RecipeGraph changes.

`types/noshInteraction.ts` defines the interaction contract. Reader swipes update `visibleContext`; they do not update `focus`. When a recipe is focused, "this recipe" keeps that meaning until an explicit focus change. Opening Ask Nosh from a different recipe offers two choices: move the current conversation's focus or start a new conversation. The adapter sends one focused RecipeGraph plus compact focus and visible-route metadata. It also selects tools by active task: collection, recipe help, capture, or walkthrough. Collection search returns at most five compact candidates, and one user request may load at most three canonical RecipeGraphs; larger comparisons are narrowed conversationally instead of placing the collection in model context.

Recipe changes use `utils/cookbook/recipeActions.ts`. Scaling, substitutions, and graph patches produce a cloned proposal. A human action card offers temporary Session preview, saved update, saved copy, or cancel. Session preview lives in `NoshConversationContext` and does not write React Query, AsyncStorage, or Postgres. A saved update generates its matching complete page first, then switches the canonical graph and selected version. Walkthrough is temporary conversation state and starts only after the user explicitly asks for step-by-step guidance.

Purpose-built presentation modules live under `components/nosh/`. The shelf opens with collection jobs, recipe Ask Nosh opens with recipe-specific prompts, and capture alone exposes recipe-source attachments. All wrappers share the single root runtime, thread list, identity, and focus rules. When a recipe source appears outside capture, the `start_recipe_capture` human tool asks for confirmation before changing the task; the capture tools are not exposed to general collection or recipe-help turns.

Durable recipe intake uses `nutriai.recipe_captures`. The database enforces `processing -> needs_destination | ready | needs_attention`, with `needs_destination` and `needs_attention` resuming only to `processing`. The `capture-recipe` Edge Function saves first, runs extraction in `EdgeRuntime.waitUntil`, resolves a destination, creates one `processing` cookbook page, and invokes the idempotent complete-page generator. Generator finalization atomically publishes the page and capture. There is no approval or editable-review gate. A missing destination is the only normal pause; failures become one retryable needs-attention state.

The root-mounted `RecipeCaptureResume` query restores the user-scoped capture cache, polls while work is processing, and retries explicit needs-attention captures. Processing pages stay out of cookbook counts, reader queries, and collection search until publication.

Native Share to Nosh uses `expo-share-intent` 5.1.1. The iOS extension stores one URL, text selection, or image in a variant-specific App Group and opens the main app. Android registers single-item `ACTION_SEND` filters for `text/*` and `image/*`. `NativeShareIngestion` waits for an authenticated and reachable main app, uploads images to the private `recipe-captures` bucket, then starts the same durable capture lifecycle as in-app intake. It clears the native payload only after the database confirms Saved.

Available tools: `start_recipe_capture`, `search_recipe_collection`, `load_recipe`, `open_recipe`, `list_cookbooks`, `organize_recipe`, `scale_servings`, `substitute_ingredient`, `start_timer`, `guide_next_step`, `set_walkthrough`, `update_page_data`, `regenerate_recipe_page`.

Collection retrieval is lexical by design. `cookbook_pages.recipe_graph` produces a weighted stored search vector, title trigram matching covers small voice-to-text spacing errors, and `nutriai.search_recipe_collection` ranks no more than five candidates under the caller's RLS identity. Nosh loads one full graph only after resolving a match; normal chat no longer receives a capped list of titles from the active cookbook. Embeddings are deferred until measured retrieval failures justify them.

Collection organization follows the same conversation-for-reasoning, guided-UI-for-commitment boundary. Nosh resolves an exact page and destination before rendering `CollectionActionCard`. Cancel returns to conversation without a write. Confirm calls the idempotent `organize_recipe_page` RPC, reloads the shelf and affected books from Supabase, writes React Query and AsyncStorage, then opens the moved or copied page. The client does not expose conversational delete, bulk, or reorder actions.

Long-running assistant work is surfaced by one root-level native progress card. It appears before frontend tools finish, uses real runtime/extraction/page-creation state, supports reduced motion, shows delayed reassurance, and allows cancellation to propagate to the active request.

Secrets:

```text
AI_API_KEY
AI_API_BASE
AI_MODEL
```

### Recipe Import

Share to Nosh, Cookbook Add, assistant handoff, and Save a recipe activity all use `capture-recipe` through `utils/cookbook/api.ts`. Structured recipe pages bypass the extraction model through schema.org Recipe JSON-LD normalization; other text, images, and video links use strict-schema model extraction. Image MIME types are preserved. Video remains URL-only and provider-dependent. Audio intake is not implemented and must not be advertised as available. The retired imports and review routes redirect into the capture workspace and do not own state or generation.

Secrets:

```text
AI_API_KEY
AI_API_BASE
AI_MODEL
```

### Complete Cookbook Page Generation

`generate-page-art` keeps its route name for deployment compatibility, but its contract is a complete recipe page. It receives the canonical RecipeGraph, versioned cookbook style, and optional immutable style-reference images. Qwen Image 3 Pro creates a 3:4, 2K page containing the dish imagery and exact visible title, ingredients, instructions, and supporting copy. The version is stored in Supabase Storage and linked to the page. Explicit visual regeneration remains a candidate until the user selects it. Saved recipe-data changes first produce a matching replacement image, then switch the canonical graph and selected version together.

Secrets:

```text
AI_API_KEY
AI_API_BASE
ART_MODEL
```

## Cookbook Visual Identity And Page Composition

`constants/cookbookStyles.ts` defines the twelve persisted cookbook style IDs so existing books remain stable while the creation flow can expose a curated subset:

```text
vintage-garden
handwritten
editorial
watercolor
rustic
minimal
sage-linen
terracotta-cloth
navy-leather
charcoal-cloth
alabaster-linen
umber-leather
```

`cover_style` on `nutriai.cookbooks` is the visual-identity key for the whole book. `style_revision` freezes the identity contract used for a given generation era, and `page_style_references` stores optional visual anchors. Together they own paper treatment, palette, typography, decorative language, food rendering, and composition. `_shared/artGeneration.ts` turns that contract and the exact RecipeGraph copy into the complete-page prompt.

New imports do not ask the user to choose a per-recipe visual template. The image model composes each page from the RecipeGraph's actual structure and the cookbook's persisted style contract. The capture function still writes a density-derived `cookbook_pages.template_id`, and books still have `page_template_id`, but those are compatibility metadata for legacy vector rendering. The complete-page generator does not receive either field. Do not turn them into a second style or generation pipeline.

Page requests include the exact visible recipe copy and structured visual ingredients, use the immutable cookbook style contract, and generate a 3:4, 2K portrait page. Explicit visual regeneration can use the currently selected page as an image-editing reference, but a generated candidate remains unselected until the user selects it.

## Offline Sample Book

`utils/cookbook/sampleCookbook.ts` defines static demo cookbooks and pages. When `useCookbook` receives a static cookbook id, Supabase queries are skipped and fixture data is returned. This supports reader and assistant UI checks without database writes or AI calls.

## Cache Keys

- `nosh:cookbook-shelf:v2:<userId>`: cached `Cookbook[]` for the shelf.
- `nosh:cookbook-pages:v2:<cookbookId>`: cached `CookbookPage[]` for one book.

The caches are hydrated before network responses and then updated from React Query results.

## Current Boundaries

Keep product work inside these domains:

- cookbooks and pages
- single capture-to-book recipe import
- generated cookbook-page images
- in-book assistant
- account and auth surfaces

Do not add legacy non-cookbook surfaces or persistent bottom navigation unless the product direction changes explicitly.
