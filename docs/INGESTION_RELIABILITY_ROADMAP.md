# Ingestion reliability roadmap

Nosh will validate one source type at a time through the same `capture-recipe` pipeline. A source type is complete only when its owned fixtures pass locally and against the deployed candidate, its failures give the user a useful recovery action, and the resulting Recipe Graph and cookbook page remain correct after retry.

## Shared release gate

Every source type must satisfy the same baseline:

- every release fixture produces an observation in the versioned ingestion corpus;
- verified recipes retain all critical ingredients, quantities, temperatures, yield, and step order;
- non-recipes and incomplete evidence never create a Recipe Graph or cookbook page;
- provider failures, timeouts, and malformed responses end in a stable failure code or a tested fallback;
- retry resumes from compatible checkpoints without duplicating transcription, extraction, generation, or publication work;
- source evidence stays private, owner-scoped, bounded, and removable;
- the deployed candidate passes the unchanged corpus on two consecutive runs before release.

The corpus and scoring contract live in `supabase/functions/extract-recipe/evals/`. Sanitized production failures enter as diagnostic cases before a fix and become release cases once the fixture is stable.

## Current status

| Gate | Local implementation and tests | Deployed live validation |
|---|---|---|
| Shared foundation | In progress; video fallback, native-share permission, text bounds, and frame cleanup are covered | Pending candidate deployment |
| Pasted text | Local browser corpus passed; fixes and regressions recorded | Deployed candidate exercised; final two consecutive full-corpus runs pending |
| URL | Local browser corpus passed, including structured, unstructured, acquisition failures, destination, and retry | Deployed candidate exercised; final two consecutive full-corpus runs pending |
| Image and screenshot | Owned browser corpus passed, including bounded ordered multi-image intake | `extract-recipe` v26 and `capture-recipe` v15 passed live; device-only and diagnostic fixtures remain |
| Audio | Owned browser corpus passed: clear narration, correction, incomplete, non-recipe, silence, oversized, retry, and publication recovery | Deployed candidate passed with checkpointed transcription; native picker, noisy/accented speech, and non-WAV live fixtures remain |
| Uploaded and direct video | Decomposition implemented locally; owned positive fixtures pending | Pending |
| Social media | Provider-neutral acquisition port, Supadata adapter, async checkpoint resume, failure mapping, and simple composer flow are implemented locally; Pinterest keeps the guided fallback | Credentials and owned live platform fixtures pending |

## Work order

### 0. Shared pipeline foundation

Validate authentication, consent, quota handling, idempotency, destination selection, checkpoint resume, provider diagnostics, payload bounds, and private Storage cleanup. Verify that every source reaches one canonical Recipe Graph and the existing complete-page generator.

Current focus: owned uploaded-video fixtures and live social-provider validation. The social provider remains disabled by default until its credential is configured.

### 1. Pasted text

Important variations:

- clean recipe text, prose recipe, shorthand notes, and copied webpage text;
- missing ingredients, missing method, multiple recipes, and non-recipe text;
- metric, US customary, mixed units, non-serving yields, and multilingual text;
- prompt-injection text embedded in the recipe.

Exit gate: critical facts match the fixture, incomplete inputs fail closed, long text respects the payload bound, and retry does not create duplicate captures or pages.

### 2. Recipe URLs

Important variations:

- JSON-LD, Microdata, plain HTML, and readable plain text;
- several Recipe objects, partial structured data, and conflicting visible content;
- redirects, bot challenges, authentication walls, deleted pages, oversized pages, and unsupported content types;
- tracking parameters, international domains, slow hosts, and hostile embedded instructions.

Exit gate: structured pages normalize deterministically, unstructured pages use bounded evidence, acquisition failures map to the correct recovery action, and no full-page dump reaches the model when focused recipe data is available.

### 3. Images and screenshots

Important variations:

- camera photos, clean screenshots, scans, handwriting, and social-post captures;
- portrait and landscape orientation, HEIC conversion, transparency, low contrast, blur, and shadows;
- cropped ingredients, cropped method, long recipes split across several screenshots, and duplicate or out-of-order screenshots;
- blank files, renamed or corrupt files, extreme dimensions, and oversized inputs.

Exit gate: preflight rejects invalid containers, readable recipes retain critical facts, cropped or unreadable sources fail honestly, and multi-image intake can merge a bounded ordered set without creating another pipeline.

### 4. Existing audio files

Important variations:

- clear narration, kitchen noise, accents, pauses, corrections, and conversational speech;
- ingredient-first, method-first, and interleaved narration;
- supported containers, silent audio, music-only audio, oversized files, and provider failure;
- quantities that sound alike and temperatures or timings stated only once.

Exit gate: the speech-to-text adapter has owned end-to-end fixtures, transcription metadata is checkpointed, retry reuses the transcript, and missing recipe evidence never gets invented downstream.

### 5. Uploaded and direct-file video

Important variations:

- narration-only, on-screen-text-only, split narration and text, and visual demonstration;
- conflicting spoken and visible quantities, fast captions, long title cards, and sparse frames;
- MP4, MOV, MPEG, and WebM; portrait and landscape; silent video; oversized or corrupt files;
- whole-video provider failure, transcription failure, frame sampling failure, and combinations of those failures;
- system picker, native Share to Nosh, and permission-confirmed direct video URLs.

Exit gate: the Gemini whole-video pass and the decomposed transcript/frame path have owned fixtures, each signal can fail independently, metadata records the model and signals actually used, and no successful degraded run claims evidence it did not receive.

### 6. Social-media sources

Important variations:

- YouTube, TikTok, Instagram, and Facebook post links through the replaceable external-acquisition port; Pinterest through the guided fallback;
- narration, visible captions, ingredient overlays, visual actions, conflicting signals, missing metadata, private or deleted posts, and provider-unavailable responses;
- links shared from a browser versus from the platform app;
- a saved video file, screenshots, caption text, or audio shared back to Nosh.

Exit gate: every enabled platform has owned live fixtures for success, insufficient evidence, unavailable posts, provider errors, and async continuation. A retry resumes the same acquisition job, returned observations remain bounded and cannot create a RecipeGraph directly, and Nosh transcription stays on the existing internal adapter. Every unsupported link gives immediate guidance to open the original and share a file, screenshot, audio, or text. Nosh never implies that an unprocessed bookmark became a recipe.

## Final launch pass

After all source gates pass, run the complete matrix on the release build:

1. start each source from Cookbook Add, Save a recipe, native share, and Nosh conversation handoff where applicable;
2. test no destination, explicit destination, default destination, and a deleted destination;
3. interrupt and retry during acquisition, transcription, extraction, generation, and publication;
4. verify the canonical Recipe Graph, generated page, source provenance, capture history, and cleanup behavior;
5. retain the two consecutive live corpus reports as release evidence.

Do not move a source type to complete on unit tests alone. Native picker and share flows require a development or TestFlight build, and provider-backed paths require the deployed candidate.
