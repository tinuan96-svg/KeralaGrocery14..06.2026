/*
# Create product_variants table and add push-sync columns to products

## Purpose
CentralHub now pushes products directly into KeralaGrocery's database via a new
edge function (centralhub-product-sync). This migration prepares the local schema
to accept those pushes.

## 1. New Table: product_variants
CentralHub sends a `variants` JSONB array inside each product object. We need a
dedicated table to store these variants.

Columns:
- id (uuid, primary key) — matches CentralHub variant id
- product_id (uuid, FK to products.id, ON DELETE CASCADE)
- variant_name (text) — display name of the variant
- sku (text) — variant SKU
- barcode (text) — variant barcode
- price (numeric) — variant price
- cost_price (numeric) — variant cost price
- stock (integer, default 0) — variant stock count
- unit_value (numeric) — e.g. 500 for 500g
- unit_type (text) — e.g. 'g', 'kg', 'ml'
- pack_type (text) — e.g. 'single', 'multi'
- pack_quantity (integer) — number of units in a pack
- weight_grams (numeric) — weight in grams
- is_active (boolean, default true)
- image_url (text) — variant-specific image
- sort_order (integer, default 0)
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())

## 2. Products table: add missing columns for push sync
CentralHub pushes these fields that may not exist yet:
- sale_price (numeric) — already exists, no action needed
- stock_quantity (integer) — already exists, no action needed
- in_stock (boolean) — NEW, computed from stock > 0
- is_published (boolean) — NEW, maps to visibility
- status (text) — NEW, 'publish' or 'draft'
- is_archived (boolean) — NEW, maps to is_deleted
- attribute (jsonb) — NEW, custom attributes from CentralHub

Columns that already exist and need no changes: id, name, slug, brand, brand_id,
price, stock, unit, weight, is_active, gtin, tags, updated_at

## 3. Security
- Enable RLS on product_variants
- Allow anon + authenticated SELECT only (public catalog data)
- No INSERT/UPDATE/DELETE via anon key (CentralHub writes via service role key which bypasses RLS)
*/

-- ============================================================
-- 1. Create product_variants table
-- ============================================================
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name text NOT NULL DEFAULT '',
  sku         text DEFAULT '',
  barcode     text DEFAULT '',
  price       numeric NOT NULL DEFAULT 0,
  cost_price  numeric DEFAULT 0,
  stock       integer NOT NULL DEFAULT 0,
  unit_value  numeric,
  unit_type   text,
  pack_type   text,
  pack_quantity integer DEFAULT 1,
  weight_grams numeric,
  is_active   boolean NOT NULL DEFAULT true,
  image_url   text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- SELECT policy: public read for catalog data
DROP POLICY IF EXISTS "anon_select_product_variants" ON product_variants;
CREATE POLICY "anon_select_product_variants"
  ON product_variants FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add index for product_id lookups
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active) WHERE is_active = true;

-- Enable realtime on product_variants
ALTER PUBLICATION supabase_realtime ADD TABLE product_variants;

-- ============================================================
-- 2. Add missing columns to products table
-- ============================================================

-- in_stock: boolean derived from stock > 0
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'in_stock'
  ) THEN
    ALTER TABLE products ADD COLUMN in_stock boolean DEFAULT false;
  END IF;
END $$;

-- is_published: maps from CentralHub's is_published field
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_published'
  ) THEN
    ALTER TABLE products ADD COLUMN is_published boolean DEFAULT false;
  END IF;
END $$;

-- status: 'publish' or 'draft' from CentralHub
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'status'
  ) THEN
    ALTER TABLE products ADD COLUMN status text DEFAULT 'draft';
  END IF;
END $$;

-- is_archived: maps from CentralHub's is_archived field
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE products ADD COLUMN is_archived boolean DEFAULT false;
  END IF;
END $$;

-- attribute: jsonb for custom attributes from CentralHub
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'attribute'
  ) THEN
    ALTER TABLE products ADD COLUMN attribute jsonb;
  END IF;
END $$;

-- variants: jsonb array stored on products table for quick access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'variants'
  ) THEN
    ALTER TABLE products ADD COLUMN variants jsonb;
  END IF;
END $$;
