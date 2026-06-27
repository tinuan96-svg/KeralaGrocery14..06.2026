/*
  # Create get_homepage_section_products function

  Returns homepage section products for the keralagroceries store by joining:
    - homepage_section_products (section assignment + sort_position)
    - keralagroceries (authoritative price, stock, status)
    - store_products (image_override, name_override)
    - products (slug, rating, review_count, discount_percentage)
    - categories + brands

  Only returns active products with stock > 0.
*/

CREATE OR REPLACE FUNCTION get_homepage_section_products(
  p_store_id uuid,
  p_sections text[]
)
RETURNS TABLE (
  section_name        text,
  sort_position       integer,
  product_id          uuid,
  product_name        text,
  product_slug        text,
  product_price       numeric,
  product_orig_price  numeric,
  product_image       text,
  product_stock       integer,
  product_rating      numeric,
  product_reviews     integer,
  product_discount    numeric,
  cat_id              uuid,
  brd_id              uuid,
  cat_name            text,
  cat_slug            text,
  brd_name            text,
  brd_slug            text,
  brd_logo            text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    hsp.section_name,
    hsp.position                                                 AS sort_position,
    p.id                                                         AS product_id,
    COALESCE(sp.name_override, kg.product_display_name, p.name) AS product_name,
    p.slug                                                       AS product_slug,
    COALESCE(kg.adjusted_price, sp.price_override, p.price)     AS product_price,
    p.original_price                                             AS product_orig_price,
    COALESCE(sp.image_override, p.image_url)                    AS product_image,
    COALESCE(kg.adjusted_qnty, sp.current_stock, 0)::integer    AS product_stock,
    p.rating                                                     AS product_rating,
    p.review_count                                               AS product_reviews,
    p.discount_percentage                                        AS product_discount,
    p.category_id                                                AS cat_id,
    p.brand_id                                                   AS brd_id,
    c.name                                                       AS cat_name,
    c.slug                                                       AS cat_slug,
    b.name                                                       AS brd_name,
    b.slug                                                       AS brd_slug,
    b.logo_url                                                   AS brd_logo
  FROM homepage_section_products hsp
  JOIN products p
    ON p.id = hsp.product_id
   AND p.is_active = true
   AND p.is_deleted = false
  LEFT JOIN keralagroceries kg
    ON kg.product_id = hsp.product_id
   AND kg.store_id = hsp.store_id
  LEFT JOIN store_products sp
    ON sp.product_id = hsp.product_id
   AND sp.store_id = hsp.store_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN brands b     ON b.id = p.brand_id
  WHERE hsp.store_id = p_store_id
    AND hsp.section_name = ANY(p_sections)
    AND COALESCE(kg.status, 'active') = 'active'
    AND COALESCE(kg.adjusted_qnty, sp.current_stock, 1) > 0
  ORDER BY hsp.section_name, hsp.position;
$$;
