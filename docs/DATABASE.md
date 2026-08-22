# Database

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
| `cover_style` | text CHECK ∈ {`vintage-garden`, `handwritten`, `editorial`, `watercolor`, `rustic`, `minimal`, `sage-linen`, `terracotta-cloth`, `navy-leather`, `charcoal-cloth`, `alabaster-linen`, `umber-leather`} | Drives the cover and complete-page generation prompt |
| `style_revision` | integer | Version of the book-wide visual identity contract |
| `page_style_references` | jsonb string array | Optional immutable visual anchors for page consistency |
| `is_default` | boolean | At most one per user; automatic destination for new captures |
| `page_template_id` | text CHECK ∈ {`clean-cream`, `ink-sketch`, `modern-editorial`} default `clean-cream` | Legacy vector-layout default. It is not an input to complete-page image generation. |
| `sections` | jsonb array of `{id, label, order}` | Per-book section overrides (auto-derived if empty) |
| `created_at`, `updated_at` | timestamptz | |

Indexes:
- `cookbooks_user_updated_idx` on `(user_id, updated_at DESC)` for shelf listing.
- The legacy `cookbooks_one_per_user_idx` UNIQUE constraint is **dropped** (multi-book support).

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
| `source_type` | text CHECK ∈ {`url`, `text`, `image`, `video`} | |
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
| `recipe_graph` | jsonb | Canonical machine-readable recipe used by Nosh |
| `style_id`, `style_revision` | text, integer | Visual identity snapshot used for this page |
| `template_id` | text | Legacy vector-layout metadata. Complete-page image generation does not read it. |
| `search_vector` | tsvector generated | Weighted lexical document derived from the canonical graph |
| `lifecycle_status` | text | `processing` until its complete image is ready, then `approved`. The database value `approved` now means published and does not imply a user approval step. |
| `capture_id` | uuid → `recipe_captures` | Unique when present, preventing duplicate capture pages |

Search indexes:

- `cookbook_pages_recipe_search_idx`: GIN index for weighted full-text search.
- `cookbook_pages_recipe_title_trgm_idx`: GIN trigram index for small title transcription differences.

`nutriai.search_recipe_collection` is a `SECURITY INVOKER` RPC available only to `authenticated`. It joins the owning cookbook at query time, explicitly scopes rows to `auth.uid()`, preserves page RLS, caps results at five, and returns summaries rather than full graphs. The client loads the selected page graph separately through ordinary RLS-protected selection.

### `nutriai.recipe_captures`

Durable recipe intake records. Each row owns the safe source reference, optional destination, extraction result, complete-page generation state, failure details, processing attempt, and one user-scoped idempotency key. Images live in the private `recipe-captures` Storage bucket; the table stores only their user-prefixed paths.

The database transition trigger permits `processing -> needs_destination | ready | needs_attention`, plus `needs_destination -> processing` and `needs_attention -> processing`. Repeating the current state is idempotent. Client roles can read only their own rows. Authenticated creation and destination choice use guarded RPCs; extraction, page creation, failure, and finalization RPCs are restricted to `service_role`.

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
| `credit_cost` | integer | Almost always 1 |
| `error_message` | text | |

### `nutriai.credit_ledger`
Append-only generation credit ledger. Sum of `amount` per `user_id` is the current balance. Generation spend and refund rows reference a generation request and are protected by partial unique indexes, so one request can spend and refund at most once.

### `nutriai.generation_requests`
Server-owned idempotency records for cookbook page generation. A row stores the user-scoped request key, original payload, processing state, created recipe/page/version references, storage path, and cached successful response.

The Edge Function claims a request, returns a processing response, and completes image generation as a background task. The client polls with the same idempotency key until it receives the cached page or terminal failure. Repeated calls do not start another generation. Requests that remain processing for more than ten minutes are expired and refunded on the next lookup.

`supabase/tests/generation_idempotency.sql` is a rollback-only live proof that duplicate claims spend once and duplicate failures refund once.

`supabase/tests/recipe_collection_search.sql` is a rollback-only proof for ranking, voice-spaced titles, cookbook/ingredient/tag/recency hints, direct RLS selection, and RPC ownership isolation.

The Phase 9 hardening migration adds covering indexes for cookbook and generation foreign keys, locks the legacy timestamp trigger function to an empty search path, and removes zero-row tables from the retired nutrition-tracker product without `CASCADE`. `generation_requests` intentionally has RLS with no authenticated policy because it is an Edge-Function-owned idempotency ledger.

### `nutriai.collection_mutation_requests`

Private idempotency records for confirmed recipe moves and copies. Authenticated clients have no direct table grant. They call `nutriai.organize_recipe_page`, a narrowly scoped `SECURITY DEFINER` RPC with an empty search path, explicit caller and cookbook ownership checks, deterministic cookbook lock ordering, and one response per user-scoped request key. Move preserves the existing page. Copy creates an independent legacy recipe row and cookbook page, including the selected page version when present. `supabase/tests/collection_organization_actions.sql` proves retries do not duplicate work and another user's cookbook cannot be used as a destination.

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
| `supabase/migrations/20260821013221_collection_organization_actions.sql` | Adds private idempotency records and the ownership-checked move/copy RPC |
| `supabase/migrations/20260821171438_phase9_security_performance_hardening.sql` | Hardens RLS helpers and adds query-supporting indexes |
| `supabase/migrations/20260822002000_cookbook_page_selected_version_index.sql` | Adds selected-version lookup support |
| `supabase/migrations/20260822153000_simplify_recipe_page_pipeline.sql` | Collapses capture/review into processing, optional destination choice, retry, and ready; adds default books and versioned page-style anchors |

## RLS posture

User-editable product tables follow the same ownership pattern:

```sql
CREATE POLICY <table>_select ON nutriai.<table> FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY <table>_insert ON nutriai.<table> FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY <table>_update ON nutriai.<table> FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY <table>_delete ON nutriai.<table> FOR DELETE USING (auth.uid() = user_id);
```

`cookbook_pages` has an additional `BEFORE INSERT/UPDATE` trigger that errors if the cookbook owner and recipe owner don't match, so you can't smuggle another user's recipe onto your page.

`generation_requests` is RLS-enabled without client policies. The authenticated `generate-page-art` Edge Function accesses it through the service role. Its SECURITY DEFINER functions set an empty search path, use fully qualified relations, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution only to `service_role`.

## Cache keys

The mobile app caches Supabase reads in AsyncStorage so the shelf and the reader hydrate instantly on cold launch:

- `nosh:cookbook-shelf:v2:<userId>` - full `Cookbook[]` for the shelf.
- `nosh:cookbook-pages:v2:<cookbookId>` - that book's `CookbookPage[]`.
- `nosh:recipe-captures:v1:<userId>` - durable capture states used for cold-start restoration and offline display.

See [utils/cookbook/cache.ts](../utils/cookbook/cache.ts).
