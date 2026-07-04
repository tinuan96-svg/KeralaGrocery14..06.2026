/*
  # Ensure products.slug column has a unique index

  ## Summary
  - Adds unique index on products.slug for fast lookup by URL slug
  - Backfills any products missing a slug from their name
  - The slug is already populated for all 401 products, this is a safety measure
*/

-- Backfill any missing slugs from product name (safety net)
UPDATE products
SET slug = lower(
  regexp_replace(
    regexp_replace(trim(name), '[^a-zA-Z0-9\s\-]', '', 'g'),
    '\s+', '-', 'g'
  )
)
WHERE (slug IS NULL OR slug = '')
  AND name IS NOT NULL;

-- Unique index for slug lookups (product detail pages)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
