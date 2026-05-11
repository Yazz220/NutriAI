-- =============================================================================
-- Nosh — Multi-Cookbook + Legacy Cleanup (2026-05-05)
-- =============================================================================
-- 1. Lifts the one-cookbook-per-user constraint (multi-book shelf).
-- 2. Adds per-book style + sections columns.
-- 3. Drops legacy calorie-tracker tables that no longer fit the cookbook product
--    (meal_plans, food_logs, food_usda_mapping, food_synonyms, ingredient_icons).
--    No live client code references them; only deprecated docs do.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Multi-cookbook upgrades on nutriai.cookbooks
-- ---------------------------------------------------------------------------

-- Allow many cookbooks per user.
DROP INDEX IF EXISTS nutriai.cookbooks_one_per_user_idx;

-- Per-book style preset. Drives cover artwork AND page generation prompt.
ALTER TABLE nutriai.cookbooks
  ADD COLUMN IF NOT EXISTS cover_style TEXT NOT NULL DEFAULT 'handwritten';

DO $$ BEGIN
  ALTER TABLE nutriai.cookbooks
    ADD CONSTRAINT cookbooks_cover_style_check
    CHECK (cover_style IN ('vintage-garden','handwritten','editorial','watercolor','rustic','minimal'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Per-book sections, denormalized for ordering. JSONB array of {id,label,order}.
ALTER TABLE nutriai.cookbooks
  ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill existing rows with the default style (matches the prior "Warm handwritten" theme).
UPDATE nutriai.cookbooks
   SET cover_style = 'handwritten'
 WHERE cover_style IS NULL OR cover_style = '';

-- Index for shelf listing (most-recently-touched first).
CREATE INDEX IF NOT EXISTS cookbooks_user_updated_idx
  ON nutriai.cookbooks (user_id, updated_at DESC);

-- ---------------------------------------------------------------------------
-- Legacy cleanup — drop tables that don't fit the cookbook product
-- ---------------------------------------------------------------------------

-- Old meal-planning calendar (calorie-tracker era).
DROP TABLE IF EXISTS nutriai.meal_plans CASCADE;

-- Old inventory ingredient icon catalog (calorie-tracker era).
DROP TABLE IF EXISTS nutriai.ingredient_icons CASCADE;

-- Old food/calorie logging tables in public schema.
DROP TABLE IF EXISTS public.food_logs CASCADE;
DROP TABLE IF EXISTS public.food_synonyms CASCADE;
DROP TABLE IF EXISTS public.food_usda_mapping CASCADE;
