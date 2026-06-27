/*
  # Harden Security: Revoke Anon EXECUTE, Fix SECURITY DEFINER View, Fix Bucket Listing

  ## Summary
  This migration addresses three categories of security issues:

  1. **SECURITY DEFINER View** - `v_storefront_products` is rebuilt as SECURITY INVOKER
     so it runs with the caller's privileges rather than the owner's elevated privileges.

  2. **Storage Bucket Listing** - The broad `Public read product-images-clean files` policy
     that allows anyone to list all files in the bucket is replaced with a more restrictive
     policy scoped to authenticated users only.

  3. **Anon EXECUTE on all public functions** - Every function in the public schema has been
     granted EXECUTE to the `anon` role (a Postgres default for PUBLIC). This is revoked
     for all functions. Only the two functions explicitly needed by the frontend storefront
     are re-granted: `get_homepage_section_products` (both overloads) and
     `get_dynamic_banner_products`.

  ## Security Changes
  - Revoke EXECUTE on all public.* functions from `anon`
  - Re-grant EXECUTE only on storefront-facing functions to `anon`
  - Re-grant EXECUTE on all functions to `authenticated` (for admin/logged-in users)
  - Drop the broad public listing policy on `product-images-clean`
  - Recreate the listing policy scoped to authenticated users only
  - Set `v_storefront_products` to SECURITY INVOKER

  ## Important Notes
  - Trigger functions do NOT need direct EXECUTE grants from external roles
  - `is_admin` is kept for authenticated only (used in RLS policies via security definer)
  - The two overloads of get_homepage_section_products use different signatures
*/

-- ============================================================
-- 1. Fix v_storefront_products to SECURITY INVOKER
-- ============================================================
ALTER VIEW public.v_storefront_products SET (security_invoker = true);

-- ============================================================
-- 2. Fix storage bucket listing policy for product-images-clean
-- ============================================================
DROP POLICY IF EXISTS "Public read product-images-clean files" ON storage.objects;

CREATE POLICY "Authenticated can read product-images-clean files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images-clean'
    AND name IS NOT NULL
    AND name <> ''
  );

-- ============================================================
-- 3. Revoke EXECUTE on ALL public schema functions from anon
-- ============================================================
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- ============================================================
-- 4. Re-grant only storefront-facing functions to anon
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_homepage_section_products(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_homepage_section_products(uuid, text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_dynamic_banner_products(uuid, integer) TO anon;

-- ============================================================
-- 5. Re-grant all functions to authenticated
-- ============================================================
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
