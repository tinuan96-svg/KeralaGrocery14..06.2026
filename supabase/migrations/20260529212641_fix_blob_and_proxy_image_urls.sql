/*
  # Fix blob: and proxy image URLs stored in products table

  ## Problem
  38 products have `blob:https://...` URLs stored in image_url and image_main.
  Blob URLs are ephemeral browser-generated object URLs — they only exist in the
  browser tab that created them and are invalid in any other context (other users,
  server-side renders, image tags in different sessions).

  3 products have `https://keralagroceries.com/supabase-api/storage/...` URLs —
  the old Next.js rewrite proxy path baked into the database. These should point
  directly to the Supabase storage URL.

  ## Changes
  1. Null out image_url and image_main where they contain blob: URLs — the
     frontend mapRow already handles null gracefully (shows no image).
  2. Rewrite /supabase-api/storage/ proxy URLs to the real Supabase storage URL.

  ## No RLS or schema changes.
*/

-- 1. Clear blob: URLs — they are permanently broken for any other session
UPDATE products
SET
  image_url  = NULL,
  image_main = NULL
WHERE image_url  LIKE 'blob:%'
   OR image_main LIKE 'blob:%';

-- 2. Rewrite old proxy storage URLs to direct Supabase storage URLs
UPDATE products
SET image_url = REPLACE(
  image_url,
  'https://keralagroceries.com/supabase-api/storage/',
  'https://vnqjqopzoeunojomssmq.supabase.co/storage/'
)
WHERE image_url LIKE '%/supabase-api/storage/%';

UPDATE products
SET image_main = REPLACE(
  image_main,
  'https://keralagroceries.com/supabase-api/storage/',
  'https://vnqjqopzoeunojomssmq.supabase.co/storage/'
)
WHERE image_main LIKE '%/supabase-api/storage/%';
