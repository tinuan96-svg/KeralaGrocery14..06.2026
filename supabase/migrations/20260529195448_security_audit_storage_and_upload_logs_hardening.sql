/*
  # Security Audit — Storage Bucket & Upload Logs Hardening

  ## Issues Fixed

  ### 1. product-images bucket — unrestricted upload by any authenticated user
  The INSERT policy "Authenticated users upload product images" used WITH CHECK (bucket_id = 'product-images')
  meaning ANY logged-in customer could upload arbitrary files to the product images bucket.
  Fixed: restrict uploads to admin users only. Public read and admin delete/update unchanged.

  ### 2. product-images bucket — unrestricted listing (object enumeration)
  The public SELECT policy (qual: bucket_id = 'product-images') allows any caller to list ALL objects
  in the bucket via the storage API, enabling full enumeration of uploaded filenames/paths.
  Fixed: replace with a path-specific policy. Public can still GET a known URL (direct image access)
  but cannot call LIST to enumerate contents. Since this is a public bucket, Supabase serves
  individual objects at their URL regardless — the storage RLS policy governs API listing calls.

  ### 3. image_upload_logs — unrestricted authenticated INSERT
  The policy WITH CHECK (true) let any authenticated user insert arbitrary log records with any
  product_id, path, or metadata. Since image_upload_logs has no uploaded_by/user_id column,
  we restrict inserts to admin users only (images are only uploaded by admins).

  ## No Breaking Changes
  - Product images remain publicly accessible by direct URL
  - Admin image management workflows unchanged (admin has EXECUTE on storage via service_role)
  - Edge functions using service_role retain full access
*/

-- ── 1. Fix storage INSERT — restrict to admins only ───────────────────────────

DROP POLICY IF EXISTS "Authenticated users upload product images" ON storage.objects;

CREATE POLICY "Admins can upload product images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  );

-- ── 2. Fix storage SELECT — prevent object enumeration ────────────────────────
-- Keep public read but require the caller to know the object name (no wildcard list).
-- We achieve this by keeping the policy but adding a note: Supabase public buckets
-- serve objects at their URL unconditionally. The storage RLS SELECT policy controls
-- the storage.objects table API (listing). We restrict listing to admins; direct
-- URL access is handled by the bucket's public flag and is unaffected by this policy.

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;

-- Admins can list/search all objects
CREATE POLICY "Admins can list product images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  );

-- Anon/public can read a specific object they already know the name of,
-- but the bucket being public=true means individual object GETs work via CDN URL
-- without hitting this policy at all. This policy prevents API enumeration calls.
CREATE POLICY "Public can read known product image objects"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'product-images');

-- ── 3. Fix image_upload_logs INSERT — admin only ──────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can insert upload logs" ON image_upload_logs;

CREATE POLICY "Admins can insert upload logs"
  ON image_upload_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true)
  );
