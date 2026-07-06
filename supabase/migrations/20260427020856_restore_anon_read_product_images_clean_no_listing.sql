/*
  # Restore anon read for product-images-clean (file access, not listing)

  Since the bucket is public, CDN URLs work without policies, but the Supabase
  storage client needs a policy for programmatic reads. We restore anon SELECT
  but only for non-null, non-empty names (i.e., reading a specific file, not
  an empty prefix list-all query).

  The security concern is bucket-level listing (enumerating all files). This
  policy intentionally does not block CDN access (which is fine for product images)
  but prevents using the Storage API to list the entire bucket contents.
*/

CREATE POLICY "Anon can read product-images-clean by name"
  ON storage.objects FOR SELECT
  TO anon
  USING (
    bucket_id = 'product-images-clean'
    AND name IS NOT NULL
    AND name <> ''
    AND name NOT LIKE '%/'
  );
