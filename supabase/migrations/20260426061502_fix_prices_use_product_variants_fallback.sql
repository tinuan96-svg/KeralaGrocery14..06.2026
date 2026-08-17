/*
  # Fix zero prices — use product_variants as price source

  ## Problem
  keralagroceries.price, adjusted_price, store_products.price_override, and products.price
  are all 0 for most products. The real prices live in product_variants.price.

  ## Changes
  1. Drop and recreate v_storefront_products with product_variants price fallback
  2. Recreate get_homepage_section_products(uuid, text[]) with same price priority
*/

-- 1. Drop and recreate the storefront view
DROP VIEW IF EXISTS v_storefront_products;

CREATE VIEW v_storefront_products AS
SELECT
  k.id AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,
  k.brand,
  COALESCE(
    NULLIF(k.adjusted_price, 0),
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  ) AS effective_price,
  COALESCE(
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  ) AS original_price,
  COALESCE(k.adjusted_qnty, k.qnty) AS effective_stock,
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
  p.slug AS product_slug,
  COALESCE(sp.image_override, p.image_url) AS image_url
FROM keralagroceries k
LEFT JOIN products p ON p.id = k.product_id
LEFT JOIN store_products sp ON sp.product_id = k.product_id AND sp.store_id = k.store_id
LEFT JOIN store_categories sc ON sc.id = k.store_category_id
WHERE k.status = 'active';

-- 2. Update the homepage RPC
CREATE OR REPLACE FUNCTION public.get_homepage_section_products(
  p_store_id uuid,
  p_sections  text[]
)
RETURNS TABLE(
  section_name       text,
  sort_position      integer,
  product_id         uuid,
  product_name       text,
  product_slug       text,
  product_price      numeric,
  product_orig_price numeric,
  product_image      text,
  product_stock      integer,
  product_rating     numeric,
  product_reviews    integer,
  product_discount   numeric,
  cat_id             uuid,
  brd_id             uuid,
  cat_name           text,
  cat_slug           text,
  brd_name           text,
  brd_slug           text,
  brd_logo           text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
SELECT
  hsp.section_name,
  hsp.position                                                        AS sort_position,
  p.id                                                                AS product_id,
  COALESCE(sp.name_override, kg.product_display_name, p.name)        AS product_name,
  p.slug                                                              AS product_slug,
  COALESCE(
    NULLIF(sp.price_override, 0),
    NULLIF(kg.adjusted_price, 0),
    NULLIF(kg.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true AND pv.price > 0),
    p.price
  )                                                                   AS product_price,
  COALESCE(
    NULLIF(kg.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true AND pv.price > 0),
    p.original_price
  )                                                                   AS product_orig_price,
  COALESCE(sp.image_override, p.image_url)                           AS product_image,
  COALESCE(sp.current_stock, kg.adjusted_qnty, 0)::integer           AS product_stock,
  p.rating                                                            AS product_rating,
  p.review_count                                                      AS product_reviews,
  p.discount_percentage                                               AS product_discount,
  p.category_id                                                       AS cat_id,
  p.brand_id                                                          AS brd_id,
  c.name                                                              AS cat_name,
  c.slug                                                              AS cat_slug,
  b.name                                                              AS brd_name,
  b.slug                                                              AS brd_slug,
  b.logo_url                                                          AS brd_logo
FROM homepage_section_products hsp
JOIN products p
  ON p.id = hsp.product_id
 AND p.is_active = true
 AND p.is_deleted = false
LEFT JOIN keralagroceries kg
  ON kg.product_id = hsp.product_id
 AND kg.store_id   = hsp.store_id
LEFT JOIN store_products sp
  ON sp.product_id = hsp.product_id
 AND sp.store_id   = hsp.store_id
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN brands     b ON b.id = p.brand_id
WHERE hsp.store_id    = p_store_id
  AND hsp.section_name = ANY(p_sections)
  AND COALESCE(kg.status, 'active') = 'active'
  AND COALESCE(sp.current_stock, kg.adjusted_qnty, 1) > 0
ORDER BY hsp.section_name, hsp.position;
$$;
