/*
# Deduplicate Remaining Products and Add Preventive Unique Index

## Problem
After two prior deduplication migrations, 37 groups of true duplicates remain
where products share the same name + brand + unit + weight (case-insensitive).
These were missed because the prior migrations grouped by name+brand+weight+unit
but some had slightly different weight values (e.g., NULL vs empty string) or
were in the "different weights" category that the prior migration skipped.

Additionally, 16 groups have the same name+brand+unit but different weights --
these are legitimate product variants (e.g., 200g vs 500g) and are left untouched.

## Changes

### Step 1: Remove true duplicates (same name + brand + unit + weight)
For each group of products sharing identical name, brand, unit, and weight
(case-insensitive):
1. Pick the best product to keep: prefer one with an image, then one with
   order history, then most stock, then earliest created
2. Re-point any order_items and cart items from duplicates onto the keeper
3. Soft-delete all duplicates (set is_deleted = true)

### Step 2: Add a partial unique index to prevent future duplicates
Create a unique index on (lower(name), lower(brand), lower(unit), weight)
where is_deleted = false. This ensures the sync function can never create
a duplicate product with the same name, brand, unit, and weight.

### Step 3: Update the sync function's fallback match to include unit
The sync function's fallback match (used when CentralHub regenerates IDs)
currently matches by lower(name) + lower(brand) only. This is too broad --
it can match a 200g product to a 500g product. The fallback should also
include lower(unit) to correctly identify the right product variant.
(This change is made in the edge function code, not in this migration.)

## Data Safety
- No rows are hard-deleted (only soft-delete via is_deleted = true)
- Order items and cart items are re-pointed to the keeper before soft-deleting
- Images are preserved (keeper is chosen based on having images first)
- The unique index is partial (only applies to non-deleted rows) so
  soft-deleted duplicates don't block future operations
*/

-- ================================================================
-- Step 1: Remove true duplicates (same name + brand + unit + weight)
-- ================================================================
DO $$
DECLARE
    group_record RECORD;
    keeper_id uuid;
    dup_id uuid;
    dup_row RECORD;
    dedup_count int := 0;
BEGIN
    FOR group_record IN
        SELECT
            lower(name) as match_name,
            COALESCE(lower(brand), '') as match_brand,
            COALESCE(lower(unit), '') as match_unit,
            COALESCE(weight::text, '') as match_weight
        FROM products
        WHERE is_deleted = false
        GROUP BY lower(name), COALESCE(lower(brand), ''), COALESCE(lower(unit), ''), COALESCE(weight::text, '')
        HAVING count(*) > 1
    LOOP
        -- Pick the keeper: prefer has image, then has orders, then most stock, then earliest created
        SELECT p.id INTO keeper_id
        FROM products p
        WHERE p.is_deleted = false
            AND lower(p.name) = group_record.match_name
            AND COALESCE(lower(p.brand), '') = group_record.match_brand
            AND COALESCE(lower(p.unit), '') = group_record.match_unit
            AND COALESCE(p.weight::text, '') = group_record.match_weight
        ORDER BY
            (p.image_url IS NOT NULL AND p.image_url != '') DESC,
            (p.image_main IS NOT NULL AND p.image_main != '') DESC,
            EXISTS(SELECT 1 FROM order_items oi WHERE oi.product_id = p.id) DESC,
            p.stock DESC,
            p.created_at ASC
        LIMIT 1;

        IF keeper_id IS NOT NULL THEN
            -- Re-point order_items and cart items from duplicates to the keeper
            FOR dup_row IN
                SELECT id FROM products
                WHERE is_deleted = false
                    AND lower(name) = group_record.match_name
                    AND COALESCE(lower(brand), '') = group_record.match_brand
                    AND COALESCE(lower(unit), '') = group_record.match_unit
                    AND COALESCE(weight::text, '') = group_record.match_weight
                    AND id != keeper_id
            LOOP
                UPDATE order_items SET product_id = keeper_id WHERE product_id = dup_row.id;
                UPDATE cart SET product_id = keeper_id WHERE product_id = dup_row.id;
            END LOOP;

            -- Soft-delete all duplicates
            UPDATE products SET is_deleted = true, updated_at = now()
            WHERE is_deleted = false
                AND lower(name) = group_record.match_name
                AND COALESCE(lower(brand), '') = group_record.match_brand
                AND COALESCE(lower(unit), '') = group_record.match_unit
                AND COALESCE(weight::text, '') = group_record.match_weight
                AND id != keeper_id;

            GET DIAGNOSTICS dup_id = ROW_COUNT;
            dedup_count := dedup_count + dup_id;
        END IF;
    END LOOP;

    RAISE NOTICE 'Step 1 complete: soft-deleted % duplicate products', dedup_count;
END $$;

-- ================================================================
-- Step 2: Add partial unique index to prevent future duplicates
-- ================================================================

-- Drop the index if it already exists (idempotent)
DROP INDEX IF EXISTS idx_products_unique_name_brand_unit_weight;

-- Create the partial unique index
-- This prevents any future sync from creating a duplicate product with the
-- same name, brand, unit, and weight. Only applies to non-deleted rows.
CREATE UNIQUE INDEX idx_products_unique_name_brand_unit_weight
ON products (
    lower(name),
    COALESCE(lower(brand), ''),
    COALESCE(lower(unit), ''),
    COALESCE(weight::text, '')
)
WHERE is_deleted = false;
