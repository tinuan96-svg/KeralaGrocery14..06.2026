/*
  # Resolve SECURITY DEFINER Warning for is_admin()

  ## Problem
  The `is_admin()` function is defined as `SECURITY DEFINER` in the `public` schema.
  Supabase flags this as a security risk because any authenticated user could
  potentially execute it via the RPC API (/rest/v1/rpc/is_admin).

  ## Solution
  1. Create a `private` schema for internal helper functions.
  2. Move the `SECURITY DEFINER` version of `is_admin()` (which checks the DB) to the `private` schema.
  3. Redefine `public.is_admin()` as a `SECURITY INVOKER` function that only checks the JWT metadata.
     This satisfies the security audit because it no longer runs with elevated privileges,
     while maintaining compatibility with existing RLS policies.
*/

-- ── 1. Create private schema ──────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS private;

-- ── 2. Move DB-checking logic to private schema ──────────────────────────────
-- This version remains SECURITY DEFINER for use in critical internal checks.
CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = uid AND (raw_app_meta_data->>'is_admin')::boolean = true
  );
END;
$$;

-- ── 3. Redefine public function as SECURITY INVOKER ──────────────────────────
-- This version uses auth.jwt() which is safe for any authenticated user to call.
-- It resolves the Supabase security warning.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true;
$$;

-- ── 4. Adjust permissions ─────────────────────────────────────────────────────
-- Revoke from public/anon to hide from unauthenticated RPC calls.
-- Keep for authenticated so RLS policies continue to work without modification.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

COMMENT ON FUNCTION public.is_admin() IS 'Helper for RLS. Uses JWT metadata for security-invoker compatibility.';
COMMENT ON FUNCTION private.is_admin() IS 'Secure admin check performing actual DB lookup. SECURITY DEFINER.';
