/*
  # Add slug_prefix to variant_groups and run initial product grouping
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='variant_groups' AND column_name='slug_prefix') THEN
    ALTER TABLE variant_groups ADD COLUMN slug_prefix text;
  END IF;
END $$;

-- Insert variant groups for products sharing base_name + brand (>=2 sizes)
INSERT INTO variant_groups (base_name, brand, slug_prefix)
SELECT DISTINCT
  build_variant_base_name(p.name) AS base_name,
  NULLIF(lower(trim(COALESCE(p.brand, ''))), '') AS brand,
  lower(regexp_replace(build_variant_base_name(p.name), '[^a-z0-9]+', '-', 'gi')) AS slug_prefix
FROM products p
WHERE p.variant_size IS NOT NULL AND p.is_deleted = false
  AND build_variant_base_name(p.name) IN (
    SELECT build_variant_base_name(name)
    FROM products
    WHERE variant_size IS NOT NULL AND is_deleted = false
    GROUP BY build_variant_base_name(name), lower(trim(COALESCE(brand, '')))
    HAVING COUNT(*) >= 2
  )
ON CONFLICT DO NOTHING;

-- Tag all products with their variant_group_id
UPDATE products p
SET variant_group_id = vg.id
FROM variant_groups vg
WHERE build_variant_base_name(p.name) = vg.base_name
  AND COALESCE(lower(trim(p.brand)), '') = COALESCE(vg.brand, '')
  AND p.variant_size IS NOT NULL
  AND p.is_deleted = false;

-- Refresh product_count
UPDATE variant_groups vg
SET product_count = (
  SELECT COUNT(*) FROM products p
  WHERE p.variant_group_id = vg.id AND p.is_deleted = false
);
