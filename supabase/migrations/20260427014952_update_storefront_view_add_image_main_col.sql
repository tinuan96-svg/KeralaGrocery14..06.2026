/*
  # Update v_storefront_products: add image_main column and prefer it in image_url

  Drops and recreates the view to add image_main as a new column while keeping
  all existing columns in the same order (image_url still last, image_main added before it).
*/

DROP VIEW IF EXISTS public.v_storefront_products;

CREATE VIEW public.v_storefront_products
WITH (security_invoker = false)
AS
SELECT
  k.id                        AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,
  COALESCE(
    NULLIF(TRIM(k.brand), ''),
    NULLIF(TRIM(regexp_replace(regexp_replace(
      k.product_display_name,
      ('^' || regexp_replace(k.product_title, '([\\(\\)\\.\\[\\]])', '\\\\\\1', 'g')) || '\\s*',
      '', 'i'),
      '^\\d*\\.?\\d*\\s*(Kg|g|ml|L|ltr|Gm|oz)\\s*', '', 'i')), '')
  )                           AS brand,
  COALESCE(
    NULLIF(k.adjusted_price, 0),
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  )                           AS effective_price,
  COALESCE(
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  )                           AS original_price,
  COALESCE(k.adjusted_qnty, k.qnty)  AS effective_stock,
  k.qnty,
  k.adjusted_qnty,
  k.unit,
  k.weight,
  COALESCE(k.category_name_original, k.category_name) AS display_category,
  k.mapped_category_name,
  k.category_name,
  k.main_category,
  k.parent_category,
  k.product_description,
  k.seo_title,
  k.seo_keywords,
  k.seo_description,
  k.status,
  k.backorder_enabled,
  k.created_at,
  p.slug                      AS product_slug,
  -- NEW: expose the processed clean image directly
  NULLIF(p.image_main, '')    AS image_main,
  -- image_url: prefers clean processed image, then product_images, then overrides
  COALESCE(
    NULLIF(p.image_main, ''),
    (SELECT pi.image_url FROM product_images pi
     WHERE pi.product_id = k.product_id AND pi.store_id = k.store_id
     ORDER BY pi.sort_order, pi.created_at LIMIT 1),
    NULLIF(sp.image_override, ''),
    NULLIF(p.image_url, '')
  )                           AS image_url
FROM keralagroceries k
LEFT JOIN products p         ON p.id = k.product_id
LEFT JOIN store_products sp  ON sp.product_id = k.product_id AND sp.store_id = k.store_id
LEFT JOIN store_categories sc ON sc.id = k.store_category_id
WHERE k.status = 'active';

-- Restore anon read access (was on original view)
GRANT SELECT ON public.v_storefront_products TO anon, authenticated;
