/*
  # Hide products with no resolvable image from the storefront

  ## Problem
  Products with no valid https:// image in any source column appear in the
  storefront listing as placeholder grey boxes, which looks broken and
  unprofessional. These products should be hidden until an image is uploaded.

  ## Fix
  Add a WHERE condition to v_storefront_products that requires at least one
  candidate image column to contain an absolute http/https URL. The check
  mirrors the COALESCE priority order exactly:
    1. store_products.image_cdn_url  LIKE 'http%'
    2. store_products.image_override LIKE 'http%'
    3. products.image_main           LIKE 'http%'
    4. product_images.image_url      LIKE 'http%'  (any row for that product/store)
    5. products.image_url            LIKE 'http%'

  Products re-appear automatically as soon as a valid image is uploaded/set —
  no code change required.

  ## Scope
  View definition only — no table data is modified.
*/

DROP VIEW IF EXISTS v_storefront_products;

CREATE VIEW v_storefront_products
WITH (security_invoker = false)
AS
SELECT
  k.id                                           AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,

  COALESCE(
    NULLIF(TRIM(k.brand), ''),
    NULLIF(TRIM(
      regexp_replace(
        regexp_replace(
          k.product_display_name,
          ('^' || regexp_replace(k.product_title, '([\(\)\.\[\]])', '\\\1', 'g') || '\s*'),
          '', 'i'
        ),
        '^\d*\.?\d*\s*(Kg|g|ml|L|ltr|Gm|oz)\s*', '', 'i'
      )
    ), '')
  )                                              AS brand,

  COALESCE(
    NULLIF(k.adjusted_price, 0),
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  )                                              AS effective_price,

  COALESCE(
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  )                                              AS original_price,

  COALESCE(k.adjusted_qnty, k.qnty)             AS effective_stock,
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
  p.slug                                         AS product_slug,

  -- raw columns exposed for admin/debug (may contain stale relative paths)
  NULLIF(sp.image_cdn_url, '')                   AS image_cdn_url,
  NULLIF(sp.image_override, '')                  AS image_override,
  NULLIF(p.image_main, '')                       AS image_main,

  -- canonical resolved image — absolute URLs only, in priority order
  COALESCE(
    CASE WHEN sp.image_cdn_url LIKE 'http%' THEN NULLIF(sp.image_cdn_url, '') END,
    CASE WHEN sp.image_override LIKE 'http%' THEN NULLIF(sp.image_override, '') END,
    CASE WHEN p.image_main     LIKE 'http%' THEN NULLIF(p.image_main,     '') END,
    (SELECT pi.image_url
     FROM product_images pi
     WHERE pi.product_id = k.product_id
       AND pi.store_id   = k.store_id
       AND pi.image_url  LIKE 'http%'
     ORDER BY pi.sort_order, pi.created_at
     LIMIT 1),
    CASE WHEN p.image_url LIKE 'http%' THEN NULLIF(p.image_url, '') END
  )                                              AS image_url

FROM keralagroceries k
LEFT JOIN products       p  ON p.id          = k.product_id
LEFT JOIN store_products sp ON sp.product_id = k.product_id
                            AND sp.store_id   = k.store_id
LEFT JOIN store_categories sc ON sc.id       = k.store_category_id
WHERE k.status = 'active'
  -- Only show products that have at least one resolvable absolute image URL.
  -- Products reappear automatically once a valid image is uploaded.
  AND (
    sp.image_cdn_url LIKE 'http%'
    OR sp.image_override LIKE 'http%'
    OR p.image_main      LIKE 'http%'
    OR p.image_url       LIKE 'http%'
    OR EXISTS (
      SELECT 1 FROM product_images pi
      WHERE pi.product_id = k.product_id
        AND pi.store_id   = k.store_id
        AND pi.image_url  LIKE 'http%'
    )
  );

GRANT SELECT ON v_storefront_products TO anon, authenticated;
