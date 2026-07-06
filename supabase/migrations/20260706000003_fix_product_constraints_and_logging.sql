-- 1. Fix Database Constraints
-- Ensure SKU is not unique (in case it was made unique in any previous migration)
-- Note: PostgreSQL doesn't have a direct "DROP UNIQUE" if it's not a named constraint,
-- but we can drop the index if it exists.
DO $$
BEGIN
    -- Drop unique index on sku if it exists
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'products' AND indexname = 'products_sku_key') THEN
        ALTER TABLE products DROP CONSTRAINT products_sku_key;
    END IF;
    -- Drop any other index that might be enforcing uniqueness
    DROP INDEX IF EXISTS idx_products_sku_unique;
END $$;

-- Ensure required columns allow NULLs to prevent sync rejection
ALTER TABLE products ALTER COLUMN description DROP NOT NULL;
ALTER TABLE products ALTER COLUMN category_id DROP NOT NULL;
ALTER TABLE products ALTER COLUMN brand_id DROP NOT NULL;
-- Note: 'brand' and 'category' (text columns) are already nullable by default.

-- 2. Create Sync Errors table for debugging
CREATE TABLE IF NOT EXISTS sync_errors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id text,
    entity_type text DEFAULT 'product',
    error_message text,
    payload jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS for sync_errors
ALTER TABLE sync_errors ENABLE ROW LEVEL SECURITY;

-- Service role can do everything, others nothing
CREATE POLICY "Service role full access on sync_errors"
ON sync_errors FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 3. Ensure product_variants matches CentralHub format and has stable unique key
-- Already handled in previous migration, but ensuring centralhub_variant_id is used for upserts
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='product_variants' AND column_name='centralhub_variant_id') THEN
        ALTER TABLE product_variants ADD COLUMN centralhub_variant_id uuid UNIQUE;
    END IF;
END $$;
