# Database

## Subscription foundation

Migration `20260831011239_subscription_foundation.sql` adds the launch Free/Plus access model:

| Object | Role |
|---|---|
| `subscription_plans` | Stable `free` and `plus` plan identities |
| `subscription_plan_features` | Server-authoritative feature flags, allowances, and reset policy |
| `subscription_products` | Store product to plan and RevenueCat entitlement mapping |
| `user_entitlements` | Newest normalized provider state for a user |
| `subscription_webhook_events` | Idempotent webhook claim, retry, and completion log |
| `usage_periods` | Deletion-stable lifetime Free and UTC-calendar-month Plus aggregate counters |
| `usage_reservations` | Exactly-once reserved, settled, or released page-generation unit |

Authenticated clients call `get_subscription_access()` and `create_cookbook_for_current_user(...)`. Provider synchronization and usage writes are service-only. `reserve_designed_page_generation`, `settle_designed_page_generation`, and `release_designed_page_generation` bind capacity to `generation_requests`; a request can never settle twice. Direct authenticated cookbook inserts are revoked.

Free accounts need no entitlement row. `effective_subscription_plan_id` falls back to Free. An active, grace, billing-retry, or canceled-but-paid-through `nosh_plus` entitlement resolves to Plus until its period end. Existing pre-migration content is not counted retroactively and remains readable after downgrade. Every successful post-migration designed page advances the capped Free lifetime counter even when Plus supplied the active monthly allowance; deleting its page, cookbook, request, or settled reservation detail does not restore that use. When Plus ends with a generation still reserved, Free access includes that active cross-period reservation until it settles or releases.

See [MONETIZATION.md](./MONETIZATION.md) before changing these tables or RPCs.

The Supabase project uses a private `nutriai` schema. Every table is RLS-enabled and scoped by `auth.uid() = user_id`.

## Tables (current state)

### `nutriai.profiles`
One row per signed-in user. Stores display name, units (`metric` / `imperial`), free-form `goals` and `preferences` JSONB.

### `nutriai.cookbooks`
A user's books. After the 2026-05-05 migration there can be **many cookbooks per user**.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users` | RLS scope |
| `title` | text | User-provided ("Desserts", "Italian", "Family") |
| `theme_name`, `theme_prompt` | text | Legacy theme fields, kept for backward compat |
| `section_order` | jsonb | Default order of the seven canonical sections |
| `cover_style` | text CHECK ∈ {`vintage-garden`, `handwritten`, `editorial`, `watercolor`, `rustic`, `minimal`, `sage-linen`, `terracotta-cloth`, `navy-leather`, `charcoal-cloth`, `alabaster-linen`, `umber-leather`} | Legacy compatibility preset derived from `cover_color_id` by new clients |
| `cover_finish_id` | text CHECK ∈ {`fine-cloth`, `natural-linen`} | Surface weave and grain on the canonical cover construction |
| `cover_color_id` | text CHECK ∈ {`sage`, `clay`, `midnight`, `alabaster`, `charcoal`, `umber`} | Curated cover color, independent from finish and recipe-page style |
| `page_style_id` | text, composite FK with `style_revision` → `recipe_page_style_versions` | Database-owned visual language for complete-page generation; independent from the cover |
| `style_revision` | integer, composite FK with `page_style_id` → `recipe_page_style_versions` | Immutable version of the book-owned page-style contract |
| `page_style_references` | jsonb string array | Optional immutable visual anchors for page consistency |
| `is_default` | boolean | At most one per user; automatic destination for new captures |
| `page_template_id` | text CHECK ∈ {`clean-cream`, `ink-sketch`, `modern-editorial`} default `clean-cream` | Legacy vector-layout default. It is not an input to complete-page image generation. |
| `sections` | jsonb array of `{id, label, order}` | Per-book section overrides (auto-derived if empty) |
| `created_at`, `updated_at` | timestamptz | |

Indexes:
- `cookbooks_user_updated_idx` on `(user_id, updated_at DESC)` for shelf listing.
- The legacy `cookbooks_one_per_user_idx` UNIQUE constraint is **dropped** (multi-book support).

### `nutriai.recipe_page_style_versions`
Private catalog of valid immutable page-style identities. `(style_id, revision)` is the primary key and at most one revision of an identity can have `status = 'active'`. Existing revision-1 identities remain `legacy`; new Studio choices resolve to Studio 1, Editorial 2, Illustrated 2, Heritage 2, Journal 1, or Bold 1. Prompt and art-direction definitions live in `constants/recipePageStyles.ts`; the database catalog protects persisted identity integrity without exposing prompt internals to clients.

