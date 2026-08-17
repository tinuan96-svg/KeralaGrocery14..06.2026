/*
  # Fix brand extraction in v_storefront_products view

  ## Problem
  Some keralagroceries rows have a null `brand` column even though the brand name
  is encoded inside `product_display_name` (format: "Product Title weightUnit BrandName").
  The view was returning NULL brand for those products.

  ## Fix
  Update the view to COALESCE `k.brand` with a brand extracted from
  `product_display_name` by:
    1. Stripping the leading product_title
    2. Stripping the weight+unit token (e.g. "0Kg", "1Kg", "Kg")
    3. Returning what remains as the brand (or NULL if nothing is left)

  This makes the brand column reliable for all products where the display name
  was populated correctly by the import process.
*/

CREATE OR REPLACE VIEW v_storefront_products
WITH (security_invoker = true)
AS
SELECT
  k.id                                                          AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,

  -- Prefer explicit brand; fall back to brand extracted from product_display_name
  COALESCE(
    NULLIF(trim(k.brand), ''),
    NULLIF(
      trim(
        regexp_replace(
          regexp_replace(
            k.product_display_name,
            '^' || regexp_replace(k.product_title, '([\(\)\.\[\]])', '\\\1', 'g') || '\s*',
            '',
            'i'
          ),
          '^\d*\.?\d*\s*(Kg|g|ml|L|ltr|Gm|oz)\s*',
          '',
          'i'
        )
      ),
      ''
    )
  )                                                             AS brand,

  COALESCE(
    NULLIF(k.adjusted_price, 0),
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  )                                                             AS effective_price,

  COALESCE(
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  )                                                             AS original_price,

  COALESCE(k.adjusted_qnty, k.qnty)                           AS effective_stock,
  k.qnty,
  k.adjusted_qnty,
  k.unit,
  k.weight,

  COALESCE(k.category_name_original, k.category_name)         AS display_category,
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

  p.slug                                                        AS product_slug,
  COALESCE(sp.image_override, p.image_url)                    AS image_url

FROM keralagroceries k
LEFT JOIN products p       ON p.id = k.product_id
LEFT JOIN store_products sp ON sp.product_id = k.product_id AND sp.store_id = k.store_id
LEFT JOIN store_categories sc ON sc.id = k.store_category_id
WHERE k.status = 'active';
