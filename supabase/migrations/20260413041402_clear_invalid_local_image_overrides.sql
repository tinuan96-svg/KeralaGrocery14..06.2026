/*
  # Clear invalid local path image_overrides from store_products

  ## Problem
  `store_products.image_override` contains local paths like `/products/xxx.jpg`
  that reference files which do not exist in the public directory.

  In `mapStoreProduct`, `image_override` is checked first:
    image_url = image_override ?? product.image_url ?? product.image_path ?? null

  So these stale local overrides take priority over the valid Supabase storage
  URLs that were just linked in `products.image_url`, causing placeholder images
  to show on the storefront.

  ## Fix
  Set `image_override = NULL` for any store_product row where the value starts
  with a local path (`/`) instead of an HTTP(S) URL. This allows the fallback
  chain to reach `products.image_url` which holds the correct storage URL.
*/

UPDATE public.store_products
SET image_override = NULL
WHERE image_override IS NOT NULL
  AND image_override NOT LIKE 'http://%'
  AND image_override NOT LIKE 'https://%';
