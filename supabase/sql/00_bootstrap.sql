-- =============================================================================
-- Nosh - Fresh Database Bootstrap
-- =============================================================================
-- Run this against a fresh Supabase project to create the current book-first
-- cookbook schema.
--
-- Prerequisites:
--   - Supabase project with auth.users and storage enabled
--   - Run as the postgres/service_role user
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Schema and shared helpers
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS nutriai;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

GRANT USAGE ON SCHEMA nutriai TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION nutriai.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Cookbooks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.cookbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Cookbook',
  theme_name TEXT NOT NULL DEFAULT 'Warm handwritten',
  theme_prompt TEXT NOT NULL DEFAULT 'Warm handwritten cookbook page with practical recipe styling.',
  section_order JSONB NOT NULL DEFAULT '["breakfast","lunch","dinner","healthy","desserts","sides","favorites"]'::jsonb,
  cover_style TEXT NOT NULL DEFAULT 'handwritten',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cookbooks_cover_style_check
    CHECK (cover_style IN ('vintage-garden','handwritten','editorial','watercolor','rustic','minimal'))
);

ALTER TABLE nutriai.cookbooks
  ADD COLUMN IF NOT EXISTS cover_style TEXT NOT NULL DEFAULT 'handwritten';

ALTER TABLE nutriai.cookbooks
  ADD COLUMN IF NOT EXISTS sections JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE nutriai.cookbooks
   SET cover_style = 'handwritten'
 WHERE cover_style IS NULL
    OR cover_style = ''
    OR cover_style NOT IN ('vintage-garden','handwritten','editorial','watercolor','rustic','minimal');

