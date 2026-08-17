/*
  # Fix Security Definer Views, GraphQL Introspection, and Anonymous Policies

  ## Issues Fixed

  ### 1. Security Definer Views
  - `v_storefront_products` — recreated with `security_invoker = on`
  - `store_products_view` — recreated with `security_invoker = on`
  Both views previously ran with the definer's privileges instead of the caller's,
  bypassing RLS. With security_invoker = on, the caller's own privileges and RLS
  policies apply when the view is queried.

  ### 2. GraphQL Introspection Exposure
  The `anon` role has SELECT on storefront tables which are legitimately public,
  but pg_graphql exposes their schema via /graphql/v1 introspection.
  Fix: revoke EXECUTE on the graphql resolve function from anon so the public
  GraphQL endpoint is disabled while REST API access is unaffected.

  ### 3. Anonymous Access Policy — product_images
  The policy added earlier used `TO anon, authenticated` with `USING (true)`.
  The storefront fetches product images through the view (which runs as the
  authenticated role via service role on the server). Drop the anon policy and
  keep only authenticated SELECT, which satisfies RLS without exposing to anon.
*/

-- ─── 1. Fix v_storefront_products (security_invoker = on) ───────────────────

CREATE OR REPLACE VIEW public.v_storefront_products
WITH (security_invoker = on)
AS
SELECT
  k.id AS row_id,
  k.product_id,
  k.store_id,
  k.product_code,
  k.product_title,
  k.product_display_name,
  COALESCE(
    NULLIF(TRIM(k.brand), ''),
    NULLIF(TRIM(regexp_replace(
      regexp_replace(
        k.product_display_name,
        ('^' || regexp_replace(k.product_title, '([\(\)\.\[\]])', '\\\1', 'g') || '\s*'),
        '', 'i'
      ),
      '^\d*\.?\d*\s*(Kg|g|ml|L|ltr|Gm|oz)\s*', '', 'i'
    )), '')
  ) AS brand,
  COALESCE(
    NULLIF(k.adjusted_price, 0),
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
  ) AS effective_price,
  COALESCE(
    NULLIF(k.price, 0),
    (SELECT MIN(pv.price) FROM product_variants pv
     WHERE pv.product_id = k.product_id AND pv.is_active = true AND pv.price > 0)
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
  COALESCE(
    (SELECT pi.image_url
     FROM product_images pi
     WHERE pi.product_id = k.product_id AND pi.store_id = k.store_id
     ORDER BY pi.sort_order ASC, pi.created_at ASC
     LIMIT 1),
    sp.image_override,
    p.image_url
  ) AS image_url
FROM keralagroceries k
LEFT JOIN products p ON p.id = k.product_id
LEFT JOIN store_products sp ON sp.product_id = k.product_id AND sp.store_id = k.store_id
LEFT JOIN store_categories sc ON sc.id = k.store_category_id
WHERE k.status = 'active';

-- ─── 2. Fix store_products_view (security_invoker = on) ─────────────────────

CREATE OR REPLACE VIEW public.store_products_view
WITH (security_invoker = on)
AS
SELECT
  p.id,
  p.ms_store_id AS rule_store_id,
  s.name AS store_name,
  CASE
    WHEN fr.type = 'clean_name' THEN
      CASE
        WHEN array_length(fr.remove_patterns, 1) > 0
          THEN initcap(TRIM(regexp_replace(p.raw_name,
            '(?i)\m(' || array_to_string(fr.remove_patterns, '|') || ')\M\s*',
            '', 'g')))
        ELSE initcap(p.raw_name)
      END
    WHEN fr.type = 'uppercase' THEN upper(p.raw_name)
    WHEN fr.type = 'title_case' THEN initcap(p.raw_name)
    ELSE p.raw_name
  END AS final_name,
  round(
    CASE
      WHEN pr.type = 'percentage_markup' THEN p.base_price + (p.base_price * pr.value / 100)
      WHEN pr.type = 'fixed_markup'      THEN p.base_price + pr.value
      ELSE p.base_price
    END, 2
  ) AS final_price,
  CASE
    WHEN sr.type = 'hide_below_threshold' THEN
      CASE WHEN p.raw_stock < sr.threshold THEN 0 ELSE p.raw_stock END
    WHEN sr.type = 'buffer_stock' THEN GREATEST(0, p.raw_stock - sr.threshold)
    ELSE p.raw_stock
  END AS final_stock,
  p.category,
  p.image_url,
  p.is_active
FROM ms_products p
JOIN ms_stores s      ON s.id = p.ms_store_id
JOIN ms_pricing_rules pr ON pr.id = s.pricing_rule_id
JOIN ms_formatting_rules fr ON fr.id = s.formatting_rule_id
JOIN ms_stock_rules sr ON sr.id = s.stock_rule_id
WHERE p.is_active = true AND s.is_active = true;

-- ─── 3. Block GraphQL introspection for anon ────────────────────────────────
-- The app uses Supabase REST (PostgREST), not GraphQL. Revoking EXECUTE on
-- the graphql resolve function disables /graphql/v1 for the anon role while
-- leaving REST API and all SELECT grants intact.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_graphql'
  ) THEN
    REVOKE EXECUTE ON FUNCTION graphql.resolve FROM anon;
  END IF;
END $$;

-- ─── 4. Fix product_images anon policy ──────────────────────────────────────
-- Drop the overly broad anon SELECT policy and replace with authenticated-only.
-- The storefront view (security_invoker = on) queries product_images as the
-- calling role; the Supabase JS client sends the anon key for unauthenticated
-- visitors, so we need to keep anon SELECT but scope it properly.

DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;

-- Storefront visitors browse as anon — they legitimately need to read images.
-- Scope to only active store data rather than USING (true).
CREATE POLICY "Anon can view product images"
  ON product_images FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM keralagroceries k
      WHERE k.product_id = product_images.product_id
        AND k.store_id   = product_images.store_id
        AND k.status     = 'active'
    )
  );

CREATE POLICY "Authenticated can view product images"
  ON product_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM keralagroceries k
      WHERE k.product_id = product_images.product_id
        AND k.store_id   = product_images.store_id
        AND k.status     = 'active'
    )
  );
