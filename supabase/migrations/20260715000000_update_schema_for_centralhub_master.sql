-- Finalize schema for CentralHub Master Registry requirements

-- 1. Ensure centralhub_product_id is text and unique
DO $$
BEGIN
  -- If it exists as UUID, we need to convert it to text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'centralhub_product_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE products ALTER COLUMN centralhub_product_id TYPE text USING centralhub_product_id::text;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'centralhub_product_id'
  ) THEN
    ALTER TABLE products ADD COLUMN centralhub_product_id text;
  END IF;
END $$;

-- 2. Ensure sku is text and unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sku'
  ) THEN
    ALTER TABLE products ADD COLUMN sku text;
  END IF;
END $$;

-- Add unique constraints (using separate statements to handle existing data issues if necessary,
-- but usually for migrations we want these to fail if there are duplicates so they can be cleaned)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_centralhub_product_id_key;
ALTER TABLE products ADD CONSTRAINT products_centralhub_product_id_key UNIQUE (centralhub_product_id);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);

-- 3. Add department and main_category
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'department') THEN
    ALTER TABLE products ADD COLUMN department text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'main_category') THEN
    ALTER TABLE products ADD COLUMN main_category text;
  END IF;
END $$;

-- 4. Add category and sub_category
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
    ALTER TABLE products ADD COLUMN category text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sub_category') THEN
    ALTER TABLE products ADD COLUMN sub_category text;
  END IF;
END $$;

-- 5. Add weight_kg and weight_grams
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight_kg') THEN
    ALTER TABLE products ADD COLUMN weight_kg numeric DEFAULT 0.5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'weight_grams') THEN
    ALTER TABLE products ADD COLUMN weight_grams integer DEFAULT 500;
  END IF;
END $$;

-- 6. Ensure warehouse_location and cost_price
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'warehouse_location') THEN
    ALTER TABLE products ADD COLUMN warehouse_location text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
    ALTER TABLE products ADD COLUMN cost_price numeric;
  END IF;
END $$;

-- 7. Trigger Cleanup: Verify that any local triggers like auto_generate_ch_sku
-- do not overwrite incoming data.
DROP TRIGGER IF EXISTS auto_generate_ch_sku ON products;
DROP FUNCTION IF EXISTS auto_generate_ch_sku();

-- Ensure CentralHub data takes precedence in any other sync-related triggers
-- (Add other trigger cleanup here if identified)
