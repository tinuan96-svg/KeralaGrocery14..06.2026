/*
  # Create carousel_banners table

  ## Summary
  Creates a dedicated table for homepage hero carousel banners, separate from
  the existing `banners` table (which stores homepage section configurations).

  ## New Tables
  - `carousel_banners`
    - `id` (uuid, primary key)
    - `title` (text, required) — headline displayed on the banner
    - `subtitle` (text, nullable) — secondary text shown below the title
    - `image_url` (text, nullable) — full URL to the banner background image
    - `cta_text` (text, nullable) — call-to-action button label
    - `cta_link` (text, nullable) — URL the CTA button links to
    - `is_active` (boolean, default true) — controls homepage visibility
    - `display_order` (integer, default 0) — sort order in the carousel
    - `created_at` (timestamptz, default now())

  ## Security
  - RLS enabled; only authenticated admins (via is_admin()) may INSERT/UPDATE/DELETE
  - Public (anon) SELECT allowed for active banners to power the homepage carousel
*/

CREATE TABLE IF NOT EXISTS carousel_banners (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  subtitle      text,
  image_url     text,
  cta_text      text,
  cta_link      text DEFAULT '/products',
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE carousel_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active carousel banners"
  ON carousel_banners FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can view all carousel banners"
  ON carousel_banners FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.email IN (
          SELECT email FROM auth.users
          WHERE raw_app_meta_data->>'role' = 'admin'
        )
    )
    OR (SELECT is_active FROM carousel_banners cb WHERE cb.id = carousel_banners.id)
  );

CREATE POLICY "Admins can insert carousel banners"
  ON carousel_banners FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_admin() FROM (SELECT 1) t)
  );

CREATE POLICY "Admins can update carousel banners"
  ON carousel_banners FOR UPDATE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_admin() FROM (SELECT 1) t)
  )
  WITH CHECK (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_admin() FROM (SELECT 1) t)
  );

CREATE POLICY "Admins can delete carousel banners"
  ON carousel_banners FOR DELETE
  TO authenticated
  USING (
    (SELECT raw_app_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'admin'
    OR (SELECT is_admin() FROM (SELECT 1) t)
  );

CREATE INDEX IF NOT EXISTS idx_carousel_banners_active_order
  ON carousel_banners (is_active, display_order);
