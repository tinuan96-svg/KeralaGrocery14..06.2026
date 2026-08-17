/*
# Add pg_cron backup trigger for CentralHub push sync

## Purpose
As a safety net, KeralaGrocery will request a push sync from CentralHub every 5
minutes via pg_cron. This ensures product data stays fresh even if CentralHub's
own cron job fails.

## Changes
1. Store the CentralHub edge function URL in app_config.
2. Create a SECURITY DEFINER function `trigger_centralhub_push()` that sends a
   POST request to CentralHub's centralhub-product-sync edge function.
3. Schedule the function to run every 5 minutes via pg_cron.
*/

-- Store config values in app_config (value column is jsonb)
INSERT INTO app_config (id, value)
VALUES
  ('centralhub_push_url', to_jsonb('https://icnvrpnzjjcbvgcqgiua.supabase.co/functions/v1/centralhub-product-sync'::text))
ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO app_config (id, value)
VALUES
  ('centralhub_anon_key', to_jsonb(''::text))
ON CONFLICT (id) DO NOTHING;

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.trigger_centralhub_push()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_url     text;
  v_api_key text;
  v_headers jsonb;
  v_body    jsonb;
BEGIN
  SELECT value#>>'{}' INTO v_url
  FROM app_config WHERE id = 'centralhub_push_url';

  SELECT value#>>'{}' INTO v_api_key
  FROM app_config WHERE id = 'centralhub_anon_key';

  IF v_url IS NULL OR v_url = '' THEN
    RAISE NOTICE 'centralhub_push_url not configured in app_config';
    RETURN;
  END IF;

  IF v_api_key IS NULL OR v_api_key = '' THEN
    RAISE NOTICE 'centralhub_anon_key not configured in app_config';
    RETURN;
  END IF;

  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_api_key
  );

  v_body := jsonb_build_object('action', 'poll');

  PERFORM net.http_post(
    url := v_url,
    headers := v_headers,
    body := v_body
  );
END;
$$;

-- Schedule the job every 5 minutes
SELECT cron.schedule('request-centralhub-push', '*/5 * * * *', $$SELECT public.trigger_centralhub_push()$$);
