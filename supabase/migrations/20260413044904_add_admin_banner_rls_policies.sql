/*
  # Add admin RLS policies for banners table

  ## Changes
  - Allow admins to SELECT all banners (including inactive ones)
  - Allow admins to INSERT new banners
  - Allow admins to UPDATE banners
  - Allow admins to DELETE banners

  ## Security
  - Uses the existing is_admin() function to restrict access to admin users only
*/

CREATE POLICY "Admins can view all banners"
  ON banners FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can insert banners"
  ON banners FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update banners"
  ON banners FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete banners"
  ON banners FOR DELETE
  TO authenticated
  USING (public.is_admin());
