/*
  # Update notify_centralhub_order() to call sync-orders Edge Function

  ## Problem
  The current trigger pushes the full order payload to
  https://centralhub.network/api/sync-orders (a REST API).
  CentralHub now provides a dedicated Edge Function at
  https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/sync-orders
  that accepts a simple { orderId, storeSlug } body with Bearer auth.

  ## Fix
  Rewrite the trigger function to:
  1. Read the sync URL and anon key from app_config
  2. POST { orderId: NEW.id, storeSlug: 'keralagrocery' } to the sync-orders edge function
  3. Include Authorization: Bearer <anon_key> header

  This fires on BOTH INSERT and UPDATE, so every new order and every status
  change triggers an immediate sync to CentralHub.
*/

CREATE OR REPLACE FUNCTION public.notify_centralhub_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $function$
DECLARE
  v_sync_url text;
  v_anon_key text;
  v_store_slug text;
  v_headers jsonb;
  v_body jsonb;
BEGIN
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

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_anon_key
  );

  v_body := jsonb_build_object(
    'orderId', NEW.id,
    'storeSlug', v_store_slug
  );

  PERFORM net.http_post(
    url := v_sync_url,
    headers := v_headers,
    body := v_body
  );

  RETURN NEW;
END;
$function$;
