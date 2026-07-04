/*
  # Variant Groups System v3 (clean install after function drops)
*/

CREATE TABLE IF NOT EXISTS variant_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_name   text NOT NULL,
  brand       text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  slug_prefix text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variant_groups_base_name ON variant_groups (base_name);
CREATE INDEX IF NOT EXISTS idx_variant_groups_brand     ON variant_groups (brand);

ALTER TABLE variant_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='variant_groups' AND policyname='Anon can read variant groups') THEN
    CREATE POLICY "Anon can read variant groups" ON variant_groups FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='variant_groups' AND policyname='Authenticated can read variant groups') THEN
    CREATE POLICY "Authenticated can read variant groups" ON variant_groups FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='variant_groups' AND policyname='Admins can manage variant groups') THEN
    CREATE POLICY "Admins can manage variant groups" ON variant_groups FOR INSERT TO authenticated WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='variant_groups' AND policyname='Admins can update variant groups') THEN
    CREATE POLICY "Admins can update variant groups" ON variant_groups FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='variant_groups' AND policyname='Admins can delete variant groups') THEN
    CREATE POLICY "Admins can delete variant groups" ON variant_groups FOR DELETE TO authenticated USING (is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_group_id') THEN
    ALTER TABLE products ADD COLUMN variant_group_id uuid REFERENCES variant_groups(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_size') THEN
    ALTER TABLE products ADD COLUMN variant_size text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_weight_g') THEN
    ALTER TABLE products ADD COLUMN variant_weight_g numeric;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='variant_unit') THEN
    ALTER TABLE products ADD COLUMN variant_unit text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='weight_normalized') THEN
    ALTER TABLE products ADD COLUMN weight_normalized text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_variant_group_id ON products (variant_group_id);

-- normalize_weight
CREATE OR REPLACE FUNCTION normalize_weight(raw text)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  cleaned  text;
  val      numeric;
  u        text;
  grams    numeric;
  label    text;
  unit_out text;
  m        text[];
BEGIN
  IF raw IS NULL OR trim(raw) = '' THEN
    RETURN jsonb_build_object('grams', null, 'label', null, 'unit', null, 'valid', false);
  END IF;
  cleaned := lower(trim(regexp_replace(raw, '\s+', ' ', 'g')));
  m := regexp_match(cleaned, '^([0-9]+\.?[0-9]*)');
  IF m IS NULL THEN RETURN jsonb_build_object('grams', null, 'label', raw, 'unit', null, 'valid', false); END IF;
  val := m[1]::numeric;
  m := regexp_match(cleaned, '[0-9\.]+\s*([a-z]+)');
  IF m IS NULL THEN RETURN jsonb_build_object('grams', val, 'label', raw, 'unit', null, 'valid', false); END IF;
  u := trim(m[1]);
  CASE u
    WHEN 'g','gm','gram','grams','grm','gr' THEN
      grams:=val; unit_out:='g';
      IF val>=1000 THEN label:=(val/1000)::text||'kg';
      ELSIF val=round(val) THEN label:=val::integer::text||'g';
      ELSE label:=val::text||'g'; END IF;
    WHEN 'kg','kgs','kilogram','kilograms','kilo' THEN
      grams:=val*1000; unit_out:='kg';
      IF val=round(val) THEN label:=val::integer::text||'kg'; ELSE label:=val::text||'kg'; END IF;
    WHEN 'ml','mls','millilitre','millilitres','milliliter','milliliters' THEN
      grams:=val; unit_out:='ml';
      IF val>=1000 THEN label:=(val/1000)::text||'L';
      ELSIF val=round(val) THEN label:=val::integer::text||'ml';
      ELSE label:=val::text||'ml'; END IF;
    WHEN 'l','ltr','litre','litres','liter','liters','lt' THEN
      grams:=val*1000; unit_out:='l';
      IF val=round(val) THEN label:=val::integer::text||'L'; ELSE label:=val::text||'L'; END IF;
    WHEN 'pcs','pc','piece','pieces','pack','packs','pkt','nos','no' THEN
      grams:=val; unit_out:='pcs'; label:=val::integer::text||' pcs';
    ELSE
      RETURN jsonb_build_object('grams', val, 'label', raw, 'unit', u, 'valid', false);
  END CASE;
  RETURN jsonb_build_object('grams', grams, 'label', label, 'unit', unit_out, 'valid', true);
END;
$$;

