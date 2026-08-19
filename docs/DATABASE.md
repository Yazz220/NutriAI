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
| `cover_style` | text CHECK ∈ {`vintage-garden`, `handwritten`, `editorial`, `watercolor`, `rustic`, `minimal`, `sage-linen`, `terracotta-cloth`, `navy-leather`, `charcoal-cloth`, `alabaster-linen`, `umber-leather`} | Drives cover artwork + page-generation prompt |
| `page_template_id` | text CHECK ∈ {`clean-cream`, `ink-sketch`, `modern-editorial`} default `clean-cream` | Book-level default page layout for new recipe pages |
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

### `nutriai.page_versions`
Each cookbook page image generation pass produces a version. Used to keep history and let the user compare regenerations.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `page_id` | uuid → `cookbook_pages` | |
| `image_url`, `storage_path` | text | Where the rendered cookbook page lives in Supabase Storage |
| `prompt_payload` | jsonb | The exact `CookbookPagePromptPayload` we sent |
| `model` | text | e.g. `gpt-image-2` |
| `status` | text CHECK ∈ {`pending`, `generating`, `ready`, `failed`} | |
| `credit_cost` | integer | Almost always 1 |
| `error_message` | text | |

### `nutriai.credit_ledger`
Append-only generation credit ledger. Sum of `amount` per `user_id` is the current balance. Generation spend and refund rows reference a generation request and are protected by partial unique indexes, so one request can spend and refund at most once.

### `nutriai.generation_requests`
Server-owned idempotency records for cookbook page generation. A row stores the user-scoped request key, original payload, processing state, created recipe/page/version references, storage path, and cached successful response.

The Edge Function claims a request, returns a processing response, and completes image generation as a background task. The client polls with the same idempotency key until it receives the cached page or terminal failure. Repeated calls do not start another generation. Requests that remain processing for more than ten minutes are expired and refunded on the next lookup.

`supabase/tests/generation_idempotency.sql` is a rollback-only live proof that duplicate claims spend once and duplicate failures refund once.

## Removed tables (legacy cleanup, 2026-05-05)

These belonged to older product directions and have no live code references in the current book-first branch:

- `nutriai.meal_plans`
- `nutriai.ingredient_icons`
- `public.food_logs`
- `public.food_synonyms`
- `public.food_usda_mapping`

## Migrations

Run in numeric order against a fresh project. All are idempotent (`IF NOT EXISTS` / `EXCEPTION WHEN duplicate_*`).

| File | Adds |
|---|---|
| `supabase/sql/00_bootstrap.sql` | `profiles`, helper functions, RLS, base triggers |
| `supabase/sql/20260503_ai_cookbook_reset.sql` | `cookbooks`, `recipes`, `cookbook_pages`, `page_versions`, `credit_ledger` + `reserve_generation_credit` |
| `supabase/sql/20260505_multi_cookbook.sql` | Drops one-cookbook-per-user index, adds `cover_style` + `sections`, drops legacy tables |
| `supabase/migrations/20260803132008_generation_request_idempotency.sql` | Generation request claims, request-scoped spend/refund uniqueness, completion caching, and stale-request recovery |
| `supabase/migrations/20260820120000_cookbook_page_template.sql` | Adds `page_template_id` column to `cookbooks` for book-level default page layout |

## RLS posture

User-editable product tables follow the same ownership pattern:

```sql
CREATE POLICY <table>_select ON nutriai.<table> FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY <table>_insert ON nutriai.<table> FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY <table>_update ON nutriai.<table> FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY <table>_delete ON nutriai.<table> FOR DELETE USING (auth.uid() = user_id);
```

`cookbook_pages` has an additional `BEFORE INSERT/UPDATE` trigger that errors if the cookbook owner and recipe owner don't match, so you can't smuggle another user's recipe onto your page.

`generation_requests` is RLS-enabled without client policies. It is only accessed by the authenticated `generate-cookbook-page` Edge Function through the service role. Its SECURITY DEFINER functions set an empty search path, use fully qualified relations, revoke execution from `PUBLIC`, `anon`, and `authenticated`, and grant execution only to `service_role`.

## Cache keys

The mobile app caches Supabase reads in AsyncStorage so the shelf and the reader hydrate instantly on cold launch:

- `nosh:cookbook-shelf:v2:<userId>` - full `Cookbook[]` for the shelf.
- `nosh:cookbook-pages:v2:<cookbookId>` - that book's `CookbookPage[]`.

See [utils/cookbook/cache.ts](../utils/cookbook/cache.ts).
