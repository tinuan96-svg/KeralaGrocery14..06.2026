/*
  # Canonical image resolution order — single source of truth (v2)

  ## Problem
  The view resolved images as: image_main → product_images → image_override → image_url
  store_products overrides were checked AFTER products.image_main, making per-store
  image management ineffective.

  ## Canonical order (enforced everywhere after this migration)
  1. store_products.image_cdn_url   — uploaded/CDN image (highest priority)
  2. store_products.image_override  — manual per-store override
  3. products.image_main            — processed global image
  4. product_images.image_url       — first row by sort_order, created_at
  5. products.image_url             — base fallback (lowest priority)

  ## Changes
  1. Drop + recreate v_storefront_products with:
     - Correct COALESCE order for image_url
     - Explicit image_cdn_url and image_override columns exposed for frontend
  2. Recreate replace_product_image RPC to write ONLY store_products.image_cdn_url
     - Stops writing image_override (now a separate manual-override path)
     - Stops touching products.image_url (CDN upload wins above it in the view)

  ## Security
  - SELECT re-granted to anon + authenticated after view recreation
  - RPC restricted to authenticated only (no anon/public execute)
*/

-- ============================================================
-- 1. Drop and recreate the view (column set changed)
-- ============================================================
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

  -- raw columns exposed individually (frontend can consume directly)
  NULLIF(sp.image_cdn_url, '')                   AS image_cdn_url,
  NULLIF(sp.image_override, '')                  AS image_override,
  NULLIF(p.image_main, '')                       AS image_main,

  -- canonical resolved image — single COALESCE in correct priority order
  COALESCE(
    NULLIF(sp.image_cdn_url, ''),
    NULLIF(sp.image_override, ''),
    NULLIF(p.image_main, ''),
    (SELECT pi.image_url
     FROM product_images pi
     WHERE pi.product_id = k.product_id
       AND pi.store_id   = k.store_id
     ORDER BY pi.sort_order, pi.created_at
     LIMIT 1),
    NULLIF(p.image_url, '')
  )                                              AS image_url

FROM keralagroceries k
LEFT JOIN products       p  ON p.id          = k.product_id
LEFT JOIN store_products sp ON sp.product_id = k.product_id
                            AND sp.store_id   = k.store_id
LEFT JOIN store_categories sc ON sc.id       = k.store_category_id
WHERE k.status = 'active';

GRANT SELECT ON v_storefront_products TO anon, authenticated;


-- ============================================================
-- 2. Simplify replace_product_image — write only image_cdn_url
-- ============================================================
CREATE OR REPLACE FUNCTION replace_product_image(
  p_product_id    uuid,
  p_store_id      uuid,
  p_new_image_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE store_products
  SET
    image_cdn_url = p_new_image_url,
    updated_at    = now()
  WHERE product_id = p_product_id
    AND store_id   = p_store_id;

  -- Upsert if no row exists yet
  IF NOT FOUND THEN
    INSERT INTO store_products (product_id, store_id, image_cdn_url, updated_at)
    VALUES (p_product_id, p_store_id, p_new_image_url, now())
    ON CONFLICT (product_id, store_id) DO UPDATE
      SET image_cdn_url = EXCLUDED.image_cdn_url,
          updated_at    = now();
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION replace_product_image(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION replace_product_image(uuid, uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION replace_product_image(uuid, uuid, text) TO authenticated;
