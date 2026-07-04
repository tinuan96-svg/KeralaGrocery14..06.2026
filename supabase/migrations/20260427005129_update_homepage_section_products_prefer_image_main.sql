/*
  # Update get_homepage_section_products to prefer image_main

  Replaces COALESCE(sp.image_override, p.image_url) with a chain that
  prefers the clean processed image (p.image_main) first, then falls
  back through image_medium → store override → original image_url.

  This ensures products that have been through the image processing pipeline
  display their clean white-background images everywhere on the homepage.
*/

CREATE OR REPLACE FUNCTION public.get_homepage_section_products(
  p_store_id uuid,
  p_sections text[]
)
RETURNS TABLE (
  section_name    text,
  sort_position   int,
  product_id      uuid,
  product_name    text,
  product_slug    text,
  product_price   numeric,
  product_orig_price numeric,
  product_image   text,
  product_stock   int,
  product_rating  numeric,
  product_reviews int,
  product_discount numeric,
  cat_id          uuid,
  brd_id          uuid,
  cat_name        text,
  cat_slug        text,
  brd_name        text,
  brd_slug        text,
  brd_logo        text
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
    p.price
  )                                                                     AS product_price,
  COALESCE(
    NULLIF(kg.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true AND pv.price > 0),
    p.original_price
  )                                                                     AS product_orig_price,
  -- Prefer processed clean image → store override → original
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
