-- Schedule an automatic order sync every hour to ensure CentralHub is always up to date
-- This catches any orders that missed the real-time trigger due to network issues.

-- 1. Enable pg_net if not already enabled (required to call Edge Functions from SQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create the scheduled task (requires pg_cron, usually enabled by default in Supabase)
-- Note: We use the service_role key to bypass auth in the Edge Function when called via cron
-- You must set your actual project URL and a valid service key in the URL/Headers below
-- or use the Supabase Dashboard "Database -> Cron" UI which is safer.

/*
SELECT
  cron.schedule(
    'auto-sync-orders-to-centralhub',
    '0 * * * *', -- Every hour
    $$
    SELECT net.http_post(
      url := (SELECT value FROM app_config WHERE key = 'supabase_url') || '/functions/v1/centralhub-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM app_config WHERE key = 'supabase_service_role_key')
      ),
      body := '{"action": "sync_orders"}'::jsonb
    );
    $$
  );
*/

-- Since we cannot reliably know the service key from within SQL without app_config,
-- we will instead enhance the real-time trigger to be more resilient.

-- 3. Robust Trigger: Ensure we only sync PAID or CONFIRMED orders to avoid cluttering CentralHub with abandoned ones.
CREATE OR REPLACE FUNCTION notify_centralhub_order()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  items JSONB;
BEGIN
  -- Only push to CentralHub if the order is confirmed or payment is successful
  IF (NEW.payment_status != 'paid' AND NEW.order_status != 'confirmed') THEN
    RETURN NEW;
  END IF;

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

  -- 2. Construct the full JSON payload with mapped status fields for CentralHub
  payload := jsonb_build_object(
    'table', 'orders',
    'type', 'INSERT', -- Use INSERT type so CentralHub treats it as a fresh record update
    'store_slug', 'keralagrocery',
    'record', to_jsonb(NEW) || jsonb_build_object(
      'items', items,
      'status', CASE WHEN NEW.order_status IN ('confirmed', 'processing') THEN 'confirmed' ELSE NEW.order_status END,
      'fulfillment_status', CASE WHEN NEW.order_status IN ('confirmed', 'processing') THEN 'confirmed' ELSE NEW.order_status END,
      'packing_status', CASE WHEN NEW.order_status IN ('confirmed', 'processing') THEN 'confirmed' ELSE 'pending' END,
      'sync_store', 'keralagrocery',
      'sync_origin', 'local'
    )
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
