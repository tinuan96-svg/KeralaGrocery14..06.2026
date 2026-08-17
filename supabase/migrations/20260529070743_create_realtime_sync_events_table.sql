/*
  # Create realtime_sync_events table

  ## Summary
  Stores a log of individual product change events received from CentralHub via
  Supabase Realtime or fallback polling. Used by the Sync Status admin page and
  the frontend to know when product data has changed.

  ## New Tables
  ### realtime_sync_events
  - `id` (uuid, PK)
  - `centralhub_product_id` (uuid) — CentralHub product that changed
  - `event_type` (text) — INSERT | UPDATE | DELETE
  - `status` (text) — success | failed | pending
  - `error_message` (text, nullable) — error detail on failure
  - `payload` (jsonb, nullable) — raw changed fields snapshot
  - `processed_at` (timestamptz) — when this instance processed it
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled, restrictive by default
  - Admins (is_admin = true in app_metadata) can SELECT/INSERT
  - No public access
*/

CREATE TABLE IF NOT EXISTS realtime_sync_events (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centralhub_product_id uuid,
  event_type            text NOT NULL CHECK (event_type IN ('INSERT', 'UPDATE', 'DELETE')),
  status                text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message         text,
  payload               jsonb,
  processed_at          timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_realtime_sync_events_created_at
  ON realtime_sync_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_realtime_sync_events_status
  ON realtime_sync_events (status);

ALTER TABLE realtime_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync events"
  ON realtime_sync_events FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);

CREATE POLICY "Admins can insert sync events"
  ON realtime_sync_events FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true);
