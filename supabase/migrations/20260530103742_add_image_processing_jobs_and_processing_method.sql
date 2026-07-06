/*
  # Image Processing Jobs Table + Processing Method Column

  ## Summary
  Creates the `image_processing_jobs` audit table for tracking every product image
  processing run, and adds a `processing_method` column to the `products` table.

  ## New Tables
  - `image_processing_jobs`
    - `id` (uuid, primary key)
    - `product_id` (uuid, FK → products)
    - `triggered_by` (uuid, nullable — auth user who triggered; null = auto)
    - `processing_method` (text) — 'standard_pipeline' | 'ai_enhanced'
    - `status` (text) — 'pending' | 'processing' | 'completed' | 'failed'
    - `quality_score_before` (integer, nullable)
    - `quality_score_after` (integer, nullable)
    - `quality_details` (jsonb, nullable) — sharpness/exposure/bg/resolution breakdown
    - `input_image_url` (text, nullable)
    - `output_image_url` (text, nullable)
    - `error_message` (text, nullable)
    - `duration_ms` (integer, nullable)
    - `created_at` (timestamptz)
    - `completed_at` (timestamptz, nullable)

  ## Modified Tables
  - `products`
    - Adds `processing_method` (text, nullable) — 'standard_pipeline' | 'ai_enhanced'

  ## Security
  - RLS enabled on `image_processing_jobs`
  - Admins (via `is_admin()` function) have full read/write access
  - Authenticated users have no access by default
*/

-- Add processing_method to products if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'processing_method'
  ) THEN
    ALTER TABLE products ADD COLUMN processing_method text;
  END IF;
END $$;

-- Create image_processing_jobs table
CREATE TABLE IF NOT EXISTS image_processing_jobs (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id           uuid REFERENCES products(id) ON DELETE CASCADE,
  triggered_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  processing_method    text NOT NULL DEFAULT 'standard_pipeline',
  status               text NOT NULL DEFAULT 'pending',
  quality_score_before integer,
  quality_score_after  integer,
  quality_details      jsonb,
  input_image_url      text,
  output_image_url     text,
  error_message        text,
  duration_ms          integer,
  created_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz
);

-- Index for fast per-product lookups
CREATE INDEX IF NOT EXISTS idx_image_processing_jobs_product_id
  ON image_processing_jobs (product_id);

-- Index for admin dashboard listing by date
CREATE INDEX IF NOT EXISTS idx_image_processing_jobs_created_at
  ON image_processing_jobs (created_at DESC);

-- Enable RLS
ALTER TABLE image_processing_jobs ENABLE ROW LEVEL SECURITY;

-- Admins can select all jobs
CREATE POLICY "Admins can select image processing jobs"
  ON image_processing_jobs
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admins can insert jobs
CREATE POLICY "Admins can insert image processing jobs"
  ON image_processing_jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admins can update jobs
CREATE POLICY "Admins can update image processing jobs"
  ON image_processing_jobs
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins can delete jobs
CREATE POLICY "Admins can delete image processing jobs"
  ON image_processing_jobs
  FOR DELETE
  TO authenticated
  USING (is_admin());

-- Service role (edge functions) can insert and update freely
-- This is needed since edge functions use the service role key
-- No additional policy needed: service role bypasses RLS by default