### `nutriai.recipes`
Structured recipe data extracted from a source. One recipe per imported page.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid → `auth.users` | |
| `title`, `description` | text | |
| `servings`, `prep_time`, `cook_time` | integer | |
| `ingredients` | jsonb | `[{name, quantity, unit, isOptional?}]` |
| `steps` | jsonb | `string[]` |
| `source_type` | text CHECK ∈ {`url`, `text`, `image`, `video`, `audio`} | |
| `source_url` | text | |
| `tags` | jsonb | `string[]` |
| `category` | text | Section bucket (breakfast / dinner / desserts / more) |
| `confidence` | numeric | 0–1, from the parser |

### `nutriai.cookbook_pages`
A page = one recipe rendered into one book.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `cookbook_id` | uuid → `cookbooks` | |
| `recipe_id` | uuid → `recipes` | A trigger enforces that the recipe owner matches the cookbook owner. |
| `page_number` | integer | Unique within a cookbook |
| `section` | text | Bucket key |
| `sort_order` | integer | Manual ordering inside a section |
| `selected_version_id` | uuid → `page_versions` | Which generated version is "the" page |
| `recipe_graph` | jsonb | Canonical machine-readable recipe used by Folio |
| `style_id`, `style_revision` | text, integer, composite FK → `recipe_page_style_versions` | Visual identity snapshot used for this page |
| `template_id` | text | Legacy vector-layout metadata. Complete-page image generation does not read it. |
| `search_vector` | tsvector generated | Weighted lexical document derived from the canonical graph |
| `lifecycle_status` | text | `processing` until its complete image is ready, then `approved`. The database value `approved` now means published and does not imply a user approval step. |
| `capture_id` | uuid → `recipe_captures` | Unique when present, preventing duplicate capture pages |

Search indexes:

- `cookbook_pages_recipe_search_idx`: GIN index for weighted full-text search.
- `cookbook_pages_recipe_title_trgm_idx`: GIN trigram index for small title transcription differences.

`nutriai.search_recipe_collection` is a `SECURITY INVOKER` RPC available only to `authenticated`. It joins the owning cookbook at query time, explicitly scopes rows to `auth.uid()`, preserves page RLS, caps results at five, and returns summaries rather than full graphs. The client loads the selected page graph separately through ordinary RLS-protected selection.

### `nutriai.recipe_captures`

Extraction provenance, confidence, inferred fields, and quality assessments remain internal to the durable capture. A cookbook page receives a clean cooking-data projection; those diagnostics do not become recipe notes, descriptions, instructions, or generated-page copy.

Durable recipe intake records. Each row owns the safe source reference, optional destination, extraction result, complete-page generation state, failure details, processing attempt, and one user-scoped idempotency key. `stage_checkpoints` is a JSON object keyed by `source`, `acquisition`, `transcription`, `extraction`, `normalization`, `quality`, `page_generation`, and `publication`; completed entries record a contract version, completion time, and bounded stage metadata. External acquisition is the one exception: an asynchronous provider job may record a `pending` acquisition checkpoint with `updatedAt`, job identity, and polling state before it later becomes `ready` or `failed`. This lets retry or a self-invoked continuation resume the same provider job instead of starting another one. Image extraction metadata records the detected format, byte size, dimensions, and dimension hint so later diagnosis can separate container failures from model evidence decisions. `failed_stage` records where work stopped. Images, permissioned videos, and audio recordings live in the private `recipe-captures` Storage bucket; the table stores only their user-prefixed paths. The bucket is capped at 20 MB and uses a MIME allowlist for the supported source formats. After successful speech-to-text, an audio or supported video capture's `source_payload` retains the bounded transcript and transcription model/adapter metadata so extraction retries reuse the same evidence. Uploaded videos also keep bounded `framePaths` for supplementary JPEG evidence. Removing a recipe page and its capture enqueues the main source and those frames for private Storage cleanup. Different capture rows can be claimed and processed independently. The claim lease blocks only duplicate work for the same capture.

