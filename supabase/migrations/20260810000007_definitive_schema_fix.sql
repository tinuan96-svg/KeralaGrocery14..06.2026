-- DEFINITIVE SCHEMA FIX & CACHE RELOAD
-- This migration ensures all tables, columns, and types match the code expectations.

-- 1. Ensure 'brands' table exists and has correct columns
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  description text,
  show_on_homepage boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Ensure 'categories' table has boolean flags (Fixes 'text = boolean' errors)
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_active') THEN
    ALTER TABLE categories ADD COLUMN is_active boolean DEFAULT true;
  ELSE
    ALTER TABLE categories ALTER COLUMN is_active TYPE boolean USING is_active::boolean;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'show_on_homepage') THEN
    ALTER TABLE categories ADD COLUMN show_on_homepage boolean DEFAULT true;
  ELSE
    ALTER TABLE categories ALTER COLUMN show_on_homepage TYPE boolean USING show_on_homepage::boolean;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'icon') THEN
    ALTER TABLE categories ADD COLUMN icon text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'sort_order') THEN
    ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- 3. Ensure 'products' has all critical columns
DO $$
BEGIN
  -- Basic fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_medium') THEN
    ALTER TABLE products ADD COLUMN image_medium text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'rating') THEN
    ALTER TABLE products ADD COLUMN rating decimal(2,1) DEFAULT 4.5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'review_count') THEN
    ALTER TABLE products ADD COLUMN review_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sold_count') THEN
    ALTER TABLE products ADD COLUMN sold_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
    ALTER TABLE products ADD COLUMN stock_quantity integer DEFAULT 0;
  END IF;

  -- Flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_hot_product') THEN
    ALTER TABLE products ADD COLUMN is_hot_product boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'hot_product_expires_at') THEN
    ALTER TABLE products ADD COLUMN hot_product_expires_at timestamptz;
  END IF;
END $$;

-- 4. Re-grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- 5. Force PostgREST to reload schema cache
-- By creating and dropping a dummy table
CREATE TABLE IF NOT EXISTS public.pgrst_reload_trigger (id int);
DROP TABLE public.pgrst_reload_trigger;

-- 6. Robust version of get_category_carousel
CREATE OR REPLACE FUNCTION public.get_category_carousel()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  sort_order integer,
  product_count bigint,
  hero_image text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.slug,
    c.sort_order,
    COUNT(p.id) as product_count,
    MAX(p.enhanced_image_url) as hero_image
  FROM categories c
  LEFT JOIN products p ON c.id = p.category_id
    AND p.approval_status = 'approved'
    AND p.visibility_status = true
    AND p.is_active = true
    AND (p.is_deleted IS NULL OR p.is_deleted = false)
  WHERE c.is_active = true
    AND c.show_on_homepage = true
  GROUP BY c.id
  ORDER BY c.sort_order ASC;
END;
$$;
