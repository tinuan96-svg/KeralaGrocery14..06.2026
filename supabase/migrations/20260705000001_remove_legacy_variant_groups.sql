-- Remove legacy variant group columns from products
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_group_id') THEN
    ALTER TABLE products DROP COLUMN variant_group_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_size') THEN
    ALTER TABLE products DROP COLUMN variant_size;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_weight_g') THEN
    ALTER TABLE products DROP COLUMN variant_weight_g;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_unit') THEN
    ALTER TABLE products DROP COLUMN variant_unit;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='weight_normalized') THEN
    ALTER TABLE products DROP COLUMN weight_normalized;
  END IF;
END $$;

-- Drop legacy variant functions
DROP FUNCTION IF EXISTS auto_group_product_variants();
DROP FUNCTION IF EXISTS get_variant_audit();
DROP FUNCTION IF EXISTS build_variant_base_name(text);
DROP FUNCTION IF EXISTS normalize_weight(text);

-- Drop legacy variant_groups table
DROP TABLE IF EXISTS variant_groups CASCADE;
