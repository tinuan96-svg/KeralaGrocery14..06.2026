/*
  # Optimize Admin RLS & JWT Claims

  ## Improvements
  1. Updated `is_admin()` to use JWT claims directly, avoiding unnecessary `auth.users` table scans in RLS policies.
  2. Added `set_admin_status(user_id, status)` function to allow admins to manage other admins safely.
  3. Standardized RLS logic for better performance.
*/

-- 1. Optimize is_admin() to use JWT claims first
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Use the JWT claim if available (extremely fast)
  IF (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true THEN
    RETURN true;
  END IF;

  -- If called from a non-JWT context (like a cron or direct SQL),
  -- we might want to check the DB, but for RLS, false is a safe default if no JWT.
  RETURN false;
END;
$$;

-- 2. Helper to set admin status (requires existing admin or service_role)
CREATE OR REPLACE FUNCTION set_admin_status(target_user_id uuid, is_admin_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Only allow if the caller is an admin OR it's a service role
  IF NOT (public.is_admin() OR (auth.role() = 'service_role')) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can manage admin status';
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data =
    COALESCE(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('is_admin', is_admin_status)
  WHERE id = target_user_id;
END;
$$;

-- Grant execute to authenticated users (it has internal security checks)
GRANT EXECUTE ON FUNCTION set_admin_status(uuid, boolean) TO authenticated;
