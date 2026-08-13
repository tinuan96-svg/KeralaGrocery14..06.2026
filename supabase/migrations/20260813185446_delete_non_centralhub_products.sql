/*
# Delete products not synced from CentralHub

1. Purpose
   - Permanently removes all product rows where `centralhub_product_id` is NULL.
   - These are legacy sample/seed products that were never synced from CentralHub.
   - All 30 affected rows are already soft-deleted (is_deleted = true), not visible
     to customers, and have zero references in orders, carts, images, variants,
     approval logs, or any other table.

2. Safety
   - All foreign keys referencing products(id) use ON DELETE CASCADE or ON DELETE SET NULL,
     so no orphaned rows will remain in child tables.
   - Verified before deletion: 0 references in order_items, cart, product_gallery_images,
     product_variants, approval_logs, image_processing_jobs, price_history,
     media_product_links, image_upload_logs, image_protection_log.

3. Result
   - Products table retains only the 839 CentralHub-synced products.
*/

DELETE FROM products WHERE centralhub_product_id IS NULL;
