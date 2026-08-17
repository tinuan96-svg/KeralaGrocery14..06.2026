/*
  # Product Ingestion System

  ## Summary
  Adds automated product ingestion support:

  1. New Tables
    - `ingestion_jobs` — tracks each image's ingestion attempt
      - `id` (uuid, pk)
      - `image_path` (text) — path in product-images bucket
      - `image_url` (text) — full public URL
      - `status` (text) — pending | processing | completed | failed | duplicate
      - `product_id` (uuid, nullable) — created product if successful
      - `raw_ai_response` (jsonb) — full OpenAI response for debugging
      - `extracted_data` (jsonb) — parsed product fields from AI
      - `error_message` (text, nullable)
      - `created_at`, `processed_at`

  2. Modified Tables
    - `products` — adds `review_required` boolean (default true for AI-created)
      and `ingestion_job_id` to trace back to source image

  3. Security
    - RLS enabled on ingestion_jobs
    - Only admins can read/write ingestion_jobs
*/

-- -------------------------------------------------------
-- 1. Add review_required and ingestion_job_id to products
-- -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'review_required'
  ) THEN
    ALTER TABLE products ADD COLUMN review_required boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'ingestion_job_id'
  ) THEN
    ALTER TABLE products ADD COLUMN ingestion_job_id uuid NULL;
  END IF;
END $$;

-- -------------------------------------------------------
-- 2. Create ingestion_jobs table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path text NOT NULL,
  image_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'duplicate', 'skipped')),
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  raw_ai_response jsonb,
  extracted_data jsonb,
  error_message text,
  store_id uuid REFERENCES stores(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (image_path)
);

CREATE INDEX IF NOT EXISTS ingestion_jobs_status_idx ON ingestion_jobs(status);
CREATE INDEX IF NOT EXISTS ingestion_jobs_created_at_idx ON ingestion_jobs(created_at DESC);

-- -------------------------------------------------------
-- 3. RLS
-- -------------------------------------------------------
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select ingestion_jobs"
  ON ingestion_jobs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can insert ingestion_jobs"
  ON ingestion_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can update ingestion_jobs"
  ON ingestion_jobs FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can delete ingestion_jobs"
  ON ingestion_jobs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

-- Service role needs access for edge functions (they use service role key)
GRANT ALL ON ingestion_jobs TO service_role;
GRANT SELECT, UPDATE ON products TO service_role;
