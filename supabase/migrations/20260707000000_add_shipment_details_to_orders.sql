-- Add shipment and tracking columns to orders table to support CentralHub integration
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipment_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS courier_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_label_url text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS weight_total numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS external_order_id text; -- ID in CentralHub

-- Add index for external_order_id for faster matching
CREATE INDEX IF NOT EXISTS idx_orders_external_order_id ON orders(external_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_shipment_id ON orders(shipment_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
