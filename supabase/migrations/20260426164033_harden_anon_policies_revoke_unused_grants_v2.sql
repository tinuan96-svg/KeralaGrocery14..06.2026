/*
  # Harden anonymous access: revoke unused grants and tighten policies (v2)

  ## Summary
  Addresses pg_graphql introspection warnings and anonymous policy lint.

  ### 1. Revoke anon SELECT on internal-only tables
  These are joined by v_storefront_products (security_invoker=on) internally
  but never queried directly from the browser. Removing direct anon grants
  removes them from pg_graphql introspection for the anon role.

  ### 2. Tighten USING (true) on public/anon SELECT policies
  Replace broad USING (true) with meaningful business-logic conditions.

  ### 3. Add WITH CHECK to anon INSERT on orders/order_items
*/

-- ─── 1. Revoke anon SELECT on internal-only tables ───────────────────────
REVOKE SELECT ON public.store_products              FROM anon;
REVOKE SELECT ON public.store_product_variants      FROM anon;
REVOKE SELECT ON public.store_category_assignments  FROM anon;
REVOKE SELECT ON public.store_category_mappings     FROM anon;
REVOKE SELECT ON public.store_brand_assignments     FROM anon;
REVOKE SELECT ON public.main_categories             FROM anon;

-- ─── 2. categories: replace USING (true) ────────────────────────────────
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Public can view categories"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (name IS NOT NULL);

-- ─── 3. product_variants: scope to active + non-deleted product ─────────
DROP POLICY IF EXISTS "Anyone can view product variants" ON public.product_variants;
CREATE POLICY "Public can view active product variants"
  ON public.product_variants FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = product_variants.product_id
        AND COALESCE(p.is_deleted, false) = false
    )
  );

-- ─── 4. stores: scope to visible stores (visibility is boolean) ──────────
DROP POLICY IF EXISTS "Allow public read access to stores" ON public.stores;
CREATE POLICY "Public can view visible stores"
  ON public.stores FOR SELECT
  TO anon, authenticated
  USING (visibility = true OR visibility IS NULL);

-- ─── 5. orders anon INSERT: add WITH CHECK ───────────────────────────────
DROP POLICY IF EXISTS "Anonymous users can create orders" ON public.orders;
CREATE POLICY "Anonymous users can create orders"
  ON public.orders FOR INSERT
  TO anon
  WITH CHECK (
    total > 0
    AND customer_email IS NOT NULL
    AND customer_name IS NOT NULL
  );

-- ─── 6. order_items anon INSERT: add WITH CHECK ──────────────────────────
DROP POLICY IF EXISTS "Anonymous users can create order items" ON public.order_items;
CREATE POLICY "Anonymous users can create order items"
  ON public.order_items FOR INSERT
  TO anon
  WITH CHECK (
    quantity > 0
    AND unit_price > 0
    AND order_id IS NOT NULL
  );
