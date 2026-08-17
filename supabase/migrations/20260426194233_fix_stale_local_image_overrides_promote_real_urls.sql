/*
  # Fix stale local image_override blocking real uploaded URLs

  When admins upload images via the product image picker, the URL is saved to
  products.image_url. However, some products have an old local path (e.g.
  /products/tasty-nibbles-prawns-roast-kg.jpg) stored in
  store_products.image_override, which takes priority in v_storefront_products
  and hides the real uploaded URL.

  This migration promotes the real Supabase storage URL into image_override
  for all products where:
  - image_override is a local path (not starting with http)
  - products.image_url is a real URL (starting with http)
*/

UPDATE store_products sp
SET image_override = p.image_url
FROM products p
WHERE p.id = sp.product_id
  AND sp.image_override IS NOT NULL
  AND sp.image_override NOT LIKE 'http%'
  AND p.image_url IS NOT NULL
  AND p.image_url LIKE 'http%';
