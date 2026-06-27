/*
  # Fix carousel_banners RLS infinite recursion

  ## Problem
  The "Admins can view all carousel banners" SELECT policy contains a self-referential
  subquery: `SELECT cb.is_active FROM carousel_banners cb WHERE cb.id = carousel_banners.id`
  This causes PostgreSQL error 42P17 (infinite recursion detected in policy) on every
  SELECT query against carousel_banners, flooding the network with 500 errors.

  ## Fix
  Drop and recreate all 5 carousel_banners policies using only:
  - `is_admin()` (already SECURITY DEFINER, reads from auth.jwt() app_metadata, no table queries)
  - Direct `auth.users` lookups (not user_profiles) to avoid any potential cross-table recursion

  The admin SELECT policy is simplified to use is_admin() only, removing the self-reference entirely.
*/

-- Drop all existing policies on carousel_banners
DROP POLICY IF EXISTS "Admins can view all carousel banners" ON carousel_banners;
DROP POLICY IF EXISTS "Anyone can view active carousel banners" ON carousel_banners;
DROP POLICY IF EXISTS "Admins can insert carousel banners" ON carousel_banners;
DROP POLICY IF EXISTS "Admins can update carousel banners" ON carousel_banners;
DROP POLICY IF EXISTS "Admins can delete carousel banners" ON carousel_banners;

-- Public read: anyone can see active banners
CREATE POLICY "Anyone can view active carousel banners"
  ON carousel_banners
  FOR SELECT
  USING (is_active = true);

-- Admin read: admins can see all banners (uses is_admin() which reads JWT, no table scan)
CREATE POLICY "Admins can view all carousel banners"
  ON carousel_banners
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admin insert
CREATE POLICY "Admins can insert carousel banners"
  ON carousel_banners
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admin update
CREATE POLICY "Admins can update carousel banners"
  ON carousel_banners
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin delete
CREATE POLICY "Admins can delete carousel banners"
  ON carousel_banners
  FOR DELETE
  TO authenticated
  USING (is_admin());
