/*
# Delete old synced products, keep only the latest CentralHub sync

1. Purpose
   - Permanently removes all products synced before 2026-08-13.
   - The latest CentralHub sync on 2026-08-13 imported 468 products with new
     centralhub_product_ids, replacing the old catalog (370 from 2026-05-29 + 1 from 2026-07-09).
   - Old and new syncs have zero overlapping centralhub_product_ids.

2. Safety
   - order_items stores product_name, product_image, unit_price, total_price directly,
     so order history is fully preserved even after the product rows are deleted.
     The order_items.product_id FK uses ON DELETE SET NULL, so order records stay intact.
   - cart FK uses ON DELETE CASCADE — 2 cart entries for old products will be removed.
   - product_gallery_images FK uses ON DELETE CASCADE — 448 gallery entries cleaned up.
   - approval_logs FK uses ON DELETE SET NULL — 712 log entries stay with null product_id.
   - All other FKs use CASCADE or SET NULL, no orphaned rows.

3. Result
   - Products table retains only the 468 products from the 2026-08-13 sync.
*/

DELETE FROM products WHERE DATE(created_at) < '2026-08-13';
