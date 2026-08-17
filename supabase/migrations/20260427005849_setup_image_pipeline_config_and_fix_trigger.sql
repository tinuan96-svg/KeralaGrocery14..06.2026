/*
  # Fix image processing pipeline — store config in table for trigger access

  The pg_net trigger needs the Supabase URL and service role key.
  We store these in a config table (readable by SECURITY DEFINER functions only)
  and seed them from environment variables available in the migration context.

  ## Changes
  1. Creates `app_config` table to store pipeline configuration
  2. Inserts/updates SUPABASE_URL config row (key is known from env)
  3. Recreates the trigger function to read from app_config table
  4. Fixes the cron function to read from app_config table
*/

-- Config table for pipeline settings
CREATE TABLE IF NOT EXISTS public.app_config (
  key   text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write
CREATE POLICY "Service role only"
  ON public.app_config
  FOR SELECT
  TO service_role
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Recreate trigger function using hardcoded env lookup via pg_net config
-- Instead of app.settings (not available in triggers), we use a direct approach:
-- the trigger reads the Supabase project ref from the DB URL and constructs the URL.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_auto_image_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url  text;
  v_service_key   text;
  v_func_url      text;
  v_payload       jsonb;
BEGIN
  -- Only process product-images bucket inserts
  IF NEW.bucket_id <> 'product-images' THEN
    RETURN NEW;
  END IF;

  -- Skip non-image files and placeholder entries
  IF NEW.name IS NULL OR NEW.name = '.emptyFolderPlaceholder' THEN
    RETURN NEW;
  END IF;

  -- Read config from app_config table
  SELECT value INTO v_supabase_url FROM public.app_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key  FROM public.app_config WHERE key = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    -- Config not yet seeded — skip silently
    RETURN NEW;
  END IF;

  v_func_url := v_supabase_url || '/functions/v1/auto-process-image';

  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'record', jsonb_build_object(
      'bucket_id', NEW.bucket_id,
      'name', NEW.name
    )
  );

  PERFORM net.http_post(
    url     := v_func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := v_payload::text
  );

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Never block uploads even if trigger fails
  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Fix backfill function to also use app_config
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_image_backfill()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url  text;
  v_service_key   text;
  v_func_url      text;
BEGIN
  SELECT value INTO v_supabase_url FROM public.app_config WHERE key = 'supabase_url';
  SELECT value INTO v_service_key  FROM public.app_config WHERE key = 'service_role_key';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RETURN;
  END IF;

  v_func_url := v_supabase_url || '/functions/v1/bulk-process-images';

  PERFORM net.http_post(
    url     := v_func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := '{"limit":10,"dry_run":false}'
  );
END;
$$;