`failure_code` is also the durable recovery contract. Recipe-evidence failures use `not_a_recipe`, `blank_or_empty_source`, `unreadable_source`, `blurry_or_low_resolution_image`, `cropped_recipe_image`, `url_unavailable`, `url_access_restricted`, `url_source_unsupported`, `url_too_large`, `video_source_unsupported`, `video_permission_required`, `video_unavailable`, `video_too_large`, `audio_source_unsupported`, `audio_too_large`, `audio_no_speech`, `audio_transcription_failed`, `missing_ingredients`, `missing_instructions`, or `multiple_recipes`. These codes stop before Recipe Graph or page creation. Most replace the saved source; `url_unavailable`, `video_unavailable`, and `audio_transcription_failed` may retry the same durable source. `needs_recipe_correction` means a Recipe Graph was saved but deterministic semantic checks stopped the capture before page creation; the app edits that graph and resumes the same row. Retryable technical codes are `source_read_failed`, `source_acquisition_failed`, `extraction_failed`, `quality_assessment_failed`, `destination_unavailable`, `page_generation_failed`, and `publication_failed`. `source_acquisition_failed` preserves the social link and pending provider state when one exists, so retry can continue the same capture. `publication_failed` keeps `art_status = ready` because the selected page image already exists. `failure_message` stores deterministic Folio copy, never raw model prose; raw provider or database diagnostics remain in server logs. Stored video sources keep `mimeType`, `fileName`, `byteSize`, `rightsConfirmed`, and optional notes in `source_payload`; the private media path remains in `source_storage_path`.

The Recipe Graph may omit numeric `servings`. `yieldText` preserves source values such as "1 loaf" or "Makes 24 cookies" without assigning them people-serving semantics. The capture's internal extraction graph retains raw ingredient lines, versioned source provenance, the latest quality assessment, the first blocking assessment after correction, issue paths, and measured coverage. The cookbook page stores the clean cooking-data projection instead. The compatibility `recipes.servings` column remains nullable. Page revision accepts a missing serving count and writes null to that compatibility column.

The database transition trigger permits `processing -> needs_destination | ready | needs_attention`, plus `needs_destination -> processing` and `needs_attention -> processing`. Repeating the current state is idempotent. Client roles can read only their own rows. Authenticated creation and destination choice use guarded RPCs; extraction, page creation, failure, and finalization RPCs are restricted to `service_role`. The client treats a 10-minute-old `processing_started_at` as an abandoned lease. If the worker stopped before claiming the row, it falls back to `updated_at`. Each new `processing_attempt` gets one automatic reclaim, so a second worker failure can recover without another cold launch.

### `nutriai.page_versions`
Each cookbook page image generation pass produces a version. Used to keep history and let the user compare regenerations.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `page_id` | uuid → `cookbook_pages` | |
| `image_url`, `storage_path` | text | Where the rendered cookbook page lives in Supabase Storage |
| `prompt_payload` | jsonb | The exact complete-page prompt contract, style revision, and references used |
| `model` | text | For example, `qwen/qwen-image-3-pro` |
| `status` | text CHECK ∈ {`pending`, `generating`, `ready`, `failed`} | |
| `credit_cost` | integer | Historical internal-credit metadata; new generations use 0 |
| `error_message` | text | |

### `nutriai.credit_ledger`
Historical append-only generation credit ledger. Existing spend and refund rows remain available for audit, but the active generation pipeline neither checks the balance nor creates new spend rows. The legacy reservation RPC remains for compatibility only. See [ADR 0003](./adr/0003-suspend-internal-generation-credits.md).

### `nutriai.generation_requests`
Server-owned idempotency records for cookbook page generation. A row stores the user-scoped request key, original payload, processing state, created recipe/page/version references, storage path, and cached successful response.

The Edge Function claims a request, returns a processing response, and completes image generation as a background task. The client polls with the same idempotency key until it receives the cached page or terminal failure. Repeated calls do not start another generation. Requests that remain processing for more than ten minutes are expired on the next lookup. Historical requests with a spend row are also refunded.

`supabase/tests/generation_idempotency.sql` is a rollback-only live proof that duplicate claims spend once and duplicate failures refund once.

`supabase/tests/recipe_collection_search.sql` is a rollback-only proof for ranking, voice-spaced titles, cookbook/ingredient/tag/recency hints, direct RLS selection, and RPC ownership isolation.

The Phase 9 hardening migration adds covering indexes for cookbook and generation foreign keys, locks the legacy timestamp trigger function to an empty search path, and removes zero-row tables from the retired nutrition-tracker product without `CASCADE`. `generation_requests` intentionally has RLS with no authenticated policy because it is an Edge-Function-owned idempotency ledger.

### `nutriai.collection_mutation_requests`

Private idempotency records for confirmed recipe moves and copies. Authenticated clients have no direct table grant. They call `nutriai.organize_recipe_page`, a narrowly scoped `SECURITY DEFINER` RPC with an empty search path, explicit caller and cookbook ownership checks, deterministic cookbook lock ordering, and one response per user-scoped request key. Move preserves the existing page. Copy creates an independent legacy recipe row and cookbook page, including the selected page version when present. `supabase/tests/collection_organization_actions.sql` proves retries do not duplicate work and another user's cookbook cannot be used as a destination.

