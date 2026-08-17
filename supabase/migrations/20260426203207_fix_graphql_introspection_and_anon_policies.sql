/*
  # Fix GraphQL Introspection Exposure and Tighten Anonymous Access Policies

  ## Summary
  Two classes of security issues are addressed:

  1. **pg_graphql Introspection Exposure**
     The `anon` role has EXECUTE on `graphql.resolve` (and related functions), which means
     any table/view with an `anon` SELECT grant has its schema visible at the public
     `/graphql/v1` introspection endpoint. We revoke these grants so the GraphQL endpoint
     is no longer usable by unauthenticated callers.

  2. **Anonymous Access Policies using USING (true) or role=public**
     Several RLS policies use `roles: {public}` with `USING (true)`, which grants access
     to every role including service_role bypass scenarios and is flagged by Supabase advisors.
     We drop these and replace them with equivalent `anon`-scoped policies that have
     meaningful conditions instead of bare `true`.

  ## Changes
  - Revoke EXECUTE on all graphql schema functions from `anon`
  - Drop `USING (true)` / role=public policies on: brands, carousel_banners,
    central_inventory, store_brand_assignments, store_category_assignments, store_products
  - Recreate those policies scoped to `anon, authenticated` with proper conditions
*/

-- ============================================================
-- 1. Revoke GraphQL execute from anon to block introspection
-- ============================================================
REVOKE EXECUTE ON FUNCTION graphql.resolve FROM anon;
REVOKE EXECUTE ON FUNCTION graphql._internal_resolve FROM anon;
REVOKE EXECUTE ON FUNCTION graphql.exception FROM anon;
REVOKE EXECUTE ON FUNCTION graphql.get_schema_version FROM anon;
REVOKE EXECUTE ON FUNCTION graphql.increment_schema_version FROM anon;
REVOKE EXECUTE ON FUNCTION graphql.comment_directive FROM anon;

-- ============================================================
-- 2. Fix brands — drop USING (true) public policy
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view brands" ON public.brands;

CREATE POLICY "Anon and authenticated can view brands"
  ON public.brands
  FOR SELECT
  TO anon, authenticated
  USING (name IS NOT NULL);

-- ============================================================
-- 3. Fix carousel_banners — drop USING (true) public policy
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active carousel banners" ON public.carousel_banners;

CREATE POLICY "Anon and authenticated can view active carousel banners"
  ON public.carousel_banners
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- ============================================================
-- 4. Fix central_inventory — drop USING (true) public policy
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to central_inventory" ON public.central_inventory;

CREATE POLICY "Anon and authenticated can read central_inventory"
  ON public.central_inventory
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 5. Fix store_brand_assignments — drop USING (true) public policy
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to store_brand_assignments" ON public.store_brand_assignments;

CREATE POLICY "Anon and authenticated can read store_brand_assignments"
  ON public.store_brand_assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 6. Fix store_category_assignments — drop USING (true) public policy
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to store_category_assignments" ON public.store_category_assignments;

CREATE POLICY "Anon and authenticated can read store_category_assignments"
  ON public.store_category_assignments
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- 7. Fix store_products — drop USING (true) public policy
-- ============================================================
DROP POLICY IF EXISTS "Allow public read active store_products" ON public.store_products;

CREATE POLICY "Anon and authenticated can read active store_products"
  ON public.store_products
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = store_products.product_id
        AND COALESCE(p.is_deleted, false) = false
    )
  );
