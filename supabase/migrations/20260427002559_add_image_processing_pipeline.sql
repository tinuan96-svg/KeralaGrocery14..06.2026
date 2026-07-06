/*
  # Image Processing Pipeline

  ## Summary
  Adds the full automated image processing system:

  1. New Storage Bucket
    - `product-images-clean` — stores processed/optimized images (public)

  2. New Table: `image_processing_jobs`
    - Tracks every image processing attempt
    - Columns: id, source_image_path, source_image_url, status, product_id,
      result_main_url, result_thumbnail_url, result_medium_url, result_large_url,
      result_filename, bg_removal_confidence, processing_notes, error_message,
      review_required, approved, created_at, processed_at

  3. Modified Table: `products`
    - Adds: image_main, image_thumbnail, image_medium, image_large,
             image_clean_filename, image_processing_job_id, image_review_required

  4. Security
    - RLS enabled on image_processing_jobs (admin only)
    - Clean bucket is public read, admin write
*/

-- -------------------------------------------------------
-- 1. Create product-images-clean storage bucket
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images-clean',
  'product-images-clean',
  true,
  10485760, -- 10MB
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on clean bucket
CREATE POLICY "Public read product-images-clean"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images-clean');

CREATE POLICY "Service role write product-images-clean"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'product-images-clean');

CREATE POLICY "Service role update product-images-clean"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'product-images-clean');

CREATE POLICY "Service role delete product-images-clean"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'product-images-clean');

-- -------------------------------------------------------
-- 2. Add processed image columns to products
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_main') THEN
    ALTER TABLE products ADD COLUMN image_main text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_thumbnail') THEN
    ALTER TABLE products ADD COLUMN image_thumbnail text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_medium') THEN
    ALTER TABLE products ADD COLUMN image_medium text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_large') THEN
    ALTER TABLE products ADD COLUMN image_large text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_clean_filename') THEN
    ALTER TABLE products ADD COLUMN image_clean_filename text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_processing_job_id') THEN
    ALTER TABLE products ADD COLUMN image_processing_job_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='image_review_required') THEN
    ALTER TABLE products ADD COLUMN image_review_required boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- -------------------------------------------------------
-- 3. Create image_processing_jobs table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS image_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_image_path text NOT NULL,
  source_image_url text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'review_required', 'approved', 'rejected')),

  -- Output URLs
  result_main_url text,
  result_thumbnail_url text,
  result_medium_url text,
  result_large_url text,
  result_filename text,

  -- Processing metadata
  bg_removal_method text, -- 'remove_bg', 'openai', 'none'
  bg_removal_confidence numeric,
  processing_notes text,
  error_message text,

  -- Review
  review_required boolean NOT NULL DEFAULT false,
  approved boolean,
  reviewer_notes text,

  -- Linked product info
  seo_filename text, -- e.g. double-horse-prawns-roast-200g.webp

  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,

  UNIQUE (source_image_path)
);

CREATE INDEX IF NOT EXISTS img_proc_jobs_status_idx ON image_processing_jobs(status);
CREATE INDEX IF NOT EXISTS img_proc_jobs_product_idx ON image_processing_jobs(product_id);
CREATE INDEX IF NOT EXISTS img_proc_jobs_created_idx ON image_processing_jobs(created_at DESC);

-- -------------------------------------------------------
-- 4. RLS
-- -------------------------------------------------------
ALTER TABLE image_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins select image_processing_jobs"
  ON image_processing_jobs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins insert image_processing_jobs"
  ON image_processing_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins update image_processing_jobs"
  ON image_processing_jobs FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins delete image_processing_jobs"
  ON image_processing_jobs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

GRANT ALL ON image_processing_jobs TO service_role;
