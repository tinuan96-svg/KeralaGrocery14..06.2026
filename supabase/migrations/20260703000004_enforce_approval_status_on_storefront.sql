/*
  # Enforce Product Approval Status on Storefront

  ## Purpose
  This migration updates storefront-facing views and functions to strictly filter products by `approval_status = 'approved'` and `visibility_status = true`.
  This ensures that when a product is moved to 'draft', it immediately disappears from all parts of the website (listings, banners, and search).

  ## Changes
  1. Updates `v_storefront_products` view to include approval filters.
  2. Updates `get_homepage_section_products` RPC to include approval filters.
  3. Updates `get_dynamic_banner_products` RPC to include approval filters.
  4. Re-runs the bulk reset to 'draft' for all products.
*/

-- 1. Reset all products to draft (Safety re-run)
UPDATE products
SET
  approval_status = 'draft',
  visibility_status = false,
  approved_at = NULL,
  approved_by = NULL,
  updated_at = now()
WHERE is_deleted = false;

-- 2. Update v_storefront_products View
CREATE OR REPLACE VIEW public.v_storefront_products AS
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
JOIN products       p  ON p.id          = k.product_id
LEFT JOIN store_products sp ON sp.product_id = k.product_id
                            AND sp.store_id   = k.store_id
LEFT JOIN store_categories sc ON sc.id       = k.store_category_id
WHERE k.status = 'active'
  AND p.approval_status = 'approved'    -- <<< CRUCIAL FILTER
  AND p.visibility_status = true        -- <<< CRUCIAL FILTER
  AND p.is_deleted = false
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

