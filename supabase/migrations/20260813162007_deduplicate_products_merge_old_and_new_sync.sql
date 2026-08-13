/*
# Deduplicate Products: Merge Old Sync Into New CentralHub IDs

## Problem
CentralHub regenerated its product IDs between the May-June sync and the August 13 sync.
The sync function matches products exclusively by centralhub_product_id, so all 468
new-sync products were inserted as new rows instead of updating the 371 existing products.
This created 146 duplicate products (same name+brand) and left 225 orphaned old products.

## Changes
1. For each name+brand group (case-insensitive) that has both old and new products:
   - Pick the best old product as "keeper" (prefers products with images, then orders, then earliest created)
   - Pick the best new product as "CH ID donor" (prefers most stock, then earliest created)
   - Null out the donor's centralhub_product_id to free the unique constraint
   - Update the keeper: set centralhub_product_id = donor's CH ID, copy synced fields (price, stock, weight, unit, etc.)
   - Soft-delete all other products in the group (both old and new)
2. For old products with no new match (orphaned - no longer in CentralHub): soft-delete them
3. For new-only groups with exact duplicates (same name+brand+weight+unit): keep one, soft-delete rest

## Data Safety
- No rows are deleted (only soft-delete via is_deleted = true)
- Order items and cart items remain linked to their original product IDs (the keeper)
- Images are preserved on the keeper (old products had images, new didn't)
- The unique constraint on centralhub_product_id is respected by nulling donor before updating keeper
*/

DO $$
DECLARE
    group_record RECORD;
    best_old RECORD;
    best_new RECORD;
    donor_ch_id text;
    other_row RECORD;
    merged_count int := 0;
    orphaned_count int := 0;
    ch_dup_count int := 0;
