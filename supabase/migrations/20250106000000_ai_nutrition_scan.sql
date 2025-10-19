-- AI Nutrition Scan Feature
-- Creates tables for AI-powered food logging with nutrition analysis
-- Model: prithivMLmods/Food-101-93M (SigLIP-based)
-- Data: USDA FoodData Central (per-100g normalized)

-- ===========================================================================
-- Main AI Scan Logging Table
-- ===========================================================================
-- Stores complete AI scan results with metadata for analytics and improvement
CREATE TABLE IF NOT EXISTS food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('manual', 'ai_scan', 'search', 'recipe')),
  
  -- Image reference (path in Supabase Storage bucket 'meal-images')
  image_url TEXT,
  
  -- Classification results
  label TEXT NOT NULL, -- Canonical food label (e.g., "pizza", "grilled_chicken")
  confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Portion information
  grams_total INTEGER, -- Total grams in the meal
  portion_text TEXT, -- Human-readable portion (e.g., "1 cup", "150g", "1 slice")
  
  -- Nutrition totals (computed from per-100g × grams_total)
  totals JSONB NOT NULL, -- { calories, protein, carbohydrates, fat, fiber, sugar }
  
  -- Versioning for reproducibility and debugging
  model_version TEXT, -- e.g., "food-101-93m@v1"
  mapping_version TEXT, -- e.g., "usda-map@2025-01"
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================================================
-- USDA Nutrition Mapping Table (Per-100g Normalized)
-- ===========================================================================
-- Maps canonical food labels to USDA FoodData Central entries
-- All nutrition values are per 100g for consistency
CREATE TABLE IF NOT EXISTS food_usda_mapping (
  -- Primary key is the canonical food label
  label TEXT PRIMARY KEY,
  
  -- USDA FoodData Central reference
  fdc_id TEXT NOT NULL, -- FDC database ID for lookup/verification
  
  -- Core macronutrients (per 100g)
  calories INTEGER NOT NULL,
  protein FLOAT NOT NULL,
  carbohydrates FLOAT NOT NULL,
  fat FLOAT NOT NULL,
  
  -- Micronutrients (per 100g, optional)
  fiber FLOAT,
  sugar FLOAT,
  sodium FLOAT,
  
  -- Default portion size (for UI suggestions)
  default_grams INTEGER DEFAULT 100,
  default_portion_text TEXT, -- e.g., "1 cup", "1 slice", "1 medium"
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT -- Internal notes for data quality
);