### `nutriai.storage_cleanup_jobs`

Private outbox rows for Storage objects that became unreferenced during recipe or cookbook deletion. Each row contains an owner-scoped path in `cookbook-pages` or `recipe-captures`. Authenticated clients cannot read or write this table. `delete-reader-content` removes queued objects through the Storage API with the service role, deletes successful jobs, and leaves failed jobs for the next shelf session. The deletion RPCs queue a generated page only when no surviving `page_versions` row references its path, which preserves copied pages that share one image.

`supabase/tests/reader_storage_cleanup.sql` proves the outbox, shared-page reference check, capture cleanup, orphan-recipe cleanup, ownership checks, and direct-delete privilege revocations in a rollback-only transaction.

### `nutriai.ai_response_reports`

Private safety and quality reports submitted from completed Folio responses. Each row stores the authenticated owner, device-local assistant message identifier, reported response text, review status, and creation time. Mobile roles have no table privileges. The authenticated `report-ai-response` Edge Function derives the owner from the verified JWT and inserts with the service role. Account deletion removes reports through the `auth.users` foreign-key cascade.

`supabase/tests/ai_response_reports.sql` proves that anonymous and authenticated clients cannot access the table while the service role can manage the review queue.

## Removed tables (legacy cleanup, 2026-05-05)

These belonged to older product directions and have no live code references in the current book-first branch:

- `nutriai.meal_plans`
- `nutriai.ingredient_icons`
- `public.food_logs`
- `public.food_synonyms`
- `public.food_usda_mapping`

## Migrations

Run the SQL and migration files in timestamp order. Do not skip historical migrations: later migrations transform their schema and state into the current model.

