/*
  # Fix Security Issues: Policies, Duplicate Index, and Function Search Paths

  ## 1. Duplicate Index on product_variants
  - Drops constraint `uq_product_variants_product_variant_name` (which creates the
    duplicate index) because an identical unique constraint already exists as
    `product_variants_product_id_variant_name_uidx`.

  ## 2. Multiple Permissive Policies on product_variants
  - Drops "Authenticated users can insert product variants" — too broad, conflicts
    with the admin-scoped FOR ALL policy.
  - Drops "Authenticated users can view product variants" — replaced with a public
    SELECT policy covering both anon and authenticated roles.

  ## 3. RLS Policy Always True on brands
  - Drops "Authenticated users can create brands" which had WITH CHECK (true).
  - Adds admin-only INSERT policy.

  ## 4. Function Search Path Mutable (13 functions)
  - Fixes search_path injection risk on all flagged trigger/utility functions.
*/

-- 1. Drop duplicate constraint (this also drops the duplicate index)
ALTER TABLE public.product_variants
  DROP CONSTRAINT IF EXISTS uq_product_variants_product_variant_name;

-- 2. Fix multiple permissive policies on product_variants
DROP POLICY IF EXISTS "Authenticated users can insert product variants" ON public.product_variants;
DROP POLICY IF EXISTS "Authenticated users can view product variants" ON public.product_variants;

CREATE POLICY "Anyone can view product variants"
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Fix brands INSERT policy (was WITH CHECK (true) — unrestricted)
DROP POLICY IF EXISTS "Authenticated users can create brands" ON public.brands;

CREATE POLICY "Admins can create brands"
  ON public.brands
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((( SELECT auth.jwt() AS jwt) ->> 'app_metadata'::text)::jsonb ->> 'role'::text) = 'admin'::text
  );

-- 4. Fix mutable search paths on all flagged functions
ALTER FUNCTION public.compute_store_product_price(uuid, uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.compute_store_product_stock_override(uuid, uuid) SET search_path = public, pg_catalog;
ALTER FUNCTION public.delete_disabled_store_product() SET search_path = public, pg_catalog;
ALTER FUNCTION public.enforce_variable_product_has_variants() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_central_inventory_refresh_store_stock() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_pricing_rules_refresh_store_prices() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_products_refresh_store_names() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_products_refresh_store_prices() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_store_products_refresh_name() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_store_products_refresh_price() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_store_products_refresh_stock() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_store_settings_refresh_store_names() SET search_path = public, pg_catalog;
ALTER FUNCTION public.trg_stores_refresh_store_stock() SET search_path = public, pg_catalog;
