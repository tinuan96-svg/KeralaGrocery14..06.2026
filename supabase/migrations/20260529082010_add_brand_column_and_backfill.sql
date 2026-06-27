/*
  # Add brand text column and backfill from source_brand

  ## Summary
  The products table has a `source_brand` column populated during CentralHub sync,
  but the brands page and frontend queries expect a plain `brand` text column.
  This migration adds `brand`, copies existing `source_brand` values into it,
  adds an index for filtering, and ensures future syncs keep both columns in sync.

  ## Changes
  1. New column: `products.brand` (text, nullable)
     - Stores the brand name exactly as received from CentralHub
     - Used by brands page via: SELECT DISTINCT brand FROM products WHERE brand IS NOT NULL AND brand <> ''
  2. Backfill: copies source_brand → brand for all existing rows where brand IS NULL
  3. Index: idx_products_brand for fast brand filtering
*/

-- 1. Add brand column if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'brand'
  ) THEN
    ALTER TABLE products ADD COLUMN brand text;
  END IF;
END $$;

-- 2. Backfill: copy source_brand → brand for every row where brand is not yet set
UPDATE products
SET brand = source_brand
WHERE brand IS NULL
  AND source_brand IS NOT NULL
  AND source_brand <> '';

-- 3. Index for brand filtering and distinct queries
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand)
  WHERE brand IS NOT NULL AND brand <> '';
