/*
  # Refactor banners table schema

  ## Changes
  1. New Columns
     - `cta_text` (text, nullable) - Button label for the CTA
     - `cta_link` (text, nullable) - Destination URL for CTA and banner click
     - `display_order` (integer, default 0) - Controls rendering order

  2. Data Migration
     - Copies `link_url` → `cta_link`
     - Copies `sort_order` → `display_order`

  3. Removed Columns
     - `link_url` (replaced by `cta_link`)
     - `sort_order` (replaced by `display_order`)

  4. Index Update
     - Drops old idx_banners_active_sort
     - Creates idx_banners_active_display on (is_active, display_order)
*/

ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_text text;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS cta_link text;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

UPDATE banners
SET
  cta_link = link_url,
  display_order = COALESCE(sort_order, 0)
WHERE cta_link IS NULL OR display_order = 0;

ALTER TABLE banners DROP COLUMN IF EXISTS link_url;
ALTER TABLE banners DROP COLUMN IF EXISTS sort_order;

DROP INDEX IF EXISTS idx_banners_active_sort;
CREATE INDEX IF NOT EXISTS idx_banners_active_display ON banners(is_active, display_order) WHERE is_active = true;
