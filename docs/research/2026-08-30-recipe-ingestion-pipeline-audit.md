# Recipe ingestion pipeline audit

Date: 2026-08-30

This note compares Nosh's current capture and extraction path with recipe-data standards, first-party documentation from established recipe apps, and current multimodal tooling. It is an audit, not an implementation plan.

## Executive judgment

Nosh has the right architectural center: every source becomes one `RecipeGraph`, and `capture-recipe` owns persistence, destination resolution, extraction, retry, page creation, and publication. That is a better base than separate URL, photo, and video product flows.

The launch promise currently runs ahead of the implementation, though. The active path accepts URL, text, one image, or a URL classified as video. It does not accept audio. A social page URL is passed directly to the multimodal model as if it were a public video file. Image notes are persisted but never reach the extraction prompt. Structured website imports skip the model, but they flatten ingredient lines and instruction sections in ways that weaken scaling and grouped recipes. There is also no field-level evidence or correction gate between extraction and permanent page art.

The strongest architecture is not "one model handles everything." It is one durable workflow with modality-specific acquisition adapters:

```text
captured source
  -> immutable source evidence
  -> URL, text, image, video, or audio adapter
  -> normalized RecipeGraph candidate
  -> deterministic semantic checks and evidence coverage
  -> auto-publish when trustworthy, targeted correction when not
  -> canonical page generation
```

This preserves Nosh's single pipeline while making each input type honest and testable.

## What Nosh has now

The implemented flow is:

```text
UnifiedIntakeComposer or iOS share extension
  -> startRecipeCapture
  -> begin_recipe_capture RPC
  -> durable recipe_captures row
  -> EdgeRuntime.waitUntil(processCapture)
  -> extract-recipe
       URL: guarded fetch -> first Recipe JSON-LD node or page text -> RecipeGraph
       text: Qwen structured extraction
       image: one base64 image -> Qwen structured extraction
       video: remote URL -> Qwen video input -> structured extraction
  -> create_capture_page RPC
  -> generate-page-art
  -> complete_recipe_capture RPC
```

Relevant code:

- `components/cookbook/UnifiedIntakeComposer.tsx`
- `utils/cookbook/nativeShareAdapter.ts`
- `hooks/useRecipeCaptures.ts`
- `supabase/functions/capture-recipe/index.ts`
- `supabase/functions/extract-recipe/index.ts`
- `supabase/functions/_shared/urlRecipeEvidence.ts`
- `supabase/functions/_shared/recipeGraphNormalization.ts`
- `types/recipeGraph.ts`

### Strong foundations

