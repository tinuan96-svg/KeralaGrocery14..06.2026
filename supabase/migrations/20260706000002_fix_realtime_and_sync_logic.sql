-- 1. Robust Realtime Setup
DO $$
DECLARE
    tbl text;
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add tables safely
    FOR tbl IN SELECT unnest(ARRAY['products', 'product_variants'])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        END IF;
    END LOOP;
END $$;

-- 2. Ensure Replica Identity is FULL for detailed realtime payloads
ALTER TABLE products REPLICA IDENTITY FULL;
ALTER TABLE product_variants REPLICA IDENTITY FULL;

-- 3. Retroactively approve any remaining hidden products from CentralHub
UPDATE products
SET
    approval_status = 'approved',
    visibility_status = true
WHERE
    centralhub_product_id IS NOT NULL
    AND is_active = true
    AND (is_deleted = false OR is_deleted IS NULL)
    AND (approval_status != 'approved' OR visibility_status = false);