| File | Adds |
|---|---|
| `supabase/sql/00_bootstrap.sql` | `profiles`, helper functions, RLS, base triggers |
| `supabase/sql/20260503_ai_cookbook_reset.sql` | `cookbooks`, `recipes`, `cookbook_pages`, `page_versions`, `credit_ledger` + `reserve_generation_credit` |
| `supabase/sql/20260505_multi_cookbook.sql` | Drops one-cookbook-per-user index, adds `cover_style` + `sections`, drops legacy tables |
| `supabase/migrations/20260803132008_generation_request_idempotency.sql` | Generation request claims, request-scoped spend/refund uniqueness, completion caching, and stale-request recovery |
| `supabase/migrations/20260819120000_luxury_cover_styles.sql` | Expands persisted cookbook cover styles |
| `supabase/migrations/20260820120000_cookbook_page_template.sql` | Adds the legacy `page_template_id` vector-layout default |
| `supabase/migrations/20260820130000_cookbook_pages_new_pipeline.sql` | Adds canonical RecipeGraph, page style snapshots, lifecycle state, and page-version linkage |
| `supabase/migrations/20260820221231_recipe_collection_search.sql` | Adds canonical RecipeGraph full-text search, voice-tolerant title matching, and the authenticated collection-search RPC |
| `supabase/migrations/20260820231208_recipe_capture_lifecycle.sql` | Historical migration that introduced durable captures and the former provisional-page lifecycle |
| `supabase/migrations/20260820233845_recipe_capture_approval.sql` | Historical capture approval-state migration; superseded by the simplified lifecycle |
| `supabase/migrations/20260821003837_art_candidate_selection.sql` | Adds safe page-version candidate selection for explicit regeneration |
| `supabase/migrations/20260825183653_apply_recipe_page_revision.sql` | Atomically applies corrected recipe data and its approved page candidate |
| `supabase/migrations/20260825172026_collection_organization_actions.sql` | Adds private idempotency records and the ownership-checked move/copy RPC |
| `supabase/migrations/20260825172052_reader_recipe_management.sql` | Keeps moved captures aligned with their cookbook and permanently removes owned recipe pages without leaving broken capture or recipe rows |
| `supabase/migrations/20260825180017_reader_storage_cleanup.sql` | Routes recipe and cookbook deletion through ownership-checked RPCs and queues unreferenced Storage objects for retryable removal |
| `supabase/migrations/20260825180656_queue_existing_reader_storage_orphans.sql` | Queues owner-prefixed page and capture objects older than 24 hours that have no live database or generation-request reference |
| `supabase/migrations/20260821171438_phase9_security_performance_hardening.sql` | Hardens RLS helpers and adds query-supporting indexes |
| `supabase/migrations/20260822002000_cookbook_page_selected_version_index.sql` | Adds selected-version lookup support |
| `supabase/migrations/20260822153000_simplify_recipe_page_pipeline.sql` | Collapses capture/review into processing, optional destination choice, retry, and ready; adds default books and versioned page-style anchors |
| `supabase/migrations/20260823020628_suspend_internal_generation_credits.sql` | Suspends the legacy internal credit gate while preserving ledger history and compatibility RPCs |
| `supabase/migrations/20260823041346_add_cookbook_page_styles.sql` | Separates physical `cover_style` from book-owned `page_style_id` and preserves existing books' page identities |
| `supabase/migrations/20260829183126_separate_cover_finish_and_color.sql` | Separates the canonical cover's surface finish from its curated color while preserving `cover_style` compatibility |
| `supabase/migrations/20260829183847_sync_legacy_cover_style_and_color.sql` | Keeps legacy `cover_style` writes synchronized with `cover_color_id` across app versions |
| `supabase/migrations/20260830051728_allow_unknown_recipe_servings.sql` | Lets canonical recipes and atomic page revisions preserve non-serving yields without inventing a numeric serving count |
| `supabase/migrations/20260830162003_add_audio_recipe_captures.sql` | Adds private existing-audio capture, bounded transcription evidence, and audio source constraints |
| `supabase/migrations/20260830174134_version_recipe_capture_stages.sql` | Adds versioned capture checkpoints, stage-specific failures, and publication-only retry for already-generated pages |
| `supabase/migrations/20260830210000_add_permissioned_video_captures.sql` | Expands private capture Storage and row constraints for permissioned video files while preserving URL-only video bookmarks |
| `supabase/migrations/20260831194027_cleanup_video_frame_storage.sql` | Extends recipe-page removal so the main capture object and sampled video frames enter the same retryable Storage cleanup queue |
| `supabase/migrations/20260901045939_add_recipe_evidence_acquisition_checkpoint.sql` | Adds the pending/ready/failed external-acquisition checkpoint and acquisition-stage failure support without changing the capture state machine |
| `supabase/migrations/20260830231805_version_recipe_page_styles.sql` | Replaces duplicated style-id checks with an immutable style/version catalog and activates the six-style creation family |
| `supabase/migrations/20260830234436_harden_recipe_page_style_catalog.sql` | Adds covering indexes for style-version foreign keys and an explicit service-role read policy |
| `supabase/migrations/20260825214540_make_cookbook_pages_private.sql` | Makes generated recipe artwork private, removes durable public URLs, and grants authenticated reads only to owner-prefixed object paths |

## RLS posture

Most user-editable product tables follow the same ownership pattern:

```sql
CREATE POLICY <table>_select ON nutriai.<table> FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY <table>_insert ON nutriai.<table> FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY <table>_update ON nutriai.<table> FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY <table>_delete ON nutriai.<table> FOR DELETE USING (auth.uid() = user_id);
```

`cookbook_pages` has an additional `BEFORE INSERT/UPDATE` trigger that errors if the cookbook owner and recipe owner don't match, so you can't smuggle another user's recipe onto your page.

Authenticated clients cannot directly delete `cookbooks` or `cookbook_pages`, and they cannot insert, update, or delete `page_versions`. Reader deletion uses the guarded RPCs so database deletion and Storage cleanup jobs commit together. `storage_cleanup_jobs` has RLS enabled with no authenticated policy or grant; only the service role used by `delete-reader-content` can drain it.

`generation_requests` is RLS-enabled without client policies. The authenticated `generate-page-art` Edge Function accesses it through the service role. Its SECURITY DEFINER functions set an empty search path, use fully qualified relations, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution only to `service_role`.

The `cookbook-pages` Storage bucket is private. Its SELECT policy requires the first object-path segment to equal `auth.uid()`. The client can sign a path only after it reads the owning `page_versions` row through its existing page RLS policy.

## Cache keys

The mobile app caches Supabase reads in AsyncStorage so the shelf and the reader hydrate instantly on cold launch:

- `nosh:cookbook-shelf:v2:<userId>` - full `Cookbook[]` for the shelf.
- `nosh:cookbook-pages:v2:<cookbookId>` - that book's `CookbookPage[]`.
- `nosh:recipe-captures:v1:<userId>` - durable capture states used for cold-start restoration and offline display.

See [utils/cookbook/cache.ts](../utils/cookbook/cache.ts).
