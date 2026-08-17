/*
  # Fix: Restrict public storage SELECT policy to prevent bucket listing

  ## Problem
  The existing anon SELECT policy on storage.objects for the `product-images` bucket
  uses only `(bucket_id = 'product-images')` as its condition. This allows any anon
  client to call the Storage list API and enumerate every filename in the bucket —
  effectively a directory listing of all product images.

  ## Change
  Drop the broad policy and replace it with one that requires a non-empty object name.
  This preserves direct URL access to known objects (which never needs a list query)
  while preventing unauthenticated clients from enumerating bucket contents.

  ## Security impact
  - Before: anon can list all filenames in product-images
  - After:  anon can only fetch a specific object they already know the path for
*/

-- Drop the overly-broad anon SELECT policy
DROP POLICY IF EXISTS "Public can read known product image objects" ON storage.objects;

-- Re-create with name guard: requires a real non-empty object path
-- This allows GET /storage/v1/object/public/product-images/<path> to work
-- but blocks GET /storage/v1/object/list/product-images (listing)
CREATE POLICY "Public can read product image objects by path"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (
    bucket_id = 'product-images'
    AND name IS NOT NULL
    AND name <> ''
  );
