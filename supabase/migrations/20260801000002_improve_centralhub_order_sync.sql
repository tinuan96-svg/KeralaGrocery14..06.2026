-- Improve CentralHub Order Sync Trigger
-- Fixes "paid order shows pending" by ensuring status mapping and items are correctly sent on update

CREATE OR REPLACE FUNCTION notify_centralhub_order()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  items JSONB;
  mapped_status TEXT;
  fulfillment_status TEXT;
  packing_status TEXT;
BEGIN
  -- 1. Fetch and format line items specifically for this order
  -- This works on UPDATE because items were inserted after the initial INSERT of the order
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

  -- 2. Map local order_status to CentralHub expectations
  -- CentralHub UI often looks for 'status' field
  mapped_status := CASE
    WHEN NEW.order_status IN ('confirmed', 'processing') THEN 'confirmed'
    WHEN NEW.order_status = 'pending' AND NEW.payment_status = 'paid' THEN 'confirmed'
    ELSE NEW.order_status
  END;

  fulfillment_status := mapped_status;
  packing_status := CASE
    WHEN NEW.order_status IN ('confirmed', 'processing', 'shipped', 'delivered') THEN 'confirmed'
    ELSE 'pending'
  END;

  -- 3. Construct the full JSON payload consistent with Edge Function sync
  payload := jsonb_build_object(
    'table', 'orders',
    'type', 'INSERT', -- Use INSERT for CentralHub webhook to trigger upsert logic
    'store_slug', 'keralagrocery',
    'record', to_jsonb(NEW) || jsonb_build_object(
      'items', COALESCE(items, '[]'::jsonb),
      'status', mapped_status,
      'fulfillment_status', fulfillment_status,
      'packing_status', packing_status,
      'sync_store', 'keralagrocery',
      'sync_origin', 'local'
    )
  );

  -- 4. Push to CentralHub production URL
  -- Using both the hardcoded URL and an environment variable fallback if possible
  -- (Though SQL can't easily access Deno env, it can access project settings if configured)
  PERFORM net.http_post(
    url := 'https://centralhub.network/api/sync-orders',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-create the Real-time Trigger to ensure it fires correctly
DROP TRIGGER IF EXISTS tr_notify_centralhub_order ON orders;
CREATE TRIGGER tr_notify_centralhub_order
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_centralhub_order();
