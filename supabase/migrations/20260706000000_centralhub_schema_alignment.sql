-- Align products table with CentralHub Master Data
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategory text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS in_stock boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category text; -- Store category as text for direct matching

-- Ensure other required columns exist (some might be there from previous steps)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='brand') THEN
        ALTER TABLE products ADD COLUMN brand text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='tags') THEN
        ALTER TABLE products ADD COLUMN tags text[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='custom_attributes') THEN
        ALTER TABLE products ADD COLUMN custom_attributes jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='warehouse_location') THEN
        ALTER TABLE products ADD COLUMN warehouse_location text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='gtin') THEN
        ALTER TABLE products ADD COLUMN gtin text;
    END IF;
END
$$;

-- Ensure product_variants matches CentralHub format
CREATE TABLE IF NOT EXISTS product_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_variants;

-- Add RLS (assuming standard public read, service_role write)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='products' AND policyname='Public Read Products') THEN
        CREATE POLICY "Public Read Products" ON products FOR SELECT TO anon, authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='product_variants' AND policyname='Public Read Variants') THEN
        CREATE POLICY "Public Read Variants" ON product_variants FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
