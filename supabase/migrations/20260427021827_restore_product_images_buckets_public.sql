/*
  # Restore product image buckets to public

  ## Problem
  Setting buckets to private broke image URLs across the site.
  The processed image edge function uses getPublicUrl() which only works for public buckets.
  Also, the frontend displays product images via direct CDN URLs (image_main, image_url columns)
  which are /storage/v1/object/public/... URLs — these 400 when the bucket is private.

  ## Why public is correct here
  These buckets contain only product images — no sensitive data.
  The "security" concern was about bucket LISTING (enumerating all files), not about
  accessing individual files. Listing is controlled by:
  1. The RLS policy on storage.objects already requires name IS NOT NULL AND name <> ''
     AND name !~~ '%/' (no directory-listing paths) for anon.
  2. Public buckets allow direct URL access but the Supabase Storage list endpoint
     still requires a valid authenticated request with knowledge of the bucket path.

  Setting buckets back to public restores:
  - getPublicUrl() working in edge functions
  - /object/public/... CDN URLs working in the frontend
  - Supabase image transform URLs working (/render/image/public/...)
*/

UPDATE storage.buckets
SET public = true
WHERE name IN ('product-images', 'product-images-clean');