-- 3. Update get_homepage_section_products Function
CREATE OR REPLACE FUNCTION public.get_homepage_section_products(
  p_store_id uuid,
  p_sections text[] DEFAULT NULL
)
RETURNS TABLE (
  section_name            text,
  sort_position           integer,
  product_id              uuid,
  product_name            text,
  product_slug            text,
  product_price           numeric,
  product_orig_price      numeric,
  product_image           text,
  product_stock           integer,
  product_rating          numeric,
  product_reviews         integer,
  product_discount        numeric,
  cat_id                  uuid,
  brd_id                  uuid,
  cat_name                text,
  cat_slug                text,
  brd_name                text,
  brd_slug                text,
  brd_logo                text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
SELECT
  hsp.section_name,
  hsp.position                                                          AS sort_position,
  p.id                                                                  AS product_id,
  COALESCE(sp.name_override, kg.product_display_name, p.name)          AS product_name,
  p.slug                                                                AS product_slug,
  COALESCE(
    NULLIF(sp.price_override, 0),
    NULLIF(kg.adjusted_price, 0),
    NULLIF(kg.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true AND pv.price > 0),
    NULLIF(p.price, 0)
  )                                                                     AS product_price,
  COALESCE(
    NULLIF(kg.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true AND pv.price > 0),
    NULLIF(p.original_price, 0),
    NULLIF(p.price, 0)
  )                                                                     AS product_orig_price,
  COALESCE(
    NULLIF(p.image_main, ''),
    NULLIF(p.image_medium, ''),
    NULLIF(sp.image_override, ''),
    NULLIF(p.image_url, '')
  )                                                                     AS product_image,
  COALESCE(sp.current_stock, kg.adjusted_qnty, 0)::integer             AS product_stock,
  p.rating                                                              AS product_rating,
  p.review_count                                                        AS product_reviews,
  p.discount_percentage                                                 AS product_discount,
  p.category_id                                                         AS cat_id,
  p.brand_id                                                            AS brd_id,
  c.name                                                                AS cat_name,
  c.slug                                                                AS cat_slug,
  b.name                                                                AS brd_name,
  b.slug                                                                AS brd_slug,
  b.logo_url                                                            AS brd_logo
FROM homepage_section_products hsp
JOIN products p
  ON p.id = hsp.product_id
  AND p.is_active = true
  AND p.is_deleted = false
  AND p.approval_status = 'approved'    -- <<< CRUCIAL FILTER
  AND p.visibility_status = true        -- <<< CRUCIAL FILTER
LEFT JOIN keralagroceries kg
  ON kg.product_id = hsp.product_id
  AND kg.store_id   = hsp.store_id
LEFT JOIN store_products sp
  ON sp.product_id = hsp.product_id
  AND sp.store_id   = hsp.store_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN brands     b ON b.id = p.brand_id
WHERE hsp.store_id    = p_store_id
  AND (p_sections IS NULL OR hsp.section_name = ANY(p_sections))
  AND COALESCE(kg.status, 'active') = 'active'
  -- Exclude products with no resolvable price
  AND COALESCE(
    NULLIF(sp.price_override, 0),
    NULLIF(kg.adjusted_price, 0),
    NULLIF(kg.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true AND pv.price > 0),
    NULLIF(p.price, 0)
  ) IS NOT NULL
ORDER BY hsp.section_name, hsp.position;
$$;

-- 4. Update get_dynamic_banner_products Function
CREATE OR REPLACE FUNCTION public.get_dynamic_banner_products(
  p_store_id uuid,
  p_limit    int DEFAULT 8
)
RETURNS TABLE (
  banner_name        text,
  product_id         uuid,
  product_name       text,
  product_slug       text,
  product_price      numeric,
  product_orig_price numeric,
  product_image      text,
  product_stock      int,
  product_discount   int,
  cat_id             uuid,
  cat_name           text,
  cat_slug           text,
  brd_id             uuid,
  brd_name           text,
  brd_slug           text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH
eligible AS (
  SELECT
    p.id                                                                   AS pid,
    COALESCE(sp.name_override, kg.product_display_name, p.name)           AS product_name,
    p.slug,
    COALESCE(
      NULLIF(sp.price_override, 0),
      NULLIF(kg.adjusted_price, 0),
      NULLIF(kg.price, 0),
      p.price
    )                                                                      AS price,
    COALESCE(NULLIF(kg.price, 0), p.original_price)                       AS orig_price,
    COALESCE(sp.image_override, p.image_main, p.image_url)                AS image_url,
    COALESCE(sp.current_stock, kg.adjusted_qnty, 0)::int                  AS stock,
    COALESCE(p.discount_percentage, 0)::int                               AS discount,
    p.category_id,
    p.brand_id,
    p.sold_count,
    p.created_at,
    p.is_featured,
    c.name  AS cat_name,
    c.slug  AS cat_slug,
    b.name  AS brd_name,
    b.slug  AS brd_slug
  FROM products p
  JOIN store_products sp ON sp.product_id = p.id AND sp.store_id = p_store_id
  LEFT JOIN keralagroceries kg ON kg.product_id = p.id AND kg.store_id = p_store_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN brands     b ON b.id = p.brand_id
  WHERE p.is_active  = true
    AND p.is_deleted = false
    AND p.approval_status = 'approved'    -- <<< CRUCIAL FILTER
    AND p.visibility_status = true        -- <<< CRUCIAL FILTER
    AND sp.is_active = true
    AND COALESCE(sp.current_stock, kg.adjusted_qnty, 1) > 0
    AND COALESCE(kg.status, 'active') = 'active'
),

b1 AS (
  SELECT 'top_sellers'::text AS banner_name, e.*
  FROM eligible e
  ORDER BY COALESCE(e.sold_count, 0) DESC, e.created_at DESC
  LIMIT p_limit
),

b2 AS (
  SELECT 'new_arrivals'::text AS banner_name, e.*
  FROM eligible e
  WHERE e.pid NOT IN (SELECT b1.pid FROM b1)
  ORDER BY e.created_at DESC
  LIMIT p_limit
),

b3 AS (
  SELECT 'ready_foods'::text AS banner_name, e.*
  FROM eligible e
  WHERE e.pid NOT IN (SELECT b1.pid FROM b1 UNION ALL SELECT b2.pid FROM b2)
    AND e.category_id = '7db8ad5a-9ca5-43b4-a7fd-0f76b6abe633'::uuid
  ORDER BY COALESCE(e.sold_count, 0) DESC, e.created_at DESC
  LIMIT p_limit
),

b4 AS (
  SELECT 'featured'::text AS banner_name, e.*
  FROM eligible e
  WHERE e.pid NOT IN (
    SELECT b1.pid FROM b1 UNION ALL SELECT b2.pid FROM b2 UNION ALL SELECT b3.pid FROM b3
  )
    AND e.is_featured = true
  ORDER BY e.created_at DESC
  LIMIT p_limit
),

b5 AS (
  SELECT 'random_picks'::text AS banner_name, e.*
  FROM eligible e
  WHERE e.pid NOT IN (
    SELECT b1.pid FROM b1 UNION ALL SELECT b2.pid FROM b2
    UNION ALL SELECT b3.pid FROM b3 UNION ALL SELECT b4.pid FROM b4
  )
  ORDER BY random()
  LIMIT p_limit
)

SELECT
  banner_name,
  pid          AS product_id,
  product_name,
  slug         AS product_slug,
  price        AS product_price,
  orig_price   AS product_orig_price,
  image_url    AS product_image,
  stock        AS product_stock,
  discount     AS product_discount,
  category_id  AS cat_id,
  cat_name,
  cat_slug,
  brand_id     AS brd_id,
  brd_name,
  brd_slug
FROM (
  SELECT * FROM b1
  UNION ALL SELECT * FROM b2
  UNION ALL SELECT * FROM b3
  UNION ALL SELECT * FROM b4
  UNION ALL SELECT * FROM b5
) combined
ORDER BY banner_name, product_name;
$$;
