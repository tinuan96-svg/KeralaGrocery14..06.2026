/*
  # Keralagroceries storefront view

  1. View: v_storefront_products
    - Joins keralagroceries + products (slug) + store_products (image_override)
    - Exposes all fields the frontend needs in one flat row
    - Only active rows (status = 'active')
    - effective_price: COALESCE(adjusted_price, price)
    - effective_stock: COALESCE(adjusted_qnty, qnty)
    - display_category: COALESCE(mapped_category_name, category_name)
    - image_url: COALESCE(sp.image_override, p.image_url)

  2. Notes
    - The anon policy on keralagroceries was already added in a prior migration.
    - product_slug from products table is used for the detail page URL.
*/

CREATE OR REPLACE VIEW public.v_storefront_products AS
SELECT
  k.id                                                        AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,
  k.brand,
  COALESCE(k.adjusted_price, k.price)                         AS effective_price,
  k.price                                                     AS original_price,
  k.adjusted_price,
  COALESCE(k.adjusted_qnty, k.qnty)                          AS effective_stock,
  k.qnty,
  k.adjusted_qnty,
  k.unit,
  k.weight,
  COALESCE(k.mapped_category_name, k.category_name)          AS display_category,
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
  p.slug                                                      AS product_slug,
  COALESCE(sp.image_override, p.image_url)                   AS image_url
FROM public.keralagroceries k
LEFT JOIN public.products p
  ON p.id = k.product_id
LEFT JOIN public.store_products sp
  ON sp.product_id = k.product_id
  AND sp.store_id   = k.store_id
WHERE k.status = 'active';
