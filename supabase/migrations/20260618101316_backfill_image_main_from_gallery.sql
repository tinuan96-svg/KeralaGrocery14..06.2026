-- Backfill image_main on products that have no valid HTTP image in the main
-- fields but DO have a valid image in product_gallery_images.
-- This is a one-time fix; future syncs should populate image_main directly.
UPDATE products p
SET image_main = (
  SELECT COALESCE(pgi.enhanced_image_url, pgi.image_url)
  FROM product_gallery_images pgi
  WHERE pgi.product_id = p.id
    AND (pgi.enhanced_image_url LIKE 'http%' OR pgi.image_url LIKE 'http%')
  ORDER BY pgi.position ASC
  LIMIT 1
)
WHERE (p.image_main IS NULL OR p.image_main NOT LIKE 'http%')
  AND (p.enhanced_image_url IS NULL OR p.enhanced_image_url NOT LIKE 'http%')
  AND (p.image_url IS NULL OR p.image_url NOT LIKE 'http%')
  AND p.approval_status = 'approved'
  AND p.visibility_status = true
  AND p.is_active = true
  AND EXISTS (
    SELECT 1 FROM product_gallery_images pgi2
    WHERE pgi2.product_id = p.id
      AND (pgi2.enhanced_image_url LIKE 'http%' OR pgi2.image_url LIKE 'http%')
  );