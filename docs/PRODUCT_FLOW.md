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

Supported sources are a URL, pasted text, one image, one existing audio recording, a public YouTube link, or a direct MP4, MOV, MPEG, or WebM file URL up to 20 MB. Before an image is saved, the client applies its orientation, fits it within the canonical 2400-pixel reading boundary, and encodes it as a JPEG below the extractor's 8 MB limit. Audio uses the system file picker and accepts MP3, M4A, WAV, AAC, AIFF, OGG, or FLAC files up to 6 MB; Nosh does not record from the microphone. User notes attached to an image or audio file remain part of its recipe evidence. Social post pages such as TikTok and Instagram are not treated as video files; the capture explains how to replace them with screenshots or pasted text. Uploaded video files and multi-file share are not implemented.

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
| `needs_attention` | The source lacks usable recipe evidence, a critical recipe detail needs correction, or a technical stage failed. | Replace an unusable source, correct the flagged details, or retry a technical failure. |
| `ready` | The complete page is published in its cookbook. | Open the recipe or continue browsing. |

There is no general review, approval, or provisional-page state. A focused recipe correction appears only when deterministic checks find an actionable cooking-critical problem.

Retry resumes from the last compatible capture checkpoint. It reuses a saved transcript after transcription, a saved Recipe Graph after normalization and quality checks, and a ready selected page image after generation. A publication retry adds that existing image to the reader; it does not generate another page. The provider or model may change without changing this flow because checkpoint compatibility follows Nosh's versioned stage contracts, not a provider name.

Before a Recipe Graph or cookbook page can be created, extraction returns one provider-neutral evidence decision:

| Outcome | Meaning | Result |
|---|---|---|
| `recipe` | One usable ingredient list and cooking method are supported by the source. | Continue with the canonical Recipe Graph. |
| `not_recipe` | The source is unrelated to recipes or blank/empty. | Stop in `needs_attention`; ask for another source. |
| `insufficient_evidence` | The source may concern a recipe but is unreadable, incomplete, or contains multiple inseparable recipes. | Stop in `needs_attention`; explain what is missing and ask for another source. |

The model supplies the classification and an internal diagnostic. Nosh owns the reason codes, user-facing copy, and recovery action. Rejected evidence never reaches page creation, and provider wording is never shown directly to the user.

Accepted evidence then receives a versioned recipe quality assessment. It checks observable facts such as ingredient amount coverage, oven temperature, serving-yield agreement, valid time values, and critical fields marked as inferred. The result is `auto_publish`, `publish_with_note`, or `needs_correction`. The first two continue automatically. `needs_correction` saves the Recipe Graph on the capture, stops before page creation, and opens a compact editor for the flagged recipe. Saving valid corrections resumes the same capture. Only an explicitly reviewed inferred critical field can be confirmed without changing its value; missing or contradictory facts must be fixed.

## What Nosh stores

Each completed recipe page has two related forms:

| Form | Used by | Contains |
|---|---|---|
| Recipe Graph | Nosh and collection search | Structured title, source yield, optional numeric servings, ingredients with retained source lines, grouped steps, notes, provenance, and the latest quality assessment. |
| Selected generated page image | Reader | The complete designed page with imagery and all visible recipe text. |

The generated page is not a standalone food illustration. It is the full page the user reads.

For structured website imports, Nosh keeps the URL the user submitted and the publisher's canonical URL separately. It records the parser version, fetched time, content hash, language, page title, structured-data identity, candidate count, and selection reason. Ingredient lines remain available as `rawText` after conservative quantity and unit parsing. Schema.org `HowToSection` names become canonical step-group labels. If a source says "1 loaf" or "Makes 24 cookies," the graph preserves that yield without inventing a people-serving count.

When a saved recipe changes, Nosh first generates a replacement page from the proposed Recipe Graph. The app switches the canonical graph and selected page version together after generation succeeds. A failed generation leaves the current recipe and page unchanged.

## Cookbook visual identity

Each cookbook persists `cover_finish_id` and `cover_color_id` as independent surface choices. `cover_style` remains a compatibility value derived from the color. `page_style_id` independently owns the internal visual identity of generated recipe pages, together with a revision and optional visual reference images. Page generation reads that identity from the database. It does not use the cover texture or color and does not trust a caller to choose a different style for one recipe.

The page identity controls paper, palette, typography, decorative language, food treatment, and composition. Layout may vary with recipe density, but the identity stays fixed. New cookbooks choose Illustrated, Editorial, or Heritage. Legacy identities remain readable so existing books do not change.

The creation studio presents the same Nosh book every user will own. The user names it, chooses Fine cloth or Natural linen, chooses one of six curated colors, and chooses the recipe-page style shared by the book. Texture and color update the same live physical preview independently. A Cover and Inside switcher previews the canonical physical cover or a two-page sample of the selected recipe style. Dimensions, binding, page system, opening behavior, page flipping, shadows, and interactions are owned by Nosh and are not presented as configuration choices.

## Reading and cooking

The reader starts with the closed front cover. Opening it reveals the bookplate and recipe pages. The table of contents is not part of the current reader.

From a recipe page, the user can:

- flip to another recipe;
- open Add page;
- ask Nosh about the focused recipe;
- scale servings or request a substitution;
- start a timer or walkthrough;
- save a revised page or save a copy;
- visit the original source, share or export the page, move it, or remove it;
- request a visual regeneration and choose whether to use the candidate.
- open the recipe menu to edit extracted details or try another page design. Both actions create a preview while the current page stays selected.
- export the complete cookbook from book settings as a cover plus every finished recipe page in reading order.

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
| Retry repeats expensive work | Capture `stage_checkpoints`, the saved artifact for the last completed stage, and `_shared/captureStages.ts` |
| Valid source is classified incorrectly | `supabase/functions/_shared/recipeEvidence.ts`, `extract-recipe` evidence diagnostics, and the capture `failure_code` |
| Recipe image is oversized, blurry, or incomplete | `recipeCaptureImage.ts`, `recipeCaptureImageContract.ts`, `imageRecipeEvidence.ts`, and image-specific evidence failure codes |
| Video link is unavailable or unsupported | `_shared/videoRecipeEvidence.ts`, `VIDEO_MODEL`, `extract-recipe` video-resolution logs, and video-specific failure codes |
| Audio cannot be read | `_shared/audioRecipeEvidence.ts`, `_shared/audioTranscription.ts`, `AUDIO_TRANSCRIPTION_MODEL`, and audio-specific failure codes |
| Recipe extraction is wrong | `supabase/functions/extract-recipe/index.ts`, URL evidence helpers, and the stored Recipe Graph |
| Wrong cookbook selected | `begin_recipe_capture`, the cookbook `is_default` field, and the explicit destination passed by the entry point |
| Page style does not match the book | Cookbook `page_style_id`, `style_revision`, `page_style_references`, then `_shared/artGeneration.ts` |
| Page generation is stuck | `generation_requests`, `page_versions`, `generate-page-art` logs, OpenRouter availability, then capture `failed_stage = page_generation` |
| Finished page is absent from the reader | Capture `failed_stage = publication`, `status`, page `lifecycle_status`, `selected_version_id`, and `useRecipeCaptures` reconciliation |
| Nosh answers from the wrong recipe | `NoshConversationContext`, interaction focus, `noshChatAdapter.ts`, and collection retrieval tools |

## Compatibility code

The review and generation result routes redirect old links into the active flow. Legacy typesetter components keep old pages readable. Do not use either compatibility area as a template for new work.
