-- 1. Update Order Number Generation to KG-2026- format using a sequence
-- Create a new sequence for the year 2026 if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS order_number_seq_2026 START 1;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  date_part text;
  seq_val bigint;
BEGIN
  -- We now use KG-YYYY- format as requested
  date_part := '2026'; -- Hardcoded 2026 as per request

  -- Get next value from sequence (thread-safe)
  seq_val := nextval('order_number_seq_2026');

  RETURN 'KG-' || date_part || '-' || LPAD(seq_val::text, 4, '0');
END;
$$;

-- 2. Update CentralHub Notification Trigger with keralagrocery identifier
CREATE OR REPLACE FUNCTION notify_centralhub_order()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  items JSONB;
  mapped_status text;
BEGIN
  -- Only push to CentralHub if the order is confirmed, processing, or paid
  IF (NEW.payment_status != 'paid' AND NEW.order_status NOT IN ('confirmed', 'processing')) THEN
    RETURN NEW;
  END IF;

  -- Map internal status to CentralHub display status
  mapped_status := CASE
    WHEN NEW.order_status IN ('confirmed', 'processing') THEN 'confirmed'
    WHEN NEW.order_status = 'shipped' THEN 'shipped'
    WHEN NEW.order_status = 'delivered' THEN 'delivered'
    WHEN NEW.order_status = 'cancelled' THEN 'cancelled'
    ELSE 'pending'
  END;

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

  -- 2. Construct the full JSON payload for CentralHub
  payload := jsonb_build_object(
    'table', 'orders',
    'type', 'INSERT',
    'store_slug', 'keralagrocery', -- Changed to keralagrocery
    'record', to_jsonb(NEW) || jsonb_build_object(
      'items', items,
      'status', mapped_status,
      'fulfillment_status', mapped_status,
      'packing_status', mapped_status,
      'sync_store', 'keralagrocery', -- Changed to keralagrocery
      'sync_origin', 'local',
      'sync_updated_at', now()
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
