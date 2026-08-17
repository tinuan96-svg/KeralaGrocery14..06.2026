/*
# Deduplicate Products: Remove Remaining True Duplicates

## Problem
After the first deduplication migration, 33 groups of true duplicates remain where
products share the same name+brand+weight+unit (case-insensitive). These were missed
because:
- Brand casing differs (e.g., "Double Horse" vs "Double horse")
- Both products were in the old sync group (no new product to trigger the merge)
- Both products were new products with different CH IDs but identical attributes

## Changes
For each group of products sharing the same name+brand+weight+unit (case-insensitive):
1. Pick the best product: prefer one with an image, then one with order history, then most stock
2. Merge any order_items and cart references from duplicates onto the keeper
3. Soft-delete all other products in the group

## Data Safety
- No rows are hard-deleted (only soft-delete via is_deleted = true)
- Order items and cart items are re-pointed to the keeper before soft-deleting duplicates
- Images are preserved (keeper is chosen based on having images first)
*/

DO $$
DECLARE
    group_record RECORD;
    keeper_id uuid;
    dup_id uuid;
    dup_row RECORD;
BEGIN
    FOR group_record IN
        SELECT
            lower(name) as match_name,
            COALESCE(lower(brand), '') as match_brand,
            COALESCE(weight::text, '') as match_weight,
            COALESCE(lower(unit), '') as match_unit
        FROM products
        WHERE is_deleted = false
        GROUP BY lower(name), COALESCE(lower(brand), ''), COALESCE(weight::text, ''), COALESCE(lower(unit), '')
        HAVING count(*) > 1
    LOOP
        -- Pick the keeper: prefer has image, then has orders, then most stock, then earliest created
        SELECT p.id INTO keeper_id
        FROM products p
        WHERE p.is_deleted = false
            AND lower(p.name) = group_record.match_name
            AND COALESCE(lower(p.brand), '') = group_record.match_brand
            AND COALESCE(p.weight::text, '') = group_record.match_weight
            AND COALESCE(lower(p.unit), '') = group_record.match_unit
        ORDER BY
            (p.image_url IS NOT NULL AND p.image_url != '') DESC,
            (p.image_main IS NOT NULL AND p.image_main != '') DESC,
            EXISTS(SELECT 1 FROM order_items oi WHERE oi.product_id = p.id) DESC,
            p.stock DESC,
            p.created_at ASC
        LIMIT 1;

        IF keeper_id IS NOT NULL THEN
            -- Re-point order_items from duplicates to the keeper
            FOR dup_row IN
                SELECT id FROM products
                WHERE is_deleted = false
                    AND lower(name) = group_record.match_name
                    AND COALESCE(lower(brand), '') = group_record.match_brand
                    AND COALESCE(weight::text, '') = group_record.match_weight
                    AND COALESCE(lower(unit), '') = group_record.match_unit
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
                AND COALESCE(weight::text, '') = group_record.match_weight
                AND COALESCE(lower(unit), '') = group_record.match_unit
                AND id != keeper_id;
        END IF;
    END LOOP;
END $$;
