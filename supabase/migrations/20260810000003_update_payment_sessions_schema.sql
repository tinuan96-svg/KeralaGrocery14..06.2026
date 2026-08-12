-- Update payment_sessions to support multiple gateways
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS gateway text DEFAULT 'worldpay';
ALTER TABLE payment_sessions ADD COLUMN IF NOT EXISTS gateway_session_id text;

-- Add index for session lookup
CREATE INDEX IF NOT EXISTS idx_payment_sessions_gateway_session_id ON payment_sessions (gateway_session_id);
