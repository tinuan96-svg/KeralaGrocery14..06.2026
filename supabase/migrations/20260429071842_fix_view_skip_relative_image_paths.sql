/*
  # Skip relative/local image paths in v_storefront_products

  ## Problem
  store_products.image_cdn_url and store_products.image_override contain stale
  relative paths like /products/haldirams-sweet-para-200g.jpg from before the
  CDN upload pipeline was set up. These win the COALESCE over products.image_main
  (which holds valid https:// URLs), causing the storefront to resolve image_url
  to a path that doesn't exist on the deployed frontend host.

  ## Fix
  Recreate v_storefront_products so every candidate in the COALESCE is guarded by
  a LIKE 'http%' check — identical to the startsWith('http') guard in the frontend.
  This way image_url is always either a valid absolute URL or NULL (which the
  frontend replaces with the placeholder).

  ## Columns affected
  - store_products.image_cdn_url — now only used when it starts with 'http'
  - store_products.image_override — now only used when it starts with 'http'
  - products.image_main           — unchanged (already always https://)
  - product_images.image_url      — now only used when it starts with 'http'
  - products.image_url            — now only used when it starts with 'http'

  The raw columns (image_cdn_url, image_override, image_main) are still exposed
  as-is so the admin can see and correct stale values.

  ## No data changes — view definition only
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

  -- raw columns exposed individually (admin/debug use)
  NULLIF(sp.image_cdn_url, '')                   AS image_cdn_url,
  NULLIF(sp.image_override, '')                  AS image_override,
  NULLIF(p.image_main, '')                       AS image_main,

  -- canonical resolved image — every candidate must be an absolute URL (http/https)
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
WHERE k.status = 'active';

GRANT SELECT ON v_storefront_products TO anon, authenticated;
