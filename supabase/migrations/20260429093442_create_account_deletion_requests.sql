/*
  # Create account_deletion_requests table

  ## Purpose
  Stores GDPR "right to erasure" requests from users who want their account deleted.
  Rather than immediately deleting (which would break order/financial records), we
  log the request for an admin to process within the statutory 30-day window.

  ## New Table: account_deletion_requests
  - id            uuid PK
  - user_id       uuid (references auth.users, nullable so record survives if auth user is removed first)
  - email         text — captured at request time for reference
  - reason        text — optional reason provided by the user
  - status        text — 'pending' | 'processed' | 'cancelled'
  - requested_at  timestamptz
  - processed_at  timestamptz nullable

  ## Security
  - RLS enabled
  - Users can INSERT their own request and SELECT their own requests
  - Only service_role can update status (admin processing)
*/

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email         text NOT NULL DEFAULT '',
  reason        text DEFAULT '',
  status        text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processed', 'cancelled')),
  requested_at  timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz
);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own deletion request"
  ON account_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own deletion requests"
  ON account_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_user_id
  ON account_deletion_requests (user_id);

CREATE INDEX IF NOT EXISTS idx_account_deletion_requests_status
  ON account_deletion_requests (status)
  WHERE status = 'pending';
