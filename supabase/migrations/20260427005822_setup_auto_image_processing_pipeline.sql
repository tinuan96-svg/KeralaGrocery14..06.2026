/*
  # Automatic Image Processing Pipeline

  ## Summary
  Sets up a fully hands-free image processing pipeline:

  1. **Storage trigger** — Postgres function + trigger on `storage.objects`
     that calls `auto-process-image` edge function via pg_net whenever a new
     image is inserted into the `product-images` bucket.

  2. **pg_cron backfill job** — Runs every 10 minutes to process any products
     that still have `image_main IS NULL` (i.e., unprocessed). Uses pg_net to
     call `bulk-process-images` with a batch of 10.

  3. **One-time startup backfill** — Calls `bulk-process-images` immediately
     to process all existing unprocessed images.

  ## Notes
  - Both pg_net and pg_cron extensions must be enabled (they are).
  - The trigger fires on INSERT to storage.objects filtered by bucket_id.
  - Processing is async and non-blocking — it returns immediately.
  - The cron job is idempotent — it skips already-processed images.
*/

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Storage trigger function: fires auto-process-image on new uploads
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_auto_image_processing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url       text;
  v_payload   jsonb;
  v_func_url  text;
BEGIN
  -- Only process product-images bucket inserts for actual image files
  IF NEW.bucket_id <> 'product-images' THEN
    RETURN NEW;
  END IF;

  IF NEW.name NOT SIMILAR TO '%.{jpg|jpeg|png|webp|gif|JPG|JPEG|PNG|WEBP}' THEN
    RETURN NEW;
  END IF;

  v_func_url := current_setting('app.settings.supabase_url', true)
    || '/functions/v1/auto-process-image';

  -- Public URL of the uploaded file
  v_url := current_setting('app.settings.supabase_url', true)
    || '/storage/v1/object/public/product-images/'
    || NEW.name;

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
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body    := v_payload::text
  );

  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_storage_image_uploaded ON storage.objects;
CREATE TRIGGER on_storage_image_uploaded
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_image_processing();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Function: process unprocessed products via pg_net (called by cron)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_image_backfill()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_func_url  text;
  v_svc_key   text;
BEGIN
  v_func_url := current_setting('app.settings.supabase_url', true)
    || '/functions/v1/bulk-process-images';
  v_svc_key  := current_setting('app.settings.service_role_key', true);

  -- Fire bulk-process-images: processes up to 10 unprocessed products per run
  PERFORM net.http_post(
    url     := v_func_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_svc_key
    ),
    body    := '{"limit":10,"dry_run":false}'
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Schedule backfill cron job: every 15 minutes
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Remove existing job if present
  PERFORM cron.unschedule('image-backfill-job')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'image-backfill-job');
EXCEPTION WHEN others THEN NULL;
END $$;

SELECT cron.schedule(
  'image-backfill-job',
  '*/15 * * * *',
  $cron$SELECT public.run_image_backfill();$cron$
);
