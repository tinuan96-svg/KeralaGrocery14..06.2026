/*
# Send Full Order Details with CentralHub Product IDs

## Purpose
Rewrite the `notify_centralhub_order()` trigger function so that every order
synced to CentralHub includes the complete order record AND all line items,
with each item carrying the `centralhub_product_id` from the `products` table.

## Previous Behavior
The trigger sent only `{ orderId, storeSlug }` to CentralHub's sync-orders Edge
Function, relying on CentralHub to fetch the order data itself.  No line items
or product identifiers were included.

## New Behavior
The trigger now constructs a full JSON payload containing:
- The entire `orders` row (all columns via `to_jsonb(NEW)`)
- An `items` array, each item joined with `products.centralhub_product_id`
- Mapped status fields for CentralHub compatibility (`status`,
  `fulfillment_status`, `packing_status`)
- Sync metadata (`sync_store`, `sync_origin`, `sync_updated_at`)
- Envelope fields (`table`, `type`, `store_slug`)

The payload is POSTed to the CentralHub sync-orders Edge Function URL
(read from `app_config`) with a Bearer auth header using the CentralHub anon
key (also from `app_config`).

## Filtering
Only orders where `payment_status = 'paid'` OR `order_status IN
('confirmed', 'processing')` are synced.  Unpaid/abandoned orders are
skipped.

## No Schema Changes
No new columns or tables are needed.  `products.centralhub_product_id`
already exists and `order_items.product_id` already references
`products.id`, so the join works without any DDL changes.

## Security
The function remains `SECURITY DEFINER` with `search_path = public, net`.
No RLS policy changes are made.
*/

CREATE OR REPLACE FUNCTION public.notify_centralhub_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $function$
DECLARE
  v_sync_url     text;
  v_anon_key     text;
  v_store_slug   text;
  v_headers      jsonb;
  v_body         jsonb;
  v_items        jsonb;
  v_mapped_status text;
  v_fulfillment_status text;
  v_packing_status text;
BEGIN
  -- Only push to CentralHub if the order is confirmed/processing or paid
  IF (NEW.payment_status != 'paid' AND NEW.order_status NOT IN ('confirmed', 'processing')) THEN
    RETURN NEW;
  END IF;

  -- Read config from app_config
  SELECT value#>>'{}' INTO v_sync_url
  FROM app_config WHERE id = 'centralhub_order_sync_url';

  SELECT value#>>'{}' INTO v_anon_key
  FROM app_config WHERE id = 'centralhub_anon_key';

  SELECT value#>>'{}' INTO v_store_slug
  FROM app_config WHERE id = 'centralhub_store_slug';

  -- Fall back to defaults if not configured
  IF v_sync_url IS NULL OR v_sync_url = '' THEN
    v_sync_url := 'https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/sync-orders';
  END IF;

  IF v_store_slug IS NULL OR v_store_slug = '' THEN
    v_store_slug := 'keralagrocery';
  END IF;

  IF v_anon_key IS NULL OR v_anon_key = '' THEN
    RAISE NOTICE 'centralhub_anon_key not configured in app_config — skipping sync';
    RETURN NEW;
  END IF;

  -- 1. Fetch line items joined with products.centralhub_product_id
  SELECT jsonb_agg(jsonb_build_object(
    'product_id',            oi.product_id,
    'centralhub_product_id', p.centralhub_product_id,
    'product_name',          oi.product_name,
    'product_image',         oi.product_image,
    'quantity',              oi.quantity,
    'unit_price',            oi.unit_price,
    'total_price',           oi.total_price
  ))
  INTO v_items
  FROM order_items oi
  LEFT JOIN products p ON p.id = oi.product_id
  WHERE oi.order_id = NEW.id;

  -- 2. Map internal status to CentralHub display status
  v_mapped_status := CASE
    WHEN NEW.order_status IN ('confirmed', 'processing') THEN 'confirmed'
    WHEN NEW.order_status = 'shipped' THEN 'shipped'
    WHEN NEW.order_status = 'delivered' THEN 'delivered'
    WHEN NEW.order_status = 'cancelled' THEN 'cancelled'
    WHEN NEW.order_status = 'pending' AND NEW.payment_status = 'paid' THEN 'confirmed'
    ELSE 'pending'
  END;

  v_fulfillment_status := v_mapped_status;

  v_packing_status := CASE
    WHEN NEW.order_status IN ('confirmed', 'processing', 'shipped', 'delivered') THEN 'confirmed'
    ELSE 'pending'
  END;

  -- 3. Construct the full JSON payload
  v_body := jsonb_build_object(
    'table',      'orders',
    'type',       'INSERT',
    'store_slug', v_store_slug,
    'record',     to_jsonb(NEW) || jsonb_build_object(
      'items',              COALESCE(v_items, '[]'::jsonb),
      'status',             v_mapped_status,
      'fulfillment_status', v_fulfillment_status,
      'packing_status',     v_packing_status,
      'sync_store',         v_store_slug,
      'sync_origin',        'local',
      'sync_updated_at',    now()
    )
  );

  -- 4. Push to CentralHub sync-orders Edge Function
  v_headers := jsonb_build_object(
    'Content-Type',   'application/json',
    'Authorization',  'Bearer ' || v_anon_key
  );

  PERFORM net.http_post(
    url     := v_sync_url,
    headers := v_headers,
    body    := v_body
  );

  RETURN NEW;
END;
$function$;

-- Ensure the trigger is active (drop + recreate to be safe)
DROP TRIGGER IF EXISTS tr_notify_centralhub_order ON orders;
CREATE TRIGGER tr_notify_centralhub_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_centralhub_order();