- One durable capture record survives navigation and supports polling, retry, destination selection, and idempotent page creation.
- `capture-recipe` reuses a successful extraction when only page production failed. It does not make users pay the extraction cost twice.
- URL fetching has meaningful defenses: HTTP/S-only URLs, DNS and private-address checks, redirect validation, a 10 second timeout, and a 1 MB response cap. These are sensible controls for an arbitrary URL importer. OWASP still recommends allowlisting when possible and careful validation of every redirect and resolved address because server-side URL fetching is an SSRF boundary. [OWASP SSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- Schema.org `Recipe` data takes priority over generative extraction. That is the right default. `Recipe` defines ingredients, instructions, yield, duration, cuisine, category, nutrition, tools, and dietary suitability. [Schema.org Recipe](https://schema.org/Recipe)
- The model call uses a strict JSON Schema, low temperature, output normalization, and post-response minimum checks for a title, ingredients, and steps.
- The prompt treats fetched content as untrusted and the extractor has no side-effecting tools.
- The `RecipeGraph` is independent of book style and page rendering, so presentation can change without changing source understanding.

## What established recipe apps do

The market is more conservative than the broad "share anything" language suggests.

| Product | Documented intake | Recovery pattern |
| --- | --- | --- |
| Paprika | In-app browser, share extension, bookmarklet, manual entry, and bulk recipe formats | Shows a parse error and lets users assign selected text to recipe fields before saving. [Paprika Android guide](https://www.paprikaapp.com/help/android/), [Windows guide](https://www.paprikaapp.com/help/windows/) |
| Recipe Keeper | Websites, advertised Instagram and TikTok intake, camera or existing images, PDF pages, copy/paste, and other app formats | OCR produces editable text. Its public docs do not establish that Instagram or TikTok intake transcribes native video. [Recipe Keeper help](https://recipekeeperonline.com/help), [privacy policy](https://recipekeeperonline.com/privacy) |
| Samsung Food | URL paste, browser extension, mobile share extension, manual builder, and multi-page photo scanning | Depends on parsable metadata. It documents Schema.org `Recipe` and hRecipe, then offers validation, manual copy/paste, editing, or support review. [Save methods](https://support.samsungfood.com/hc/en-us/articles/18756427379476-How-to-Save-Recipes-to-Your-Samsung-Food-Recipe-Box), [failure help](https://support.samsungfood.com/hc/en-us/articles/18466881067412) |
| Mela | Browser, share extension, RSS inbox, manual entry, file imports, and camera OCR | Shows a structured preview, lets users select OCR blocks, guesses field assignments, and tells users to verify them. Metadata comes first and an ML importer is a fallback. [Mela help](https://mela.recipes/help/), [file format](https://mela.recipes/fileformat/index.html) |
| Crouton | Copied URL, camera or image OCR, photos, and manual entry | Allows a useful incomplete capture such as a title or photo instead of requiring perfect extraction. [Crouton](https://crouton.app/), [privacy policy](https://crouton.app/privacy.html) |
| AnyList | Mobile share action, browser extensions, manual entry, copy/paste, search, and Paprika import | Relies on Schema.org metadata, presents imported content for review on Android, and documents manual copy/paste when parsing fails. [Import overview](https://help.anylist.com/articles/feature-overview-recipe-import/), [supported sites](https://help.anylist.com/articles/recipe-import-sites/) |

Three product lessons recur:

1. Web import is metadata-first. A share extension usually hands off a URL; it does not prove the app can interpret the source app's native video.
2. Scanning is its own flow, often multi-page, with visible OCR correction.
3. A failed parser does not discard the source. The user can correct fields, save a partial recipe, or retry a specific stage.

Nosh is more ambitious because it generates a finished cookbook page automatically. That makes evidence and correction more important, not less. Once inaccurate ingredient text has been baked into page art, a correction costs another generation.

## Standards and web extraction

### Schema.org should remain the primary contract

Google supports Recipe structured data expressed as JSON-LD, Microdata, or RDFa. It recommends `HowToStep` for individual instructions and `HowToSection` for recipes with phases. `recipeYield` may be text rather than an integer. [Google Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe), [Google structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)

Nosh currently reads only JSON-LD and only the first `Recipe` found in a top-level array or `@graph`. It does not traverse common containers such as `mainEntity`. It also strips `HowToSection` labels, converts every ingredient line to `{ name: fullLine }`, and reduces `recipeYield` to the first integer with a default of one. The deterministic URL path then returns immediately, so ingredient quantity and unit parsing never happens. The result can look complete while downstream serving scaling has no usable quantities.

Recommended contract changes:

- Preserve `rawText` for every ingredient and instruction even when parsed fields exist.
- Keep `yieldText`, and make numeric servings unknown when the source says "1 loaf" or "24 cookies" unless a serving count is explicit.
- Preserve `HowToSection` names and ordered steps.
- Retain source category and cuisine separately from Nosh's seven navigation categories.
- Capture canonical URL, author or publisher, source title, fetched time, content hash, parser version, and source language.
- Select among multiple Recipe nodes instead of accepting the first one. Prefer `mainEntity`, the node matching the canonical page, or the most complete valid candidate.

The Python [`recipe-scrapers`](https://github.com/hhursev/recipe-scrapers) project is a useful reference implementation and fixture source. It parses standard HTML, JSON-LD, Microdata, RDFa, and OpenGraph across many sites. It explicitly leaves fetching and network policy to the caller. It is not a direct Supabase Edge dependency because it is Python, but its supported-site fixtures and normalized behavior are valuable for Nosh's test corpus.

### Replace regex stripping with a real document parse

`urlRecipeEvidence.ts` uses regular expressions to find JSON-LD scripts and turn the rest of the page into text. This misses valid markup shapes, decodes only a few entities, and keeps unrelated navigation, consent, and footer copy. It also makes hidden-content rules dependent on exact inline-style spelling.

A small DOM-based extraction layer is cleaner:

1. Parse all structured data without executing scripts.
2. Try JSON-LD Recipe, then Microdata or RDFa and hRecipe.
3. If structured fields are incomplete, extract the likely article body and recipe containers.
4. Give only the compact evidence to the model.
5. Use a rendered-browser fallback only for sites whose recipe data appears after JavaScript.

[`@mozilla/readability`](https://github.com/mozilla/readability) is a maintained JavaScript fallback for article text and metadata. It gives Schema.org JSON-LD precedence and warns callers to sanitize untrusted output. It needs a DOM implementation and is not recipe-specific. [`metascraper`](https://github.com/microlinkhq/metascraper) combines OpenGraph, Microdata, RDFa, Twitter Cards, JSON-LD, HTML, and fallback rules, but it is general metadata tooling rather than a recipe parser. Either dependency needs a Deno compatibility and bundle-size spike before adoption. Neither replaces Nosh's Recipe-specific normalizer.

A hosted browser fallback should be exceptional. It adds latency and a larger attack and failure boundary. Plain HTML plus structured data should remain the fast path.

## Modality audit

### URL

What works:

- Durable source and retry state.
- Deterministic Recipe JSON-LD fast path.
- Basic SSRF, redirect, size, and timeout controls.
- A model fallback for unstructured page text.

What is fragile:

- JSON-LD-only coverage and first-node selection.
- No response `Content-Type` check before treating bytes as text.
- No input URL canonicalization or source content hash.
- No rendered-page fallback for client-rendered recipes.
- Structured ingredients become opaque names, so Nosh cannot reliably scale them.
- A fixed `0.9` confidence is assigned to any JSON-LD recipe with a title, one ingredient, and one step.
- DNS is checked before `fetch`, but the actual connection resolves the hostname again. A hardened fetch proxy that pins the checked IP or enforces network-level private-range denial would close that DNS-rebinding gap.

### Pasted text

This is the cleanest generative path. It still lacks a source-size limit, language metadata, multiple-recipe detection, and retained raw evidence. The schema forces a numeric serving count and defaults missing values to one. Unknown data should remain unknown. A parser should not silently turn absence into a fact.

### Image and screenshot

The current flow accepts one image. It uploads the original to private Storage, downloads it into an Edge Function, base64-encodes it, and sends it to the multimodal model. This is simple and can work well for clean screenshots.

The important gaps are concrete:

- The composer claims image notes are part of extraction. `capture-recipe` forwards them as `input`, but `extract-recipe` ignores `input` in the image branch.
- The share extension accepts images up to 15 MB, while extraction rejects decoded image payloads over 8 MB. Some accepted shares therefore fail later.
- There is no multi-image or PDF intake for a recipe spread across cookbook pages.
- There is no quality check for blur, crop, glare, orientation, or unreadably small text.
- The output has no OCR line coordinates or confidence, so Nosh cannot show where a questionable quantity came from.

The existing `expo-image-manipulator` dependency can normalize orientation, resize oversized images, and compress before upload. Expo documents crop, rotate, resize, and local-file output. [Expo ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/)

For harder scans, a dedicated OCR pass can supply text blocks, coordinates, language, and confidence, then the multimodal model can map that evidence into `RecipeGraph`. Google Document AI, for example, returns raw text, text anchors, bounding polygons, orientation, detected languages, confidence, and optional image-quality defects. [Document AI response model](https://cloud.google.com/document-ai/docs/handle-response) On-device ML Kit is another option, but its iOS text-recognition SDK adds about 38 MB per script family and requires native pods. [ML Kit text recognition on iOS](https://developers.google.com/ml-kit/vision/text-recognition/v2/ios) That tradeoff is hard to justify before Nosh has scan-quality data.

Recommendation: add multi-page assets and preprocessing first. Add a managed OCR pass only if evals show that direct multimodal extraction misses quantities or layout often enough to justify cost and privacy work.

### Video and social links

This is the weakest claimed modality.

`UnifiedIntakeComposer` labels YouTube, TikTok, Instagram, reels, shorts, and direct media extensions as video. `extract-recipe` then sends the unchanged URL as a `video_url` content part. That works only when the selected model endpoint can retrieve and decode that URL. A TikTok or Instagram page is not a public MP4. It may require cookies, JavaScript, region access, or an expiring media URL.

OpenRouter accepts direct video URLs or base64 video data only for video-capable models. Provider behavior differs. Its current documentation says Gemini AI Studio accepts YouTube URLs, Gemini Vertex does not accept video URLs, and other providers must be checked individually. [OpenRouter video inputs](https://openrouter.ai/docs/features/multimodal/videos) The current OpenRouter model catalog lists `qwen/qwen3.6-35b-a3b` with text, image, and video input, but capability alone does not make arbitrary social pages fetchable. [Qwen 3.6 35B A3B on OpenRouter](https://openrouter.ai/qwen/qwen3.6-35b-a3b)

A reliable video adapter needs separate evidence stages:

```text
classify URL
  -> obtain permitted media or provider-supported URL
  -> extract or obtain captions
  -> transcribe audio when captions are absent
  -> sample key frames and OCR on-screen quantities
  -> merge transcript, captions, and visual events by timestamp
  -> extract RecipeGraph
```

[`yt-dlp`](https://github.com/yt-dlp/yt-dlp) supports thousands of sites and subtitle extraction, but its own documentation warns that stable builds become stale as sites change. It requires a Python or binary runtime and often FFmpeg, so it does not belong inside a Supabase Edge Function. If Nosh chooses broad social ingestion, put media acquisition in a replaceable container worker with domain-specific tests, rate limits, and a legal and platform-policy review. For launch, a narrower honest contract such as YouTube plus direct uploaded video is safer than claiming every social URL.

### Audio

Audio exists only in the `RecipeSourceType` TypeScript union. The composer, share adapter, capture API, database entry path, and extractor reject it. Nosh does not currently ingest audio.

OpenRouter audio input uses a base64 `input_audio` part and an audio-capable model. Direct audio URLs are not supported. [OpenRouter audio inputs](https://openrouter.ai/docs/features/multimodal/audio) The active Qwen model is not listed with audio input, so audio needs either a separate speech-to-text stage or a different multimodal model.

A managed transcription call fits the current Deno architecture better than self-hosted Whisper. Supabase publishes an Edge Function example that uploads audio or video to ElevenLabs Scribe and runs transcription in `EdgeRuntime.waitUntil`. [Supabase speech transcription example](https://supabase.com/docs/guides/functions/examples/elevenlabs-transcribe-speech) OpenAI's open-source Whisper requires Python, PyTorch, FFmpeg, and roughly 1 GB to 10 GB of VRAM depending on model size. [Whisper repository](https://github.com/openai/whisper) That is not a Supabase Edge workload.

The audio path should preserve the transcript, detected language, timestamps when available, and transcription provider version. It can then call the same text-to-RecipeGraph normalizer. A voice recording is evidence, not a separate recipe model.

## Confidence, provenance, and validation

The current `provenance` object records source type, URL, attribution, inferred field names, extraction notes, and one model-produced confidence number. This is a good start, but the confidence number is not a reliable quality gate. Strict structured output guarantees shape, not truth. Google's structured-output documentation explicitly says applications must validate values and handle schema-compliant but semantically incorrect output. [Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)

OpenRouter also says structured-output support varies by endpoint and recommends `provider.require_parameters: true`. The current extraction request does not set it. [OpenRouter structured outputs](https://openrouter.ai/docs/features/structured-outputs)

Replace the single self-assessed score as the decision source with measured signals:

- Parser path and version, model and endpoint, prompt or schema revision.
- Source asset hash, canonical URL, fetched time, language, and retained raw evidence.
- Field-level evidence references. For OCR these can be page and bounding box. For transcripts they can be timestamp spans. For HTML they can be JSON pointer or text span.
- Field status such as observed, normalized, inferred, conflicted, or missing.
- Deterministic completeness and consistency checks. Examples include nonempty ingredient and instruction sets, yield semantics, temperature format, unit plausibility, ingredients referenced in steps, and duplicate or contradictory quantities.
- OCR or transcription confidence when the provider supplies it.
- A final routing decision such as auto-publish, publish-with-note, or needs-correction.

Do not infer safety-relevant missing values merely to satisfy a required schema. Unknown oven temperatures, cook times, and serving yields should remain unknown. If Nosh estimates one, the field must stay visibly inferred until the user accepts it.

The user experience does not need a blocking review for every recipe. High-evidence imports can continue directly into the book. Only low-coverage, conflicting, or inferred critical fields need a compact correction step. This keeps Nosh more direct than Paprika or AnyList without pretending uncertainty is success.

## Job reliability

`EdgeRuntime.waitUntil` is appropriate for short background I/O, and Nosh uses it correctly to return a capture immediately. Supabase states that background tasks still stop at the function's wall-clock, CPU, and memory limits. [Supabase background tasks](https://supabase.com/docs/guides/functions/background-tasks), [Edge Function limits](https://supabase.com/docs/guides/functions/limits)

Image OCR, media acquisition, transcription, video understanding, graph extraction, and page generation should therefore be resumable stages, not one long in-memory task. Each stage should write its result and version before scheduling the next. The existing durable capture row and claim RPC are a good place to extend rather than replace.

The current failure code collapses most problems into `processing_failed`. Before launch, distinguish at least:

- source_unreachable
- source_unsupported
- source_too_large
- no_recipe_found
- transcription_failed
- extraction_invalid
- needs_correction
- page_generation_failed

Retries should resume from the latest valid stage. Re-extraction should be explicit when the extractor version changes or when the user edits the source. A page-generation retry should continue reusing the saved graph.

## Library and service fit

| Candidate | Best use in Nosh | Judgment |
| --- | --- | --- |
| Schema.org Recipe plus Google guidance | Canonical web evidence contract and fixtures | Adopt more completely. Add Microdata, RDFa, hRecipe, multiple-node selection, and section preservation. |
| `recipe-scrapers` | Reference behavior, supported-site corpus, or a separate Python fallback service | Valuable benchmark. Do not force it into Supabase Edge. |
| `@mozilla/readability` plus a lightweight DOM parser | Compact visible-body fallback after structured extraction | Worth a Deno bundle spike. Keep sanitization and SSRF outside it. |
| `metascraper` | Publisher, image, author, and general metadata fallbacks | Optional. It does not parse recipe semantics. Test Deno compatibility before choosing it. |
| `expo-image-manipulator` | Client-side orientation, resizing, and compression | Already installed. Reuse before adding OCR SDK weight. |
| Managed Document OCR | Hard scans, multi-page layout, bounding boxes, and confidence | Add only after direct-vision evals justify it. Define retention and privacy first. |
| OpenRouter structured multimodal output | RecipeGraph extraction from compact text, images, or acquired video evidence | Keep, but pin or validate endpoint capabilities and set `require_parameters: true`. |
| Managed speech-to-text | Audio and video transcript stage | Best fit for Supabase Edge. Store transcript evidence and version. |
| `yt-dlp` plus FFmpeg | Broad social media acquisition | Separate replaceable worker only. It is operationally incompatible with the Edge runtime and changes as sites change. |

## Before-launch priorities

1. Correct the product contract. Do not advertise audio until it exists. Describe social video import as beta or supported-source-specific until acquisition tests prove otherwise.
2. Make URL imports semantically safe. Parse all structured formats with a DOM, preserve raw ingredient lines and section labels, keep unknown yield unknown, and stop assigning a blanket 0.9 confidence.
3. Add a quality gate before art generation. Auto-publish strong evidence. Route missing or conflicted quantities, yields, temperatures, and instructions to a small correction surface.
4. Fix the image contract. Pass notes through, align size limits, preprocess with the existing image manipulator, and support ordered multi-image capture before adding a second OCR vendor.
5. Replace direct social-page-to-model handling with a real video adapter. Begin with YouTube and uploaded video, then add platforms only with fixtures and monitoring.
6. Add audio as upload or recording, transcription, then the existing text extraction path. Do not make the current extraction model responsible for audio it cannot accept.
7. Version every stage and expand failure codes so a retry resumes from valid work.
8. Establish ingestion evals before changing models or prompts.

## Required eval set

OpenAI's evaluation guidance recommends task-specific datasets, stage-level tests for workflows, production-derived failures, automated scoring where possible, and human calibration. [Evaluation best practices](https://platform.openai.com/docs/guides/evaluation-best-practices)

For Nosh, build a versioned corpus with human-verified RecipeGraphs:

- URL fixtures for JSON-LD, `@graph`, multiple Recipe nodes, Microdata, RDFa, hRecipe, JavaScript-rendered pages, redirects, blocked hosts, malformed markup, and no-recipe pages.
- Text fixtures across supported languages, grouped recipes, vague quantities, ranges, substitutions, and multiple recipes in one paste.
- Images covering clean screenshots, handwriting, glare, rotation, low resolution, multi-page recipes, dense magazine layouts, and mixed scripts.
- Videos with captions only, narration only, on-screen quantities only, conflicting narration and captions, direct files, YouTube, and unsupported social pages.
- Audio with accents, background noise, corrections, unit ambiguity, and missing steps.

Score fields independently. Title accuracy is less important than ingredient quantity, unit, preparation note, step order, time, yield, and temperature. Track exact source coverage, unsupported-source rate, correction rate, page regeneration caused by extraction errors, latency, and cost by source type and domain. Any production correction should become a regression fixture.

## Bottom line

Keep `capture-recipe` and `RecipeGraph` as the one canonical path. They are the right product architecture. Stop treating input formats as equivalent model payloads. Give each source type a small evidence-producing adapter, then converge on the same validation and page pipeline.

With that change, Nosh can credibly be more automatic than current recipe managers. Without it, URL import will be uneven, image failures will be hard to explain, arbitrary social links will fail unpredictably, and audio will remain a promise represented only by a TypeScript enum.