BEGIN
    -- ================================================================
    -- STEP 1: Merge matched groups (both old and new products by name+brand)
    -- ================================================================
    FOR group_record IN
        SELECT
            lower(name) as match_name,
            COALESCE(lower(brand), '') as match_brand
        FROM products
        WHERE is_deleted = false
        GROUP BY lower(name), COALESCE(lower(brand), '')
        HAVING
            bool_or(last_sync_at < '2026-08-13 15:00:00')
            AND bool_or(last_sync_at > '2026-08-13 15:00:00')
    LOOP
        -- Pick best old product: prefer has image, then has orders, then earliest created
        SELECT p.* INTO best_old
        FROM products p
        WHERE p.is_deleted = false
            AND p.last_sync_at < '2026-08-13 15:00:00'
            AND lower(p.name) = group_record.match_name
            AND COALESCE(lower(p.brand), '') = group_record.match_brand
        ORDER BY
            (p.image_url IS NOT NULL AND p.image_url != '') DESC,
            (p.image_main IS NOT NULL AND p.image_main != '') DESC,
            EXISTS(SELECT 1 FROM order_items oi WHERE oi.product_id = p.id) DESC,
            p.created_at ASC
        LIMIT 1;

        -- Pick best new product: prefer most stock, then earliest created
        SELECT p.* INTO best_new
        FROM products p
        WHERE p.is_deleted = false
            AND p.last_sync_at > '2026-08-13 15:00:00'
            AND lower(p.name) = group_record.match_name
            AND COALESCE(lower(p.brand), '') = group_record.match_brand
        ORDER BY
            p.stock DESC,
            p.created_at ASC
        LIMIT 1;

        IF best_old IS NOT NULL AND best_new IS NOT NULL THEN
            -- Save the donor's CH ID
            donor_ch_id := best_new.centralhub_product_id;

            -- Null out donor's CH ID to free the unique constraint
            UPDATE products
            SET centralhub_product_id = NULL
            WHERE id = best_new.id;

            -- Update the keeper with the new CH ID and synced fields from the new product
            UPDATE products SET
                centralhub_product_id = donor_ch_id,
                source_name = best_new.source_name,
                source_brand = best_new.source_brand,
                brand = best_new.brand,
                supplier_price = best_new.supplier_price,
                cost_price = best_new.cost_price,
                selling_price = best_new.selling_price,
                price = best_new.price,
                stock = best_new.stock,
                in_stock = best_new.in_stock,
                unit = best_new.unit,
                weight = best_new.weight,
                weight_grams = best_new.weight_grams,
                warehouse_location = best_new.warehouse_location,
                department = best_new.department,
                main_category = best_new.main_category,
                category = best_new.category,
                sub_category = best_new.sub_category,
                product_type = best_new.product_type,
                sku = CASE WHEN best_old.sku IS NULL OR best_old.sku = '' THEN best_new.sku ELSE best_old.sku END,
                last_sync_at = best_new.last_sync_at,
                updated_at = now(),
                is_active = true,
                is_deleted = false
            WHERE id = best_old.id;

            -- Soft-delete the new product (its data has been merged into the old keeper)
            UPDATE products SET is_deleted = true, updated_at = now()
            WHERE id = best_new.id;

            -- Soft-delete all other old products in this group
            UPDATE products SET is_deleted = true, updated_at = now()
            WHERE is_deleted = false
                AND last_sync_at < '2026-08-13 15:00:00'
                AND lower(name) = group_record.match_name
                AND COALESCE(lower(brand), '') = group_record.match_brand
                AND id != best_old.id;

            -- Soft-delete all other new products in this group
            UPDATE products SET is_deleted = true, updated_at = now()
            WHERE is_deleted = false
                AND last_sync_at > '2026-08-13 15:00:00'
                AND lower(name) = group_record.match_name
                AND COALESCE(lower(brand), '') = group_record.match_brand
                AND id != best_new.id;

            merged_count := merged_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Step 1 complete: merged % groups', merged_count;

    -- ================================================================
    -- STEP 2: Soft-delete orphaned old products (no new match by name+brand)
    -- ================================================================
    UPDATE products SET is_deleted = true, updated_at = now()
    WHERE is_deleted = false
        AND last_sync_at < '2026-08-13 15:00:00'
        AND NOT EXISTS (
            SELECT 1 FROM products p2
            WHERE p2.is_deleted = false
                AND p2.last_sync_at > '2026-08-13 15:00:00'
                AND lower(p2.name) = lower(products.name)
                AND COALESCE(lower(p2.brand), '') = COALESCE(lower(products.brand), '')
        );

    GET DIAGNOSTICS orphaned_count = ROW_COUNT;
    RAISE NOTICE 'Step 2 complete: soft-deleted % orphaned old products', orphaned_count;

    -- ================================================================
    -- STEP 3: Deduplicate CentralHub internal duplicates among new-only products
    -- (same name+brand+weight+unit, no old match)
    -- ================================================================
    FOR group_record IN
        SELECT
            lower(name) as match_name,
            COALESCE(lower(brand), '') as match_brand,
            COALESCE(weight::text, '') as match_weight,
            COALESCE(lower(unit), '') as match_unit
        FROM products
        WHERE is_deleted = false
            AND last_sync_at > '2026-08-13 15:00:00'
        GROUP BY lower(name), COALESCE(lower(brand), ''), COALESCE(weight::text, ''), COALESCE(lower(unit), '')
        HAVING count(*) > 1
    LOOP
        -- Keep the one with most stock, soft-delete the rest
        FOR other_row IN
            SELECT id FROM products
            WHERE is_deleted = false
                AND last_sync_at > '2026-08-13 15:00:00'
                AND lower(name) = group_record.match_name
                AND COALESCE(lower(brand), '') = group_record.match_brand
                AND COALESCE(weight::text, '') = group_record.match_weight
                AND COALESCE(lower(unit), '') = group_record.match_unit
            ORDER BY stock DESC, created_at ASC
            OFFSET 1
        LOOP
            UPDATE products SET is_deleted = true, updated_at = now()
            WHERE id = other_row.id;
            ch_dup_count := ch_dup_count + 1;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Step 3 complete: soft-deleted % CentralHub internal duplicates', ch_dup_count;
END $$;
