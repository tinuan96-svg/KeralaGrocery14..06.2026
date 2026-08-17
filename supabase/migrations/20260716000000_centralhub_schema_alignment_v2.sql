-- CentralHub Schema Alignment v2

-- 1. Align Products Table
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price numeric(10,2);

-- Keep stock and stock_quantity in sync if one is updated
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.stock IS DISTINCT FROM OLD.stock THEN
    NEW.stock_quantity := NEW.stock;
  ELSIF NEW.stock_quantity IS DISTINCT FROM OLD.stock_quantity THEN
    NEW.stock := NEW.stock_quantity;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_stock ON products;
CREATE TRIGGER trg_sync_product_stock
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION sync_product_stock();

-- 2. Align Orders Table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_status text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_label_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_booked_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_synced_at timestamptz DEFAULT now();

-- Set default for courier_name
ALTER TABLE orders ALTER COLUMN courier_name SET DEFAULT 'DHL eCommerce UK';
UPDATE orders SET courier_name = 'DHL eCommerce UK' WHERE courier_name IS NULL;

-- 3. RLS Policies for Service Role (CentralHub)
-- Note: service_role bypasses RLS in Supabase, but explicit grants are good practice
GRANT ALL ON TABLE products TO service_role;
GRANT ALL ON TABLE orders TO service_role;
GRANT ALL ON TABLE order_items TO service_role;

-- 4. Ensure order_status has 'shipped' (it already does in the app logic, but good to check if it's an enum)
-- In this project, order_status is a text field with a check constraint in some migrations.
-- We ensure 'shipped' is allowed.
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));