DO $$ BEGIN
  ALTER TABLE nutriai.cookbooks
    ADD CONSTRAINT cookbooks_cover_style_check
    CHECK (cover_style IN ('vintage-garden','handwritten','editorial','watercolor','rustic','minimal'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DROP INDEX IF EXISTS nutriai.cookbooks_one_per_user_idx;

CREATE INDEX IF NOT EXISTS cookbooks_user_idx
  ON nutriai.cookbooks (user_id);

CREATE INDEX IF NOT EXISTS cookbooks_user_updated_idx
  ON nutriai.cookbooks (user_id, updated_at DESC);

DROP TRIGGER IF EXISTS cookbooks_set_updated_at ON nutriai.cookbooks;
CREATE TRIGGER cookbooks_set_updated_at
  BEFORE UPDATE ON nutriai.cookbooks
  FOR EACH ROW EXECUTE FUNCTION nutriai.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Recipes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  servings INTEGER,
  prep_time INTEGER,
  cook_time INTEGER,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_type TEXT NOT NULL CHECK (source_type IN ('url','text','image','video')),
  source_url TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT NOT NULL DEFAULT 'favorites',
  confidence NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS recipes_id_user_idx
  ON nutriai.recipes (id, user_id);

CREATE INDEX IF NOT EXISTS recipes_user_idx
  ON nutriai.recipes (user_id);

DROP TRIGGER IF EXISTS recipes_set_updated_at ON nutriai.recipes;
CREATE TRIGGER recipes_set_updated_at
  BEFORE UPDATE ON nutriai.recipes
  FOR EACH ROW EXECUTE FUNCTION nutriai.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Cookbook pages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.cookbook_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cookbook_id UUID NOT NULL REFERENCES nutriai.cookbooks(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES nutriai.recipes(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  section TEXT NOT NULL DEFAULT 'favorites',
  sort_order INTEGER NOT NULL DEFAULT 0,
  selected_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cookbook_id, page_number)
);

CREATE OR REPLACE FUNCTION nutriai.enforce_cookbook_page_recipe_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  cookbook_owner UUID;
  recipe_owner UUID;
BEGIN
  SELECT user_id INTO cookbook_owner
  FROM nutriai.cookbooks
  WHERE id = NEW.cookbook_id;

  SELECT user_id INTO recipe_owner
  FROM nutriai.recipes
  WHERE id = NEW.recipe_id;

  IF cookbook_owner IS NULL OR recipe_owner IS NULL OR cookbook_owner <> recipe_owner THEN
    RAISE EXCEPTION 'Cookbook page recipe must belong to the cookbook owner';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cookbook_pages_recipe_owner_check ON nutriai.cookbook_pages;
CREATE TRIGGER cookbook_pages_recipe_owner_check
  BEFORE INSERT OR UPDATE OF cookbook_id, recipe_id ON nutriai.cookbook_pages
  FOR EACH ROW EXECUTE FUNCTION nutriai.enforce_cookbook_page_recipe_owner();

CREATE INDEX IF NOT EXISTS pages_cookbook_order_idx
  ON nutriai.cookbook_pages (cookbook_id, sort_order);

DROP TRIGGER IF EXISTS cookbook_pages_set_updated_at ON nutriai.cookbook_pages;
CREATE TRIGGER cookbook_pages_set_updated_at
  BEFORE UPDATE ON nutriai.cookbook_pages
  FOR EACH ROW EXECUTE FUNCTION nutriai.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Page versions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.page_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES nutriai.cookbook_pages(id) ON DELETE CASCADE,
  image_url TEXT,
  storage_path TEXT,
  prompt_payload JSONB NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','generating','ready','failed')),
  credit_cost INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS page_versions_page_id_id_idx
  ON nutriai.page_versions (page_id, id);

CREATE INDEX IF NOT EXISTS page_versions_page_idx
  ON nutriai.page_versions (page_id);

ALTER TABLE nutriai.cookbook_pages
  DROP CONSTRAINT IF EXISTS cookbook_pages_selected_version_id_fkey;

ALTER TABLE nutriai.cookbook_pages
  ADD CONSTRAINT cookbook_pages_selected_version_id_fkey
  FOREIGN KEY (id, selected_version_id) REFERENCES nutriai.page_versions(page_id, id)
  ON DELETE SET NULL (selected_version_id);

-- ---------------------------------------------------------------------------
-- 6. Credits
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nutriai.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('grant','generation_spend','adjustment')),
  amount INTEGER NOT NULL,
  related_page_version_id UUID REFERENCES nutriai.page_versions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS credit_ledger_user_idx
  ON nutriai.credit_ledger (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION nutriai.reserve_generation_credit(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_balance INTEGER;
  spend_id UUID;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT COALESCE(SUM(amount), 0)::INTEGER
    INTO current_balance
  FROM nutriai.credit_ledger
  WHERE user_id = p_user_id;

  IF current_balance < 1 THEN
    RAISE EXCEPTION 'Not enough credits' USING errcode = 'P0001';
  END IF;

  INSERT INTO nutriai.credit_ledger (user_id, event_type, amount)
  VALUES (p_user_id, 'generation_spend', -1)
  RETURNING id INTO spend_id;

  RETURN spend_id;
END;
$$;

CREATE OR REPLACE FUNCTION nutriai.create_cookbook_page(
  p_cookbook_id UUID,
  p_recipe_id UUID,
  p_section TEXT
)
RETURNS nutriai.cookbook_pages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  next_page_number INTEGER;
  inserted_page nutriai.cookbook_pages;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_cookbook_id::text));

  SELECT COALESCE(MAX(page_number), 0) + 1
    INTO next_page_number
  FROM nutriai.cookbook_pages
  WHERE cookbook_id = p_cookbook_id;

  INSERT INTO nutriai.cookbook_pages (
    cookbook_id,
    recipe_id,
    page_number,
    section,
    sort_order
  )
  VALUES (
    p_cookbook_id,
    p_recipe_id,
    next_page_number,
    COALESCE(NULLIF(p_section, ''), 'favorites'),
    next_page_number
  )
  RETURNING * INTO inserted_page;

  RETURN inserted_page;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Row level security
-- ---------------------------------------------------------------------------
ALTER TABLE nutriai.cookbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutriai.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutriai.cookbook_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutriai.page_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutriai.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cookbooks_owner_select ON nutriai.cookbooks;
CREATE POLICY cookbooks_owner_select ON nutriai.cookbooks
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS cookbooks_owner_insert ON nutriai.cookbooks;
CREATE POLICY cookbooks_owner_insert ON nutriai.cookbooks
  FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS cookbooks_owner_update ON nutriai.cookbooks;
CREATE POLICY cookbooks_owner_update ON nutriai.cookbooks
  FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS cookbooks_owner_delete ON nutriai.cookbooks;
CREATE POLICY cookbooks_owner_delete ON nutriai.cookbooks
  FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS recipes_owner_all ON nutriai.recipes;
CREATE POLICY recipes_owner_all ON nutriai.recipes
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS pages_owner_all ON nutriai.cookbook_pages;
CREATE POLICY pages_owner_all ON nutriai.cookbook_pages
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM nutriai.cookbooks
      WHERE cookbooks.id = cookbook_pages.cookbook_id
        AND cookbooks.user_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM nutriai.cookbooks
      WHERE cookbooks.id = cookbook_pages.cookbook_id
        AND cookbooks.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS page_versions_owner_all ON nutriai.page_versions;
CREATE POLICY page_versions_owner_all ON nutriai.page_versions
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM nutriai.cookbook_pages p
      JOIN nutriai.cookbooks c ON c.id = p.cookbook_id
      WHERE p.id = page_versions.page_id
        AND c.user_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1
      FROM nutriai.cookbook_pages p
      JOIN nutriai.cookbooks c ON c.id = p.cookbook_id
      WHERE p.id = page_versions.page_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS credit_ledger_owner_select ON nutriai.credit_ledger;
CREATE POLICY credit_ledger_owner_select ON nutriai.credit_ledger
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS credit_ledger_service_all ON nutriai.credit_ledger;

-- ---------------------------------------------------------------------------
-- 8. Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA nutriai TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA nutriai TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA nutriai TO authenticated, service_role;

REVOKE ALL ON FUNCTION nutriai.reserve_generation_credit(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nutriai.create_cookbook_page(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nutriai.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION nutriai.enforce_cookbook_page_recipe_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION nutriai.reserve_generation_credit(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION nutriai.create_cookbook_page(UUID, UUID, TEXT) TO service_role;

-- ---------------------------------------------------------------------------
-- 9. Generated page storage
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cookbook-pages',
  'cookbook-pages',
  false,
  10485760,
  ARRAY['image/png', 'image/webp', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS cookbook_pages_owner_select ON storage.objects;
CREATE POLICY cookbook_pages_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'cookbook-pages'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::TEXT
  );

-- ---------------------------------------------------------------------------
-- 10. Comments
-- ---------------------------------------------------------------------------
COMMENT ON SCHEMA nutriai IS 'Nosh application schema';
COMMENT ON TABLE nutriai.cookbooks IS 'User-owned cookbook shelf entries';
COMMENT ON TABLE nutriai.recipes IS 'Structured recipes imported into cookbooks';
COMMENT ON TABLE nutriai.cookbook_pages IS 'Ordered recipe pages inside cookbooks';
COMMENT ON TABLE nutriai.page_versions IS 'Generated image versions for cookbook pages';
COMMENT ON TABLE nutriai.credit_ledger IS 'Append-only generation credit ledger';
