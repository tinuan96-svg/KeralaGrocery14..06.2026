/*
  # Create wallet_processing_logs table

  ## Summary
  Creates an audit log table for every wallet cycle processing run.
  Each row captures who triggered the run, when it started/finished,
  what was processed, and any error messages.

  ## New Tables
  - `wallet_processing_logs` – one row per processing run

  ## Security
  - RLS enabled; admins can SELECT/INSERT/UPDATE; service_role has full access
*/

CREATE TABLE IF NOT EXISTS wallet_processing_logs (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_by          text          NOT NULL DEFAULT 'cron'
                          CHECK (triggered_by IN ('cron', 'admin_manual')),
  triggered_by_user_id  uuid          REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at            timestamptz   NOT NULL DEFAULT now(),
  finished_at           timestamptz,
  status                text          NOT NULL DEFAULT 'running'
                          CHECK (status IN ('running', 'success', 'error')),
  cycles_created        integer       NOT NULL DEFAULT 0,
  cycles_processed      integer       NOT NULL DEFAULT 0,
  cashback_awarded      numeric(10,2) NOT NULL DEFAULT 0,
  cashback_expired      numeric(10,2) NOT NULL DEFAULT 0,
  error_message         text,
  summary               jsonb
);

ALTER TABLE wallet_processing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can select processing logs"
  ON wallet_processing_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can insert processing logs"
  ON wallet_processing_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update processing logs"
  ON wallet_processing_logs FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Service role (used by the Edge Function) has unrestricted access.
CREATE POLICY "Service role full access to processing logs"
  ON wallet_processing_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wallet_processing_logs_started_at
  ON wallet_processing_logs (started_at DESC);
