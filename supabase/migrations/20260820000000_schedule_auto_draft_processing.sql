/*
  # Schedule automatic draft processing

  Schedules the auto-process-drafts Edge Function to run every 15 minutes.
  This automates the pricing, category assignment, and description generation
  for new draft products without requiring a manual button click.
*/

-- Remove any pre-existing job with this name, then recreate it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-process-drafts-cron') THEN
    PERFORM cron.unschedule('auto-process-drafts-cron');
  END IF;
END $$;

-- Schedule: every 15 minutes
SELECT cron.schedule(
  'auto-process-drafts-cron',
  '*/15 * * * *',
  $cron$
  SELECT extensions.http_post(
    url     := (SELECT value FROM public.app_config WHERE key = 'supabase_url') || '/functions/v1/auto-process-drafts',
    headers := json_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (SELECT value FROM public.app_config WHERE key = 'service_role_key')
               )::jsonb,
    body    := '{}'::jsonb
  )
  $cron$
);
