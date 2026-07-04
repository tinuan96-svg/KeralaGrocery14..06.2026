-- Retroactively approve all products that were synced from CentralHub
-- and are currently active/not deleted.
UPDATE products
SET
    approval_status = 'approved',
    visibility_status = true
WHERE
    centralhub_product_id IS NOT NULL
    AND is_active = true
    AND (is_deleted = false OR is_deleted IS NULL);
