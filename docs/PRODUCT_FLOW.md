# Current product flow

This document describes the experience implemented in the current branch. Use it to understand the app, trace a recipe, and decide where a change belongs.

## The product in one sentence

A user shares a recipe with Nosh, Nosh understands it, creates a complete page in the visual style of the chosen cookbook, and keeps the structured recipe available for cooking help.

## Typical user journey

```text
Create or choose a cookbook
  -> find a recipe in another app
  -> Share to Nosh
  -> Nosh saves and extracts the source
  -> Nosh resolves the destination cookbook
  -> Nosh generates the complete recipe page
  -> the page appears inside the cookbook
  -> the user opens the book and flips to the recipe
  -> Ask Nosh uses the structured recipe while the user cooks
```

The same flow starts from the shelf's Save a recipe action, a cookbook's Add page action, or a confirmed recipe handoff inside a Nosh conversation.

## Entry points

| Entry | Destination supplied? | What happens next |
|---|---:|---|
| Share to Nosh from iOS or Android | Usually no | The app stores the handoff, starts a durable capture, and shows a receipt. |
| Save a recipe from the bookshelf | No | The capture uses the default or sole cookbook when available. |
| Add page from an open cookbook | Yes | The finished page returns to that book and opens at the new recipe. |
| Send a recipe source to Nosh | Depends on active context | Nosh asks before switching to capture, then hands the source to the same capture workspace. |
| Retry from Save a recipe activity | Preserved | The existing capture resumes. It does not create a second capture or page. |

Supported sources are a URL, pasted text, one image, or a video link. Audio and multi-file share are not implemented.

## Destination rules

Nosh resolves a cookbook in this order:

1. Use the cookbook explicitly supplied by a cookbook-scoped entry point.
2. Otherwise use the user's default cookbook.
3. Otherwise use the user's only cookbook.
4. If no destination is available, set the capture to `needs_destination` and show the cookbook picker.

If the user's shelf is empty, the picker offers Create a cookbook. Creating the first book resumes the waiting capture and returns to its progress screen.

## Capture states

```text
processing
  -> ready
  -> needs_destination -> processing
  -> needs_attention   -> processing
```

| State | Meaning | User action |
|---|---|---|
| `processing` | Nosh is extracting the recipe or generating its page. | The user may leave. Work continues and the app polls for updates. |
| `needs_destination` | The Recipe Graph exists, but no cookbook can supply a visual identity. | Choose or create a cookbook. |
| `needs_attention` | Extraction or page generation failed. | Retry the same capture. |
| `ready` | The complete page is published in its cookbook. | Open the recipe or continue browsing. |

There is no review, approval, or provisional-page state in the current product.

## What Nosh stores

Each completed recipe page has two related forms:

| Form | Used by | Contains |
|---|---|---|
| Recipe Graph | Nosh and collection search | Structured title, servings, ingredients, steps, notes, provenance, and other recipe facts. |
| Selected generated page image | Reader | The complete designed page with imagery and all visible recipe text. |

The generated page is not a standalone food illustration. It is the full page the user reads.

When a saved recipe changes, Nosh first generates a replacement page from the proposed Recipe Graph. The app switches the canonical graph and selected page version together after generation succeeds. A failed generation leaves the current recipe and page unchanged.

## Cookbook visual identity

Each cookbook persists two independent choices: `cover_style` for its physical binding and `page_style_id` for the visual language of its generated recipe pages. The page style also owns a revision and optional visual reference images. Page generation reads that identity from the database. It does not trust a caller to choose a different style for one recipe.

The page style controls paper, palette, typography, decorative language, food treatment, and composition. Layout may vary with recipe density, but the book's page identity stays fixed. Changing the cover finish never changes the pages.

The creation studio presents one live book, not a grid of separate products. The user names it, chooses a featured cover finish, and chooses Illustrated, Editorial, or Heritage pages. The brownie and cookie sample spread previews the selected page style; those samples are bundled previews and are not copied into the user's new cookbook.

## Reading and cooking

The reader starts with the closed front cover. Opening it reveals the bookplate and recipe pages. The table of contents is not part of the current reader.

From a recipe page, the user can:

- flip to another recipe;
- open Add page;
- ask Nosh about the focused recipe;
- scale servings or request a substitution;
- start a timer or walkthrough;
- save a revised page or save a copy;
- request a visual regeneration and choose whether to use the candidate.

Nosh keeps stable conversation focus even if the visible reader page changes. Opening Ask Nosh from another recipe asks whether to move the current conversation or start a new one.

## The one-pipeline rule

All recipe sources must enter `capture-recipe`. No screen, assistant tool, or compatibility route may extract a recipe and create a page independently.

`generate-page-art` is the only new-page image generator. Its name is retained for deployment compatibility, but its output is a complete recipe page with text. The typesetter is a fallback for legacy pages, not a second production path.

See [ADR 0002](./adr/0002-single-capture-and-complete-page-generation.md) for the decision and [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details.

## Where to debug

| Problem | Start here |
|---|---|
| Native share does not reach Nosh | `components/nosh/capture/NativeShareIngestion.tsx`, `utils/cookbook/nativeShareAdapter.ts`, then the `/share` receipt route |
| Capture is missing or duplicated | `supabase/functions/capture-recipe/index.ts`, `captureLifecycle.ts`, capture idempotency keys, and `recipe_captures` |
| Recipe extraction is wrong | `supabase/functions/extract-recipe/index.ts`, URL evidence helpers, and the stored Recipe Graph |
| Wrong cookbook selected | `begin_recipe_capture`, the cookbook `is_default` field, and the explicit destination passed by the entry point |
| Page style does not match the book | Cookbook `page_style_id`, `style_revision`, `page_style_references`, then `_shared/artGeneration.ts` |
| Page generation is stuck | `generation_requests`, `page_versions`, `generate-page-art` logs, OpenRouter availability, then capture `pageStatus` |
| Finished page is absent from the reader | Capture `status`, page `lifecycle_status`, `selected_version_id`, and `useRecipeCaptures` reconciliation |
| Nosh answers from the wrong recipe | `NoshConversationContext`, interaction focus, `noshChatAdapter.ts`, and collection retrieval tools |

## Compatibility code

The review and generation result routes redirect old links into the active flow. Legacy typesetter components keep old pages readable. Do not use either compatibility area as a template for new work.
