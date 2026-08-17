/*
  # Dynamic Banner Products Function

  Creates get_dynamic_banner_products — fetches products for all 5 homepage
  banners in one round-trip. Deduplication is done in priority order:
  top_sellers → new_arrivals → ready_foods → featured → random.

  Each banner returns up to p_limit products (default 8).
*/

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

GRANT EXECUTE ON FUNCTION public.get_dynamic_banner_products(uuid, int) TO authenticated, anon;
