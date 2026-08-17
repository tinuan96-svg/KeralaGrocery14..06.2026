/*
  # Make storage buckets private and fix bucket listing

  ## Problem
  Both `product-images` and `product-images-clean` buckets are set to `public = true`.
  A public bucket allows anyone to list ALL files via the Supabase Storage API
  (GET /storage/v1/object/list/bucket-name) without needing a matching RLS policy.
  This exposes the full inventory of product images.

  ## Fix
  - Set both buckets to `public = false` (private, RLS-enforced)
  - The existing RLS policies on `storage.objects` already handle read access correctly:
    - Anon: can read by exact name (name IS NOT NULL, name <> '', name !~~ '%/')
    - Authenticated: can read by name
    - Public: can read product-images by name
  - Direct public URLs for images already stored will continue to work because
    Supabase CDN serves them; only the listing endpoint is blocked.

  ## Notes
  - Existing image URLs already embedded in pages/DB are unaffected
  - The anon policy on product-images-clean also blocks path traversal (name !~~ '%/')
*/

UPDATE storage.buckets
SET public = false
WHERE name IN ('product-images', 'product-images-clean');
