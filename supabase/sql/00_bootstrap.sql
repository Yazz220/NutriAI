-- =============================================================================
-- Nosh — Full Database Bootstrap
-- =============================================================================
-- Run this against a fresh Supabase project to create all tables, RLS policies,
-- triggers, and seed data. Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).
--
-- Prerequisites:
--   - Supabase project with auth.users enabled (default)
--   - Run as the postgres/service_role user
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS nutriai;

-- ---------------------------------------------------------------------------
-- 2. Shared helper: auto-update updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION nutriai.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Alias in public schema (used by food_logs etc.)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 3. nutriai.profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.profiles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  units       TEXT DEFAULT 'metric',
  goals       JSONB DEFAULT '{}'::jsonb,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON nutriai.profiles;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON nutriai.profiles
  FOR EACH ROW EXECUTE FUNCTION nutriai.set_updated_at();

ALTER TABLE nutriai.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY profiles_select ON nutriai.profiles FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY profiles_insert ON nutriai.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY profiles_update ON nutriai.profiles FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. nutriai.meal_plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.meal_plans (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id    TEXT NOT NULL,
  date         DATE NOT NULL,
  meal_type    TEXT NOT NULL,
  servings     INTEGER DEFAULT 1,
  notes        TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date
  ON nutriai.meal_plans (user_id, date);

DROP TRIGGER IF EXISTS meal_plans_set_updated_at ON nutriai.meal_plans;
CREATE TRIGGER meal_plans_set_updated_at
  BEFORE UPDATE ON nutriai.meal_plans
  FOR EACH ROW EXECUTE FUNCTION nutriai.set_updated_at();

ALTER TABLE nutriai.meal_plans ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY meal_plans_select ON nutriai.meal_plans FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY meal_plans_insert ON nutriai.meal_plans FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY meal_plans_update ON nutriai.meal_plans FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY meal_plans_delete ON nutriai.meal_plans FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 5. nutriai.ingredient_icons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.ingredient_icons (
  slug              TEXT PRIMARY KEY,
  display_name      TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('ready','pending','failed')),
  image_url         TEXT,
  storage_path      TEXT,
  seed              INTEGER,
  prompt_version    INTEGER NOT NULL DEFAULT 1,
  prompt            TEXT,
  model             TEXT,
  fail_count        INTEGER NOT NULL DEFAULT 0,
  last_error        TEXT,
  last_requested_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ingredient_icons_status_idx
  ON nutriai.ingredient_icons (status);
CREATE INDEX IF NOT EXISTS ingredient_icons_updated_idx
  ON nutriai.ingredient_icons (updated_at DESC);
CREATE INDEX IF NOT EXISTS ingredient_icons_requested_idx
  ON nutriai.ingredient_icons (last_requested_at DESC);

DROP TRIGGER IF EXISTS ingredient_icons_set_updated_at ON nutriai.ingredient_icons;
CREATE TRIGGER ingredient_icons_set_updated_at
  BEFORE UPDATE ON nutriai.ingredient_icons
  FOR EACH ROW EXECUTE FUNCTION nutriai.set_updated_at();

ALTER TABLE nutriai.ingredient_icons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY ingredient_icons_read ON nutriai.ingredient_icons FOR SELECT
    TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY ingredient_icons_write_service ON nutriai.ingredient_icons FOR ALL
    TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 6. public.food_usda_mapping  (USDA nutrition per 100 g)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_usda_mapping (
  label                TEXT PRIMARY KEY,
  fdc_id               TEXT NOT NULL,
  calories             INTEGER NOT NULL,
  protein              FLOAT NOT NULL,
  carbohydrates        FLOAT NOT NULL,
  fat                  FLOAT NOT NULL,
  fiber                FLOAT,
  sugar                FLOAT,
  sodium               FLOAT,
  default_grams        INTEGER DEFAULT 100,
  default_portion_text TEXT,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  notes                TEXT
);

CREATE INDEX IF NOT EXISTS idx_food_usda_mapping_fdc_id
  ON public.food_usda_mapping (fdc_id);

DROP TRIGGER IF EXISTS update_food_usda_mapping_updated_at ON public.food_usda_mapping;
CREATE TRIGGER update_food_usda_mapping_updated_at
  BEFORE UPDATE ON public.food_usda_mapping
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.food_usda_mapping ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read USDA mapping" ON public.food_usda_mapping
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage USDA mapping" ON public.food_usda_mapping
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 7. public.food_synonyms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_synonyms (
  alias           TEXT PRIMARY KEY,
  canonical_label TEXT NOT NULL REFERENCES public.food_usda_mapping(label) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_synonyms_alias
  ON public.food_synonyms (alias);
CREATE INDEX IF NOT EXISTS idx_food_synonyms_canonical
  ON public.food_synonyms (canonical_label);

ALTER TABLE public.food_synonyms ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read food synonyms" ON public.food_synonyms
    FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Service role can manage synonyms" ON public.food_synonyms
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 8. public.food_logs  (AI-powered food scan results)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.food_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source          TEXT NOT NULL CHECK (source IN ('manual', 'ai_scan', 'search', 'recipe')),
  image_url       TEXT,
  label           TEXT NOT NULL,
  confidence      FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  grams_total     INTEGER,
  portion_text    TEXT,
  totals          JSONB NOT NULL,
  model_version   TEXT,
  mapping_version TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_logs_user_date
  ON public.food_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_label
  ON public.food_logs (label);

DROP TRIGGER IF EXISTS update_food_logs_updated_at ON public.food_logs;
CREATE TRIGGER update_food_logs_updated_at
  BEFORE UPDATE ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own food logs" ON public.food_logs
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert own food logs" ON public.food_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own food logs" ON public.food_logs
    FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own food logs" ON public.food_logs
    FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 9. Seed data — USDA top-20 foods
-- ---------------------------------------------------------------------------
INSERT INTO public.food_usda_mapping (label, fdc_id, calories, protein, carbohydrates, fat, fiber, sugar, default_grams, default_portion_text, notes) VALUES
  ('pizza',               '173292', 266, 11.0, 33.0, 10.0, 2.3, 3.6, 107, '1 slice',          'Cheese pizza, regular crust'),
  ('hamburger',           '173287', 295, 17.0, 24.0, 14.0, 1.5, 4.8, 110, '1 burger',         'Plain hamburger with bun'),
  ('french_fries',        '170427', 312,  3.4, 41.0, 15.0, 3.8, 0.2, 117, '1 medium serving',  'Deep fried potato strips'),
  ('ice_cream',           '170920', 207,  3.5, 24.0, 11.0, 0.7, 21.0, 66, '1/2 cup',          'Vanilla ice cream'),
  ('grilled_chicken',     '171477', 165, 31.0,  0.0,  3.6, 0.0, 0.0, 140, '1 breast',         'Grilled chicken breast, skinless'),
  ('caesar_salad',        '167773', 149,  5.5,  8.0, 11.0, 2.2, 2.0, 100, '1 bowl',           'Caesar salad with dressing'),
  ('hot_dog',             '173288', 290, 10.0, 22.0, 17.0, 0.8, 4.0, 100, '1 hot dog',        'Frankfurter with bun'),
  ('apple_pie',           '167518', 237,  2.0, 34.0, 11.0, 1.6, 16.0, 125, '1 slice',         'Apple pie, homemade'),
  ('chocolate_cake',      '167519', 352,  4.9, 50.0, 15.0, 2.1, 35.0, 95, '1 slice',          'Chocolate cake with frosting'),
  ('donuts',              '167520', 452,  4.9, 51.0, 25.0, 1.5, 27.0, 52, '1 donut',          'Glazed donut'),
  ('bread',               '172687', 265,  9.0, 49.0,  3.2, 2.7, 5.0, 32, '1 slice',           'White bread'),
  ('sushi',               '173296', 143,  6.1, 21.0,  4.0, 0.6, 3.0, 100, '6 pieces',         'Sushi roll, mixed'),
  ('tacos',               '173295', 226,  9.0, 20.0, 13.0, 2.7, 1.6, 100, '1 taco',           'Beef taco with toppings'),
  ('spaghetti_carbonara', '167765', 195,  8.0, 25.0,  7.0, 1.5, 2.0, 140, '1 cup',            'Pasta carbonara'),
  ('fried_rice',          '168241', 163,  4.4, 28.0,  3.5, 0.8, 0.5, 198, '1 cup',            'Fried rice, chicken'),
  ('pancakes',            '173277', 227,  6.0, 28.0, 10.0, 0.9, 6.0, 77, '1 pancake',         'Buttermilk pancake'),
  ('waffles',             '173278', 291,  7.0, 33.0, 14.0, 1.2, 8.0, 75, '1 waffle',          'Waffle, plain'),
  ('omelette',            '173424', 154, 11.0,  1.0, 12.0, 0.0, 0.8, 122, '2 eggs',           'Cheese omelette'),
  ('chicken_wings',       '171479', 290, 27.0,  0.0, 19.0, 0.0, 0.0, 100, '4 wings',          'Chicken wings, fried'),
  ('salad',               '167772',  33,  2.7,  6.3,  0.2, 2.1, 2.3, 100, '1 bowl',           'Mixed green salad, no dressing')
ON CONFLICT (label) DO NOTHING;

INSERT INTO public.food_synonyms (alias, canonical_label) VALUES
  ('pepperoni pizza',      'pizza'),
  ('cheese pizza',         'pizza'),
  ('margherita pizza',     'pizza'),
  ('burger',               'hamburger'),
  ('cheeseburger',         'hamburger'),
  ('fries',                'french_fries'),
  ('chips',                'french_fries'),
  ('vanilla ice cream',    'ice_cream'),
  ('chocolate ice cream',  'ice_cream'),
  ('grilled chicken breast','grilled_chicken'),
  ('chicken breast',       'grilled_chicken'),
  ('hot dog',              'hot_dog'),
  ('hotdog',               'hot_dog'),
  ('donut',                'donuts'),
  ('doughnut',             'donuts'),
  ('white bread',          'bread'),
  ('wheat bread',          'bread'),
  ('taco',                 'tacos'),
  ('beef taco',            'tacos'),
  ('spaghetti',            'spaghetti_carbonara'),
  ('carbonara',            'spaghetti_carbonara'),
  ('pancake',              'pancakes'),
  ('waffle',               'waffles'),
  ('omelet',               'omelette'),
  ('egg omelette',         'omelette'),
  ('wings',                'chicken_wings'),
  ('buffalo wings',        'chicken_wings'),
  ('green salad',          'salad'),
  ('mixed salad',          'salad')
ON CONFLICT (alias) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. Comments
-- ---------------------------------------------------------------------------
COMMENT ON SCHEMA nutriai IS 'Nosh application schema';
COMMENT ON TABLE nutriai.profiles IS 'User profiles with goals and preferences';
COMMENT ON TABLE nutriai.meal_plans IS 'Planned meals by date and meal type';
COMMENT ON TABLE nutriai.ingredient_icons IS 'AI-generated ingredient icon queue and results';
COMMENT ON TABLE public.food_logs IS 'AI-powered food scan results with full nutrition data';
COMMENT ON TABLE public.food_usda_mapping IS 'Canonical food labels mapped to USDA FoodData Central (per-100g)';
COMMENT ON TABLE public.food_synonyms IS 'Alternative food names mapped to canonical labels';
