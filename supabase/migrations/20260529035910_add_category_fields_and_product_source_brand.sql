/*
  # Extend categories table and add source_brand to products

  1. Categories table
     - Add `description` (text) — admin-editable category description
     - Add `image_url` (text) — category image for display
     - Add `display_name` (text) — optional display override

  2. Products table
     - Add `source_brand` (text) — brand name auto-imported from CentralHub, shown read-only in admin

  Security: existing RLS policies are preserved; no new tables added.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN description text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'display_name'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN display_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'source_brand'
  ) THEN
    ALTER TABLE public.products ADD COLUMN source_brand text;
  END IF;
END $$;
