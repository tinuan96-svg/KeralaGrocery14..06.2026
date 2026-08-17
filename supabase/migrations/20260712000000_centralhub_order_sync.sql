-- Enable HTTP support
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the Standardized Sync Function
CREATE OR REPLACE FUNCTION notify_centralhub_order()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  items JSONB;
BEGIN
  -- 1. Fetch and format line items specifically for this order
  SELECT jsonb_agg(jsonb_build_object(
    'product_id', product_id,
    'product_name', product_name,
    'quantity', quantity,
    'unit_price', unit_price,
    'total_price', total_price,
    'product_image', product_image
  )) INTO items
  FROM order_items
  WHERE order_id = NEW.id;

  -- 2. Construct the full JSON payload
  payload := jsonb_build_object(
    'table', 'orders',
    'type', TG_OP,
    'store_slug', 'keralagrocery',
    'record', to_jsonb(NEW) || jsonb_build_object('items', items)
  );

  -- 3. Push to CentralHub production URL
  PERFORM net.http_post(
    url := 'https://centralhub.network/api/sync-orders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the Real-time Trigger
DROP TRIGGER IF EXISTS tr_notify_centralhub_order ON orders;
CREATE TRIGGER tr_notify_centralhub_order
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_centralhub_order();

-- One-time Sync for Existing Orders
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT * FROM orders LOOP
    PERFORM net.http_post(
      url := 'https://centralhub.network/api/sync-orders',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object(
        'table', 'orders',
        'type', 'INSERT',
        'store_slug', 'keralagrocery',
        'record', to_jsonb(r) || jsonb_build_object('items', (
          SELECT jsonb_agg(jsonb_build_object(
            'product_id', product_id,
            'product_name', product_name,
            'quantity', quantity,
            'unit_price', unit_price,
            'total_price', total_price,
            'product_image', product_image
          ))
          FROM order_items i
          WHERE order_id = r.id
        ))
      )
    );
  END LOOP;
END $$;
