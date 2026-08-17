/*
  # Fix: get_product_variants — remove SECURITY DEFINER, revoke broad EXECUTE grants

  ## Problem
  `public.get_product_variants(p_variant_group_id uuid)` is defined as SECURITY DEFINER,
  meaning it runs with the privileges of the function owner (postgres/superuser) rather
  than the calling role. Both `anon` and `authenticated` have EXECUTE on it, so any
  client can call it via /rest/v1/rpc/get_product_variants with elevated privileges.

  ## Why it is safe to switch to SECURITY INVOKER
  The function body only reads `products` with strict filters:
    - is_deleted = false
    - approval_status = 'approved'
    - visibility_status = true
  The existing RLS policies on `products` already grant anon and authenticated users
  SELECT on rows matching exactly these same conditions. SECURITY INVOKER will produce
  identical results — RLS applies normally — without privilege escalation.

  ## Changes
  1. Recreate the function as SECURITY INVOKER (drops the privilege escalation vector).
  2. Revoke EXECUTE from anon and authenticated (the function is already called by the
     frontend via the Supabase client which uses the anon key; the client-side
     rpcApiClient.ts queries products directly and does NOT call this RPC, so removing
     these grants has no user-visible effect).
  3. Keep EXECUTE for service_role and postgres so server-side admin calls still work.
*/

-- Recreate as SECURITY INVOKER — identical logic, no privilege escalation
CREATE OR REPLACE FUNCTION public.get_product_variants(p_variant_group_id uuid)
RETURNS TABLE(
  id              uuid,
  name            text,
  slug            text,
  variant_size    text,
  variant_weight_g numeric,
  variant_unit    text,
  price           numeric,
  compare_price   numeric,
  image_url       text,
  image_main      text,
  in_stock        boolean
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.slug,
    p.variant_size,
    p.variant_weight_g,
    p.variant_unit,
    p.price,
    p.compare_price,
    p.image_url,
    p.image_main,
    (COALESCE(p.stock, 0) > 0)
  FROM products p
  WHERE p.variant_group_id = p_variant_group_id
    AND p.is_deleted = false
    AND p.approval_status = 'approved'
    AND p.visibility_status = true
  ORDER BY p.variant_weight_g NULLS LAST, p.variant_size NULLS LAST;
END;
$$;

-- Revoke EXECUTE from roles that should not call this directly via RPC
REVOKE EXECUTE ON FUNCTION public.get_product_variants(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_product_variants(uuid) FROM authenticated;
