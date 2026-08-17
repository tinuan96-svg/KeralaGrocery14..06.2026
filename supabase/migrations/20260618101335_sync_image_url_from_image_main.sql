-- Also sync image_url to match image_main for products where image_url is missing/invalid
-- but image_main was just populated from the gallery backfill.
UPDATE products
SET image_url = image_main
WHERE image_main LIKE 'http%'
  AND (image_url IS NULL OR image_url NOT LIKE 'http%')
  AND approval_status = 'approved'
  AND visibility_status = true
  AND is_active = true;