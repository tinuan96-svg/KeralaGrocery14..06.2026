/*
  # Create product-images storage bucket

  1. Creates the `product-images` bucket as public (images are served on the storefront)
  2. Adds storage RLS policies:
     - Anyone can read (public storefront images)
     - Only authenticated admins can upload, update, or delete
*/

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

-- Public read policy (anyone can view product images)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public read product images'
  ) THEN
    CREATE POLICY "Public read product images"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'product-images');
  END IF;
END $$;

-- Admin upload policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admin upload product images'
  ) THEN
    CREATE POLICY "Admin upload product images"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'product-images'
        AND (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
      );
  END IF;
END $$;

-- Admin update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admin update product images'
  ) THEN
    CREATE POLICY "Admin update product images"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'product-images'
        AND (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
      );
  END IF;
END $$;

-- Admin delete policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admin delete product images'
  ) THEN
    CREATE POLICY "Admin delete product images"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'product-images'
        AND (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
      );
  END IF;
END $$;
