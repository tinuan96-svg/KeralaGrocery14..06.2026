/*
  # Clear Stale Local Image Overrides

  ## Problem
  284 store_products rows have image_override set to stale local paths
  (e.g. /products/xyz.webp) from a previous build that no longer exist.
  These non-null local paths block the COALESCE in v_storefront_products
  from falling through to products.image_url, which contains real bucket URLs.

  ## Fix
  NULL out every image_override that starts with '/' (local path).
  The view COALESCE order is: product_images → image_override → products.image_url
  After this migration, products will show their products.image_url images again.
*/

UPDATE store_products
SET image_override = NULL
WHERE store_id = 'a2e4d9f9-6b51-4071-97eb-decf72485b5a'
  AND image_override LIKE '/%';