-- ===========================================================================
-- Food Synonyms Table
-- ===========================================================================
-- Maps alternative names/spellings to canonical labels
-- Example: "pepperoni pizza" → "pizza", "grilled chicken breast" → "grilled_chicken"
CREATE TABLE IF NOT EXISTS food_synonyms (
  alias TEXT PRIMARY KEY, -- User-facing or model-predicted name
  canonical_label TEXT NOT NULL REFERENCES food_usda_mapping(label) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================================================
-- Indexes for Performance
-- ===========================================================================
-- food_logs indexes
CREATE INDEX idx_food_logs_user_date ON food_logs(user_id, created_at DESC);
CREATE INDEX idx_food_logs_label ON food_logs(label);
CREATE INDEX idx_food_logs_source ON food_logs(source);
CREATE INDEX idx_food_logs_model_version ON food_logs(model_version);

-- food_synonyms index
CREATE INDEX idx_food_synonyms_alias ON food_synonyms(alias);
CREATE INDEX idx_food_synonyms_canonical ON food_synonyms(canonical_label);

-- food_usda_mapping index
CREATE INDEX idx_food_usda_mapping_fdc_id ON food_usda_mapping(fdc_id);

-- ===========================================================================
-- Row-Level Security (RLS) Policies
-- ===========================================================================
-- food_logs: Users can only access their own logs
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food logs"
  ON food_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own food logs"
  ON food_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own food logs"
  ON food_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own food logs"
  ON food_logs FOR DELETE
  USING (auth.uid() = user_id);

-- food_usda_mapping: Public read (no user-specific data)
ALTER TABLE food_usda_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read USDA mapping"
  ON food_usda_mapping FOR SELECT
  USING (true);

-- Only admins can modify (via service role)
CREATE POLICY "Service role can manage USDA mapping"
  ON food_usda_mapping FOR ALL
  USING (auth.role() = 'service_role');

-- food_synonyms: Public read
ALTER TABLE food_synonyms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read food synonyms"
  ON food_synonyms FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage synonyms"
  ON food_synonyms FOR ALL
  USING (auth.role() = 'service_role');

-- ===========================================================================
-- Functions & Triggers
-- ===========================================================================
-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_food_logs_updated_at
  BEFORE UPDATE ON food_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_usda_mapping_updated_at
  BEFORE UPDATE ON food_usda_mapping
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===========================================================================
-- Initial Seed Data (Top 20 Most Common Foods from Food-101)
-- ===========================================================================
-- These are placeholder values - replace with actual USDA data
INSERT INTO food_usda_mapping (label, fdc_id, calories, protein, carbohydrates, fat, fiber, sugar, default_grams, default_portion_text, notes) VALUES
  ('pizza', '173292', 266, 11.0, 33.0, 10.0, 2.3, 3.6, 107, '1 slice', 'Cheese pizza, regular crust'),
  ('hamburger', '173287', 295, 17.0, 24.0, 14.0, 1.5, 4.8, 110, '1 burger', 'Plain hamburger with bun'),
  ('french_fries', '170427', 312, 3.4, 41.0, 15.0, 3.8, 0.2, 117, '1 medium serving', 'Deep fried potato strips'),
  ('ice_cream', '170920', 207, 3.5, 24.0, 11.0, 0.7, 21.0, 66, '1/2 cup', 'Vanilla ice cream'),
  ('grilled_chicken', '171477', 165, 31.0, 0.0, 3.6, 0.0, 0.0, 140, '1 breast', 'Grilled chicken breast, skinless'),
  ('caesar_salad', '167773', 149, 5.5, 8.0, 11.0, 2.2, 2.0, 100, '1 bowl', 'Caesar salad with dressing'),
  ('hot_dog', '173288', 290, 10.0, 22.0, 17.0, 0.8, 4.0, 100, '1 hot dog', 'Frankfurter with bun'),
  ('apple_pie', '167518', 237, 2.0, 34.0, 11.0, 1.6, 16.0, 125, '1 slice', 'Apple pie, homemade'),
  ('chocolate_cake', '167519', 352, 4.9, 50.0, 15.0, 2.1, 35.0, 95, '1 slice', 'Chocolate cake with frosting'),
  ('donuts', '167520', 452, 4.9, 51.0, 25.0, 1.5, 27.0, 52, '1 donut', 'Glazed donut'),
  ('bread', '172687', 265, 9.0, 49.0, 3.2, 2.7, 5.0, 32, '1 slice', 'White bread'),
  ('sushi', '173296', 143, 6.1, 21.0, 4.0, 0.6, 3.0, 100, '6 pieces', 'Sushi roll, mixed'),
  ('tacos', '173295', 226, 9.0, 20.0, 13.0, 2.7, 1.6, 100, '1 taco', 'Beef taco with toppings'),
  ('spaghetti_carbonara', '167765', 195, 8.0, 25.0, 7.0, 1.5, 2.0, 140, '1 cup', 'Pasta carbonara'),
  ('fried_rice', '168241', 163, 4.4, 28.0, 3.5, 0.8, 0.5, 198, '1 cup', 'Fried rice, chicken'),
  ('pancakes', '173277', 227, 6.0, 28.0, 10.0, 0.9, 6.0, 77, '1 pancake', 'Buttermilk pancake'),
  ('waffles', '173278', 291, 7.0, 33.0, 14.0, 1.2, 8.0, 75, '1 waffle', 'Waffle, plain'),
  ('omelette', '173424', 154, 11.0, 1.0, 12.0, 0.0, 0.8, 122, '2 eggs', 'Cheese omelette'),
  ('chicken_wings', '171479', 290, 27.0, 0.0, 19.0, 0.0, 0.0, 100, '4 wings', 'Chicken wings, fried'),
  ('salad', '167772', 33, 2.7, 6.3, 0.2, 2.1, 2.3, 100, '1 bowl', 'Mixed green salad, no dressing')
ON CONFLICT (label) DO NOTHING;

-- Seed common synonyms
INSERT INTO food_synonyms (alias, canonical_label) VALUES
  ('pepperoni pizza', 'pizza'),
  ('cheese pizza', 'pizza'),
  ('margherita pizza', 'pizza'),
  ('burger', 'hamburger'),
  ('cheeseburger', 'hamburger'),
  ('fries', 'french_fries'),
  ('chips', 'french_fries'),
  ('vanilla ice cream', 'ice_cream'),
  ('chocolate ice cream', 'ice_cream'),
  ('grilled chicken breast', 'grilled_chicken'),
  ('chicken breast', 'grilled_chicken'),
  ('hot dog', 'hot_dog'),
  ('hotdog', 'hot_dog'),
  ('donut', 'donuts'),
  ('doughnut', 'donuts'),
  ('white bread', 'bread'),
  ('wheat bread', 'bread'),
  ('taco', 'tacos'),
  ('beef taco', 'tacos'),
  ('spaghetti', 'spaghetti_carbonara'),
  ('carbonara', 'spaghetti_carbonara'),
  ('pancake', 'pancakes'),
  ('waffle', 'waffles'),
  ('omelet', 'omelette'),
  ('egg omelette', 'omelette'),
  ('wings', 'chicken_wings'),
  ('buffalo wings', 'chicken_wings'),
  ('green salad', 'salad'),
  ('mixed salad', 'salad')
ON CONFLICT (alias) DO NOTHING;

-- ===========================================================================
-- Storage Bucket for Meal Images
-- ===========================================================================
-- Note: This should be run separately or via Supabase Dashboard
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'meal-images',
--   'meal-images',
--   false,
--   1572864, -- 1.5 MB limit
--   ARRAY['image/jpeg', 'image/png', 'image/webp']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies (run after bucket creation)
-- CREATE POLICY "Users can upload own meal images"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'meal-images' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can view own meal images"
--   ON storage.objects FOR SELECT
--   USING (
--     bucket_id = 'meal-images' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

-- CREATE POLICY "Users can delete own meal images"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'meal-images' AND
--     auth.uid()::text = (storage.foldername(name))[1]
--   );

COMMENT ON TABLE food_logs IS 'AI-powered food scan results with full nutrition data';
COMMENT ON TABLE food_usda_mapping IS 'Canonical food labels mapped to USDA FoodData Central (per-100g)';
COMMENT ON TABLE food_synonyms IS 'Alternative food names mapped to canonical labels';
