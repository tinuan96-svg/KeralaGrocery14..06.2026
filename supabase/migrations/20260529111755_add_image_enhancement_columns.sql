/*
  # Add AI image enhancement columns to products

  ## Purpose
  Supports the AI image enhancement pipeline in the admin Product Approval > Image tab.
  Both original and enhanced images are stored so the original is never overwritten.

  ## New Columns on `products`
  - `original_image_url` — URL of the raw uploaded image, never overwritten
  - `enhanced_image_url` — URL of the AI-enhanced image
  - `thumbnail_url`      — URL of the generated thumbnail version
  - `image_processing_status` — tracks pipeline state: pending | processing | completed | failed
  - `image_processed_at` — timestamp when processing last completed (or failed)

  ## Notes
  - `image_url` / `image_main` continue to hold the "active" image (original or enhanced, admin choice)
  - Adding with IF NOT EXISTS guards to be idempotent
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'original_image_url') THEN
    ALTER TABLE products ADD COLUMN original_image_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'enhanced_image_url') THEN
    ALTER TABLE products ADD COLUMN enhanced_image_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'thumbnail_url') THEN
    ALTER TABLE products ADD COLUMN thumbnail_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_processing_status') THEN
    ALTER TABLE products ADD COLUMN image_processing_status text DEFAULT 'pending'
      CHECK (image_processing_status IN ('pending', 'processing', 'completed', 'failed'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_processed_at') THEN
    ALTER TABLE products ADD COLUMN image_processed_at timestamptz;
  END IF;
END $$;
