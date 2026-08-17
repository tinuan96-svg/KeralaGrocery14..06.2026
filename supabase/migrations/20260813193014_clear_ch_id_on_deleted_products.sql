/*
# Fix: clear centralhub_product_id on soft-deleted products

The sync edge function loads existing products with is_deleted = false.
43 products are soft-deleted but still have centralhub_product_id set.
When the sync tries to insert these as new products, it hits the unique
constraint on centralhub_product_id.

Fix: null out centralhub_product_id on soft-deleted products so the sync
can either re-link them or insert fresh copies.
*/

UPDATE products
SET centralhub_product_id = NULL
WHERE is_deleted = true
  AND centralhub_product_id IS NOT NULL;
