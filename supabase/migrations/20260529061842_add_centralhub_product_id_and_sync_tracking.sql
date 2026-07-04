/*
  # Add centralhub_product_id as permanent sync identifier

  ## Summary
  Replaces the implicit string-based `source_product_id` matching with a
  proper UUID column `centralhub_product_id` that stores CentralHub's
  native `id` field as the stable sync key.

  ## Changes

  ### products table
  - Add `centralhub_product_id` UUID column (nullable, unique)
  - Backfill from `source_product_id` (cast to UUID where valid)
  - Add unique index for fast lookup during sync

  ### sync_log table
  - Add `linked` int4 — products linked during backfill/sync
  - Add `unmatched` int4 — CentralHub products with no local match
  - Add `duplicates` int4 — duplicate centralhub_product_id detections
  - Add `name_updates` int4 — products whose name was updated from CentralHub

  ## Notes
  - `source_product_id` (text) is kept untouched for backwards-compat
  - The backfill converts valid UUID strings from source_product_id → centralhub_product_id
  - The unique constraint prevents two local products pointing at the same CentralHub product
*/

-- 1. Add centralhub_product_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'centralhub_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN centralhub_product_id uuid;
  END IF;
END $$;

-- 2. Unique index (allows nulls, only enforces uniqueness on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS products_centralhub_product_id_key
  ON products (centralhub_product_id)
  WHERE centralhub_product_id IS NOT NULL;

-- 3. Regular index for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_centralhub_product_id
  ON products (centralhub_product_id);

-- 4. Backfill: copy source_product_id → centralhub_product_id where source_product_id looks like a UUID
UPDATE products
SET centralhub_product_id = source_product_id::uuid
WHERE
  centralhub_product_id IS NULL
  AND source_product_id IS NOT NULL
  AND source_product_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

-- 5. Extend sync_log with new tracking columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_log' AND column_name = 'linked') THEN
    ALTER TABLE sync_log ADD COLUMN linked integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_log' AND column_name = 'unmatched') THEN
    ALTER TABLE sync_log ADD COLUMN unmatched integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_log' AND column_name = 'duplicates') THEN
    ALTER TABLE sync_log ADD COLUMN duplicates integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_log' AND column_name = 'name_updates') THEN
    ALTER TABLE sync_log ADD COLUMN name_updates integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sync_log' AND column_name = 'action') THEN
    ALTER TABLE sync_log ADD COLUMN action text DEFAULT 'sync';
  END IF;
END $$;
