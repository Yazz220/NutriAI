# Current product flow

This document describes the experience implemented in the current branch. Use it to understand the app, trace a recipe, and decide where a change belongs.

## Plan-aware creation

Folio Free and Plus use the same chef, recipe context, capture formats, and reading experience. Free includes two cookbooks and five successful designed-page creations for the account lifetime. Plus removes the cookbook limit and includes 20 successful designed-page creations per UTC calendar month.

The app explains capacity beside creation actions, then checks access without discarding the user's source, draft, proposed recipe change, or book customization. A Free limit opens the Folio Plus sheet. A Plus monthly limit shows the precise refresh date instead of another upsell. Unknown or offline access waits for verification. Server enforcement remains final when another device or concurrent request makes the local snapshot stale.

Failed extraction, provider generation, or publication completion does not consume another unit. Retrying the same capture or publishing an existing ready image reuses its durable state. Reading, sharing, export, chat, cooking help, timers, walkthroughs, and session-only changes remain available regardless of capacity.

## The product in one sentence

A user shares a recipe with Folio, Folio understands it, creates a complete page in the visual style of the chosen cookbook, and keeps the structured recipe available for cooking help.

## Typical user journey

Folio keeps source provenance, confidence, and extraction diagnostics underneath the experience. The recipe added to a cookbook contains only useful cooking content. Minor informal or optional gaps are normalized quietly; only uncertainty that materially changes the recipe interrupts the flow.

```text
Create or choose a cookbook
  -> find a recipe in another app
  -> Share to Folio
  -> Folio saves and extracts the source
  -> Folio resolves the destination cookbook
  -> Folio generates the complete recipe page
  -> the page appears inside the cookbook
  -> the user opens the book and flips to the recipe
  -> Ask Folio uses the structured recipe while the user cooks
```

The same flow starts from the shelf's Save a recipe action, a cookbook's Add page action, or a confirmed recipe handoff inside a Folio conversation.

## Entry points

| Entry | Destination supplied? | What happens next |
|---|---:|---|
| Share to Folio from iOS or Android | Usually no | The app stores the handoff, starts a durable capture, and shows a receipt. |
| Save a recipe from the bookshelf | No | The capture uses the default or sole cookbook when available. |
| Add page from an open cookbook | Yes | The finished page returns to that book and opens at the new recipe. |
| Send a recipe source to Folio | Depends on active context | Folio asks before switching to capture, then hands the source to the same capture workspace. |
| Retry from Save a recipe activity | Preserved | The existing capture resumes. It does not create a second capture or page. |

Supported sources are a URL, pasted text, one image, one existing audio recording, one permissioned MP4, MOV, MPEG, or WebM video up to 20 MB, or a public YouTube, TikTok, Instagram, or Facebook video link when the replaceable social acquisition capability is enabled. Permission-confirmed direct video-file URLs use the same bound; `capture-recipe` validates and downloads the file once, then shares those bytes with Folio-owned transcription and extraction. URL imports accept bounded HTML, XHTML, plain-text, JSON, or JSON-LD responses; unavailable links can retry, while access-restricted, unsupported, or oversized pages explain how to use screenshots or pasted recipe text. Before an image is saved, the client applies its orientation, fits it within the canonical 2400-pixel reading boundary, and encodes it as a JPEG below the extractor's 8 MB limit. The extractor then verifies the file signature and dimensions. The multimodal evidence decision distinguishes a blank or unrelated image from an unreadable, blurry, or visibly cropped recipe. It does not infer completeness from the image proportions. Video selection uses the system media picker and requires the user to confirm ownership or permission before private upload. For supported containers (MP4, MOV, WebM, MPEG), the client also samples up to eight evenly-spaced frames and uploads them as JPEG evidence alongside the video, and `capture-recipe` submits the inspected file to Folio's direct-media speech-to-text adapter. `extract-recipe` then merges the transcript, sampled frames, and whole video into one multimodal extraction call; if that call fails, a degraded retry drops the whole video and relies on the available transcript and frames. Audio uses the system file picker and accepts MP3, M4A, WAV, AAC, AIFF, OGG, or FLAC files up to 6 MB; Folio does not record from the microphone. User notes attached to an image, video, or audio file remain part of its recipe evidence but cannot instruct the extractor. Supported social links enter the same durable capture with no extra confirmation. The optional external provider returns bounded metadata and visual/audible observations only; Folio remains responsible for evidence validation, RecipeGraph extraction, destination, generation, retry, and publication. It does not use the provider's transcript endpoint. Pinterest and unavailable or disabled-provider cases keep the source link and guide the user to open the original and add a video file, screenshots, audio, or recipe text. Multi-file share is not implemented.