-- build_variant_base_name
CREATE OR REPLACE FUNCTION build_variant_base_name(product_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(
    regexp_replace(
      regexp_replace(product_name,
        '\s*\d+\.?\d*\s*(g|gm|gram|grams|grm|kg|kgs|kilogram|ml|mls|l|ltr|litre|litres|liter|pcs|pc|pack|packs|pkt|nos|no)\b.*$', '', 'i'),
      '\s+PM[\d\.£]+\s*$', '', 'i')
  );
$$;

-- auto_group_product_variants
CREATE OR REPLACE FUNCTION auto_group_product_variants()
RETURNS TABLE(groups_created int, products_tagged int, skipped_no_size int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gc int:=0; v_pt int:=0; v_sk int:=0;
  r record; v_gid uuid;
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  UPDATE products
  SET
    weight_normalized = (normalize_weight(unit))->>'label',
    variant_size      = (normalize_weight(unit))->>'label',
    variant_weight_g  = ((normalize_weight(unit))->>'grams')::numeric,
    variant_unit      = (normalize_weight(unit))->>'unit'
  WHERE unit IS NOT NULL AND trim(unit)<>'' AND is_deleted=false
    AND (normalize_weight(unit))->>'valid'='true';

  UPDATE products
  SET
    variant_size     = (normalize_weight((regexp_match(name,'(\d+\.?\d*\s*(?:g|gm|gram|grams|kg|kgs|ml|l|ltr|litre|pcs|pc|pack)\b)','i'))[1]))->>'label',
    variant_weight_g = ((normalize_weight((regexp_match(name,'(\d+\.?\d*\s*(?:g|gm|gram|grams|kg|kgs|ml|l|ltr|litre|pcs|pc|pack)\b)','i'))[1]))->>'grams')::numeric,
    variant_unit     = (normalize_weight((regexp_match(name,'(\d+\.?\d*\s*(?:g|gm|gram|grams|kg|kgs|ml|l|ltr|litre|pcs|pc|pack)\b)','i'))[1]))->>'unit'
  WHERE is_deleted=false AND variant_size IS NULL
    AND name ~ '(\d+\.?\d*\s*(?:g|gm|gram|grams|kg|kgs|ml|l|ltr|litre|pcs|pc|pack)\b)';

  FOR r IN
    SELECT build_variant_base_name(name) AS base_name, brand, category_id,
           COUNT(*) AS cnt,
           ARRAY_AGG(id ORDER BY variant_weight_g NULLS LAST) AS product_ids
    FROM products
    WHERE variant_size IS NOT NULL AND is_deleted=false
    GROUP BY build_variant_base_name(name), brand, category_id
    HAVING COUNT(*)>=2
  LOOP
    SELECT id INTO v_gid FROM variant_groups
    WHERE base_name=r.base_name AND (brand=r.brand OR (brand IS NULL AND r.brand IS NULL));
    IF v_gid IS NULL THEN
      INSERT INTO variant_groups(base_name,brand,category_id,slug_prefix)
      VALUES(r.base_name,r.brand,r.category_id,lower(regexp_replace(r.base_name,'[^a-z0-9]+','-','gi')))
      RETURNING id INTO v_gid;
      v_gc:=v_gc+1;
    END IF;
    UPDATE products SET variant_group_id=v_gid WHERE id=ANY(r.product_ids);
    v_pt:=v_pt+array_length(r.product_ids,1);
  END LOOP;

  SELECT COUNT(*) INTO v_sk FROM products WHERE variant_size IS NULL AND is_deleted=false;
  RETURN QUERY SELECT v_gc, v_pt, v_sk;
END;
$$;

-- get_variant_audit
CREATE OR REPLACE FUNCTION get_variant_audit()
RETURNS TABLE(
  missing_weight_count bigint, missing_unit_count bigint, invalid_weight_count bigint,
  variant_groups_total bigint, products_in_groups bigint,
  sample_missing_weight jsonb, sample_missing_unit jsonb, sample_invalid_weight jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM products WHERE weight IS NULL AND variant_weight_g IS NULL AND is_deleted=false),
    (SELECT COUNT(*) FROM products WHERE unit IS NULL AND variant_unit IS NULL AND is_deleted=false),
    (SELECT COUNT(*) FROM products WHERE unit IS NOT NULL AND (normalize_weight(unit))->>'valid'='false' AND is_deleted=false),
    (SELECT COUNT(*) FROM variant_groups),
    (SELECT COUNT(*) FROM products WHERE variant_group_id IS NOT NULL AND is_deleted=false),
    (SELECT jsonb_agg(x) FROM (SELECT id,name,brand FROM products WHERE weight IS NULL AND variant_weight_g IS NULL AND is_deleted=false LIMIT 10) x),
    (SELECT jsonb_agg(x) FROM (SELECT id,name,brand FROM products WHERE unit IS NULL AND variant_unit IS NULL AND is_deleted=false LIMIT 10) x),
    (SELECT jsonb_agg(x) FROM (SELECT id,name,unit,brand FROM products WHERE unit IS NOT NULL AND (normalize_weight(unit))->>'valid'='false' AND is_deleted=false LIMIT 10) x);
END;
$$;

-- get_product_variants
CREATE OR REPLACE FUNCTION get_product_variants(p_variant_group_id uuid)
RETURNS TABLE(
  id uuid, name text, slug text,
  variant_size text, variant_weight_g numeric, variant_unit text,
  price numeric, compare_price numeric,
  image_url text, image_main text, in_stock boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.name, p.slug, p.variant_size, p.variant_weight_g, p.variant_unit,
         p.price, p.compare_price, p.image_url, p.image_main,
         (COALESCE(p.stock,0)>0)
  FROM products p
  WHERE p.variant_group_id=p_variant_group_id
    AND p.is_deleted=false AND p.approval_status='approved' AND p.visibility_status=true
  ORDER BY p.variant_weight_g NULLS LAST, p.variant_size NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_group_product_variants() TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_weight(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION build_variant_base_name(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_variant_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_variants(uuid) TO anon, authenticated;
