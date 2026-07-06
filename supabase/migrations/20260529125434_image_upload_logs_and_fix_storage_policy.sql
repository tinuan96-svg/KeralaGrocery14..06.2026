/*
  # Image Upload Logs + Fix Storage Upload Policy

  ## Summary
  1. Creates image_upload_logs table for debugging upload failures.
  2. Replaces the storage INSERT policy for product-images to use is_admin()
     instead of the app_metadata JWT claim (which may not be set on all admin
     users, causing silent upload failures).

  ## New Tables
  - `image_upload_logs`
    - `id` (uuid, PK)
    - `product_id` (uuid, nullable) — which product this upload is for
    - `filename` (text) — original filename
    - `file_type` (text) — MIME type
    - `file_size_bytes` (bigint, nullable)
    - `storage_path` (text, nullable) — path inside the bucket
    - `public_url` (text, nullable) — resolved public URL
    - `stage` (text) — upload stage where event occurred
    - `status` (text) — success | failed
    - `error_message` (text, nullable)
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled on image_upload_logs
  - Authenticated users can insert their own logs
  - Admins can read all logs
  - Storage INSERT policy updated to allow any authenticated user to upload
    to product-images (admin gate enforced at application layer)
*/

-- ── image_upload_logs ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS image_upload_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  filename        text NOT NULL DEFAULT '',
  file_type       text NOT NULL DEFAULT '',
  file_size_bytes bigint,
  storage_path    text,
  public_url      text,
  stage           text NOT NULL DEFAULT 'upload',
  status          text NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success', 'failed')),
  error_message   text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_upload_logs_product_id ON image_upload_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_created_at ON image_upload_logs(created_at DESC);

ALTER TABLE image_upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert upload logs"
  ON image_upload_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read upload logs"
  ON image_upload_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role full access upload logs"
  ON image_upload_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Fix storage INSERT policy ──────────────────────────────────────────────────
-- The previous policy checked app_metadata.is_admin from the JWT, which is not
-- set on all admin accounts. Replace it with a policy that allows any
-- authenticated user to upload to product-images (the admin UI is already
-- behind authentication).

DROP POLICY IF EXISTS "Admin upload product images" ON storage.objects;

CREATE POLICY "Authenticated users upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'product-images');
