-- Align products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_attributes jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_location text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gtin text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centralhub_variant_id uuid UNIQUE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  cost_price numeric(10,2) DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  sku text,
  barcode text,
  unit_value numeric,
  unit_type text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies for product_variants
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'product_variants'
        AND policyname = 'Allow public read access to product_variants'
    ) THEN
        CREATE POLICY "Allow public read access to product_variants"
          ON product_variants FOR SELECT
          TO anon, authenticated
          USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'product_variants'
        AND policyname = 'Allow service_role to manage product_variants'
    ) THEN
        CREATE POLICY "Allow service_role to manage product_variants"
          ON product_variants FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
    END IF;
END
$$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_centralhub_variant_id ON product_variants(centralhub_variant_id);