## Destination rules

Folio resolves a cookbook in this order:

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
| `processing` | Folio is extracting the recipe or generating its page. | The user may leave. Work continues and the app polls for updates. |
| `needs_destination` | The Recipe Graph exists, but no cookbook can supply a visual identity. | Choose or create a cookbook. |
| `needs_attention` | The source lacks usable recipe evidence, a critical recipe detail needs correction, or a technical stage failed. | Replace an unusable source, correct the flagged details, or retry a technical failure. |
| `ready` | The complete page is published in its cookbook. | Open the recipe or continue browsing. |

There is no general review, approval, or provisional-page state. A focused recipe correction appears only when deterministic checks find an actionable cooking-critical problem.

Retry resumes from the last compatible capture checkpoint. It reuses an in-progress or completed external acquisition job, a saved audio or video transcript after Folio transcription, a saved Recipe Graph after normalization and quality checks, and a ready selected page image after generation. A publication retry adds that existing image to the reader; it does not generate another page. The provider or model may change without changing this flow because checkpoint compatibility follows Folio's versioned stage contracts, not a provider name.

Before a Recipe Graph or cookbook page can be created, extraction returns one provider-neutral evidence decision:

| Outcome | Meaning | Result |
|---|---|---|
| `recipe` | One usable ingredient list and cooking method are supported by the source. | Continue with the canonical Recipe Graph. |
| `not_recipe` | The source is unrelated to recipes or blank/empty. | Stop in `needs_attention`; ask for another source. |
| `insufficient_evidence` | The source may concern a recipe but is unreadable, incomplete, or contains multiple inseparable recipes. | Stop in `needs_attention`; explain what is missing and ask for another source. |

The model supplies the classification and an internal diagnostic. Folio owns the reason codes, user-facing copy, and recovery action. Rejected evidence never reaches page creation, and provider wording is never shown directly to the user.

Accepted evidence then receives a versioned recipe quality assessment. It checks observable facts such as ingredient amount coverage, oven temperature, serving-yield agreement, valid time values, and fields normalized by Folio. The result is `auto_publish`, `publish_with_note`, or `needs_correction`. The first two continue automatically and their diagnostics stay internal. `needs_correction` is reserved for missing or contradictory facts that materially affect cooking; it saves the internal capture graph, stops before page creation, and opens a compact editor. Saving valid corrections resumes the same capture.

## What Folio stores

Each completed recipe page has two related forms:

| Form | Used by | Contains |
|---|---|---|
| Recipe Graph | Folio and collection search | Clean structured title, source yield, optional numeric servings, ingredients, grouped steps, and useful culinary notes. Source provenance and quality assessment stay on the capture. |
| Selected generated page image | Reader | The complete designed page with imagery and all visible recipe text. |

The generated page is not a standalone food illustration. It is the full page the user reads.

For structured website imports, Folio keeps the URL the user submitted and the publisher's canonical URL separately. It records the parser version, fetched time, content hash, language, page title, structured-data identity, candidate count, and selection reason. Ingredient lines remain available as `rawText` after conservative quantity and unit parsing. Schema.org `HowToSection` names become canonical step-group labels. If a source says "1 loaf" or "Makes 24 cookies," the graph preserves that yield without inventing a people-serving count.

When a saved recipe changes, Folio first generates a replacement page from the proposed Recipe Graph. The app switches the canonical graph and selected page version together after generation succeeds. A failed generation leaves the current recipe and page unchanged.

## Cookbook visual identity

Each cookbook persists `cover_finish_id` and `cover_color_id` as independent surface choices. `cover_style` remains a compatibility value derived from the color. `page_style_id` independently owns the internal visual identity of generated recipe pages, together with a revision and optional visual reference images. Page generation reads that identity from the database. It does not use the cover texture or color and does not trust a caller to choose a different style for one recipe.

The page identity controls paper, palette, typography, image medium, graphic language, signature cues, and density-aware composition. New cookbooks choose Studio, Editorial, Illustrated, Heritage, Journal, or Bold. The exact style revision is immutable for that cookbook. Legacy identities remain readable so existing books do not change.

