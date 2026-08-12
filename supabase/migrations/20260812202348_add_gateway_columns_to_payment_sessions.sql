-- Add gateway tracking columns to payment_sessions
ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS gateway text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS gateway_session_id text;
