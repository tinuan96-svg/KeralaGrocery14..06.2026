/*
  # Enable pg_cron + pg_net and schedule daily wallet cycle processing

  ## Summary
  Enables pg_cron and pg_net extensions, then schedules the
  process-wallet-cycles Edge Function to run at 02:00 UTC every day.

  The cron job calls the function with a service-role Bearer token
  so the function can verify it is an internal/scheduled invocation.

  ## Notes
  1. pg_cron jobs run as the `postgres` superuser in the `cron` schema.
  2. pg_net.http_post is used to invoke the Edge Function via HTTP.
  3. The Supabase URL and service-role key are read from app-level
     database settings (set automatically by Supabase platform).
  4. If either extension is already enabled this is a no-op.
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron  WITH SCHEMA cron;
CREATE EXTENSION IF NOT EXISTS pg_net   WITH SCHEMA extensions;

-- Grant cron usage to postgres role (needed on some Supabase tiers)
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL  ON ALL TABLES IN SCHEMA cron TO postgres;

-- Remove any pre-existing job with this name, then recreate it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-wallet-cycles-daily') THEN
    PERFORM cron.unschedule('process-wallet-cycles-daily');
  END IF;
END $$;

-- Schedule: daily at 02:00 UTC
SELECT cron.schedule(
  'process-wallet-cycles-daily',
  '0 2 * * *',
  $cron$
  SELECT extensions.http_post(
    url     := (SELECT value FROM app_config WHERE key = 'supabase_url') || '/functions/v1/process-wallet-cycles',
    headers := json_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (SELECT value FROM app_config WHERE key = 'service_role_key')
               )::jsonb,
    body    := '{"triggered_by":"cron"}'::jsonb
  )
  $cron$
);
