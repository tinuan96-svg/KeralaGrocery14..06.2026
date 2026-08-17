/*
  # Revert display_category to use original category_name

  ## Summary
  Products on the storefront should show their original internal category names
  (e.g. "Achar & Preserves", "Chaaya & Coffee") rather than the mapped store_categories names.
  This updates v_storefront_products so display_category returns the raw category_name.
*/

CREATE OR REPLACE VIEW v_storefront_products AS
SELECT
  k.id AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,
  k.brand,
  COALESCE(k.adjusted_price, k.price) AS effective_price,
  k.price AS original_price,
  k.adjusted_price,
  COALESCE(k.adjusted_qnty, k.qnty) AS effective_stock,
  k.qnty,
  k.adjusted_qnty,
  k.unit,
  k.weight,
  k.category_name AS display_category,
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