The creation studio presents the same Folio book every user will own. The user names it, chooses Fine cloth or Natural linen, chooses one of six curated colors, and chooses the recipe-page style shared by the book. Texture and color update the same live physical preview independently. A Cover and Inside switcher previews the canonical physical cover or a two-page sample of the selected recipe style. Dimensions, binding, page system, opening behavior, page flipping, shadows, and interactions are owned by Folio and are not presented as configuration choices.

## Reading and cooking

The reader starts with the closed front cover. Opening it reveals the bookplate and recipe pages. The table of contents is not part of the current reader.

From a recipe page, the user can:

- flip to another recipe;
- open Add page;
- ask Folio about the focused recipe;
- scale servings or request a substitution;
- start a timer or walkthrough;
- save a revised page or save a copy;
- visit the original source, share or export the page, move it, or remove it;
- request a visual regeneration and choose whether to use the candidate.
- open the recipe menu to edit extracted details or try another page design. Both actions create a preview while the current page stays selected.
- export the complete cookbook from book settings as a cover plus every finished recipe page in reading order.

Folio keeps stable conversation focus even if the visible reader page changes. Opening Ask Folio from another recipe asks whether to move the current conversation or start a new one.

## The one-pipeline rule

All recipe sources must enter `capture-recipe`. No screen, assistant tool, or compatibility route may extract a recipe and create a page independently.

`generate-page-art` is the only new-page image generator. Its name is retained for deployment compatibility, but its output is a complete recipe page with text. The typesetter is a fallback for legacy pages, not a second production path.

See [ADR 0002](./adr/0002-single-capture-and-complete-page-generation.md) for the decision and [ARCHITECTURE.md](./ARCHITECTURE.md) for implementation details.

## Where to debug

| Problem | Start here |
|---|---|
| Native share does not reach Folio | `components/nosh/capture/NativeShareIngestion.tsx`, `utils/cookbook/nativeShareAdapter.ts`, then the `/share` receipt route |
| Capture is missing or duplicated | `supabase/functions/capture-recipe/index.ts`, `captureLifecycle.ts`, capture idempotency keys, and `recipe_captures` |
| Retry repeats expensive work | Capture `stage_checkpoints`, the saved artifact for the last completed stage, and `_shared/captureStages.ts` |
| Valid source is classified incorrectly | `supabase/functions/_shared/recipeEvidence.ts`, `extract-recipe` evidence diagnostics, and the capture `failure_code` |
| Recipe image is oversized, blurry, or incomplete | `recipeCaptureImage.ts`, `recipeCaptureImageContract.ts`, `imageRecipeEvidence.ts`, and image-specific evidence failure codes |
| Video is unavailable, unsupported, unconfirmed, or too large | `_shared/videoUploadContract.ts`, `_shared/videoRecipeEvidence.ts`, `_shared/audioTranscription.ts` (video audio track), `recipeCaptureVideoFrames.ts`, `VIDEO_MODEL`, `extract-recipe` video-resolution logs, and video-specific failure codes |
| Social-video acquisition fails or restarts | `_shared/recipeEvidenceAcquisition.ts`, `_shared/supadataVideoEvidence.ts`, the capture's `acquisition` checkpoint, `SOCIAL_VIDEO_ACQUISITION_PROVIDER`, and `source_acquisition_failed` |
| Audio cannot be read | `_shared/audioRecipeEvidence.ts`, `_shared/audioTranscription.ts`, `AUDIO_TRANSCRIPTION_MODEL`, and audio-specific failure codes |
| Recipe extraction is wrong | `supabase/functions/extract-recipe/index.ts`, URL evidence helpers, and the stored Recipe Graph |
| Wrong cookbook selected | `begin_recipe_capture`, the cookbook `is_default` field, and the explicit destination passed by the entry point |
| Page style does not match the book | Cookbook `page_style_id`, `style_revision`, `page_style_references`, then `_shared/artGeneration.ts` |
| Page generation is stuck | `generation_requests`, `page_versions`, `generate-page-art` logs, OpenRouter availability, then capture `failed_stage = page_generation` |
| Finished page is absent from the reader | Capture `failed_stage = publication`, `status`, page `lifecycle_status`, `selected_version_id`, and `useRecipeCaptures` reconciliation |
| Folio answers from the wrong recipe | `NoshConversationContext`, interaction focus, `noshChatAdapter.ts`, and collection retrieval tools |

## Compatibility code

The review and generation result routes redirect old links into the active flow. Legacy typesetter components keep old pages readable. Do not use either compatibility area as a template for new work.
