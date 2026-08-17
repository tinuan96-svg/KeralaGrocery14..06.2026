/*
  # Add image quality score columns to products table

  1. New columns
    - `image_quality_score` (integer) — 0–100 composite quality score from studio normalization
    - `image_occupancy_pct` (integer) — % of canvas height the product occupies (target 75–80%)
    - `image_centered` (boolean) — whether the product was successfully centered on the canvas

  2. Notes
    - All columns nullable; populated only after studio normalization runs
    - Existing rows are left null until reprocessed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_quality_score'
  ) THEN
    ALTER TABLE products ADD COLUMN image_quality_score integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_occupancy_pct'
  ) THEN
    ALTER TABLE products ADD COLUMN image_occupancy_pct integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'image_centered'
  ) THEN
    ALTER TABLE products ADD COLUMN image_centered boolean;
  END IF;
END $$;
