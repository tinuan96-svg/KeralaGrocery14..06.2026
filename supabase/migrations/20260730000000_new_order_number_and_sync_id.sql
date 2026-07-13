-- 1. Ensure original_order_number exists for stable references
ALTER TABLE orders ADD COLUMN IF NOT EXISTS original_order_number text;

-- 2. Update Order Number Generation
-- Paid: KG-2026-0001
-- Others: KG-5320
CREATE SEQUENCE IF NOT EXISTS order_number_seq_2026 START 1;

CREATE OR REPLACE FUNCTION generate_order_number(p_payment_status text DEFAULT 'pending')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_payment_status = 'paid' THEN
    RETURN 'KG-2026-' || LPAD(nextval('order_number_seq_2026')::text, 4, '0');
  ELSE
    RETURN 'KG-' || nextval('order_number_seq')::text;
  END IF;
END;
$$;

-- 3. Trigger to assign success number upon payment
CREATE OR REPLACE FUNCTION finalize_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- If transitioning to paid and doesn't have the success format yet
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')
     AND NEW.order_number NOT LIKE 'KG-2026-%' THEN

    -- Store the old number as the original reference
    NEW.original_order_number := NEW.order_number;
    -- Assign the new sequence number
    NEW.order_number := generate_order_number('paid');

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_finalize_order_number ON orders;
CREATE TRIGGER trg_finalize_order_number
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION finalize_order_number();

-- 4. Update CentralHub Notification Trigger to use the FINAL order number
-- (The existing trigger in this file already constructed the payload from NEW,
-- so it will pick up the changed order_number automatically since it's an AFTER trigger
-- OR we can make it an AFTER trigger if it wasn't).
-- Note: finalize_order_number is BEFORE update, so NEW.order_number is already updated when
-- subsequent triggers (like centralhub sync) run.

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
