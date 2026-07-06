/*
  # Add Product Gallery Images Table

  ## Summary
  Replaces the single-image model with a multi-image gallery system.

  ## New Tables
  - `product_gallery_images`
    - `id` (uuid, PK)
    - `product_id` (uuid, FK → products, cascade delete)
    - `image_url` (text) — original uploaded URL
    - `enhanced_image_url` (text, nullable) — AI-enhanced version
    - `thumbnail_url` (text, nullable) — auto-generated 300px thumbnail
    - `position` (int) — display order; 0 = primary image
    - `is_primary` (bool) — denormalised flag for quick lookup
    - `original_image_url` (text, nullable) — immutable raw upload, never overwritten
    - `image_processing_status` (text) — pending | processing | completed | failed
    - `image_processed_at` (timestamptz, nullable)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Anon/authenticated SELECT (storefront reads)
  - Admin (via is_admin() function) full write access
  - Service role bypass for edge functions
*/

CREATE TABLE IF NOT EXISTS product_gallery_images (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id               uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url                text NOT NULL,
  enhanced_image_url       text,
  thumbnail_url            text,
  original_image_url       text,
  position                 integer NOT NULL DEFAULT 0,
  is_primary               boolean NOT NULL DEFAULT false,
  image_processing_status  text NOT NULL DEFAULT 'pending'
                             CHECK (image_processing_status IN ('pending','processing','completed','failed')),
  image_processed_at       timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gallery_product_id   ON product_gallery_images(product_id);
CREATE INDEX IF NOT EXISTS idx_gallery_position     ON product_gallery_images(product_id, position);

ALTER TABLE product_gallery_images ENABLE ROW LEVEL SECURITY;

-- Storefront: anon can read gallery images
CREATE POLICY "Anon can read gallery images"
  ON product_gallery_images FOR SELECT
  TO anon
  USING (true);

-- Authenticated users can read
CREATE POLICY "Authenticated can read gallery images"
  ON product_gallery_images FOR SELECT
  TO authenticated
  USING (true);

-- Admin insert
CREATE POLICY "Admin can insert gallery images"
  ON product_gallery_images FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admin update
CREATE POLICY "Admin can update gallery images"
  ON product_gallery_images FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin delete
CREATE POLICY "Admin can delete gallery images"
  ON product_gallery_images FOR DELETE
  TO authenticated
  USING (is_admin());

-- Service role bypass for edge functions
CREATE POLICY "Service role full access gallery images"
  ON product_gallery_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
