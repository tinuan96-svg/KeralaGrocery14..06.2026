/*
  # Add missing product fields: weight, stock, unit, product_type

  ## Summary
  The CentralHub sync function writes weight, stock, unit, and product_type fields
  from the CentralHub API onto local products, but these columns did not exist in
  the products table, causing every sync/force-resync to fail.

  ## Changes
  ### products table
  - `weight` (numeric, nullable) — product weight from CentralHub
  - `stock` (integer, default 0) — stock quantity from CentralHub
  - `unit` (text, nullable) — unit label (e.g. "500g", "1kg")
  - `product_type` (text, nullable) — product type / category from CentralHub

  ## Notes
  - All columns are nullable with sensible defaults so existing rows are unaffected
  - No RLS changes needed — these columns are governed by existing product table RLS policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'weight'
  ) THEN
    ALTER TABLE products ADD COLUMN weight numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'stock'
  ) THEN
    ALTER TABLE products ADD COLUMN stock integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'unit'
  ) THEN
    ALTER TABLE products ADD COLUMN unit text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_type'
  ) THEN
    ALTER TABLE products ADD COLUMN product_type text;
  END IF;
END $$;
