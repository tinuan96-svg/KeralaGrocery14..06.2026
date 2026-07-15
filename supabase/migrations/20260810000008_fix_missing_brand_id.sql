-- Fix missing brand_id column in products table
-- This column is required by the centralhub-realtime sync function

DO $$
BEGIN
  -- 1. Ensure 'brands' table exists (it should, but safety first)
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brands') THEN
    CREATE TABLE public.brands (
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
  END IF;

  -- 2. Add brand_id to products if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE public.products ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
  END IF;

  -- 3. Re-grant permissions just in case
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
  GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

  -- 4. Force PostgREST to reload schema cache
  CREATE TABLE IF NOT EXISTS public.pgrst_reload_trigger (id int);
  DROP TABLE public.pgrst_reload_trigger;

END $$;
