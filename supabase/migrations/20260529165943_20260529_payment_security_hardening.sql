/*
  # Payment Security Hardening

  ## Summary
  Implements all critical and high-severity fixes identified in the payment audit.

  ## New Tables
  1. `payment_errors` — persists every payment failure for admin diagnostics
     - order_number, source, error_message, raw_payload, created_at
  2. `webhook_logs` — persists every incoming Worldpay webhook event
     - order_number, event_type, status, error_message, raw_payload, processed_at
  3. `payment_sessions` — idempotency store for Worldpay payment page sessions
     - order_number (unique), payment_url, amount_pence, status, created_at
  4. `order_idempotency` — deduplicates create-order requests
     - idempotency_key (unique), order_id, order_number, created_at

  ## Security Changes
  - DROP "Anon can create orders" — anonymous users can no longer INSERT orders directly
  - DROP "Anon can create order items" — anonymous users can no longer INSERT order items directly
  - DROP "Users can create orders" — authenticated users can no longer INSERT orders directly
  - DROP "Users can create order items" — authenticated users can no longer INSERT order items directly
  - All order/order_item creation is now routed exclusively through the create-order
    edge function which runs as service_role
  - Users retain SELECT on their own orders and order_items

  ## Important Notes
  - All new tables have RLS enabled
  - payment_errors and webhook_logs are admin-read-only
  - payment_sessions and order_idempotency are service_role-only
*/

-- ── payment_errors ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_errors (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text,
  source        text        NOT NULL,
  error_message text        NOT NULL,
  raw_payload   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_errors_order_number ON payment_errors (order_number);
CREATE INDEX IF NOT EXISTS idx_payment_errors_created_at  ON payment_errors (created_at DESC);

ALTER TABLE payment_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read payment errors"
  ON payment_errors FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can insert payment errors"
  ON payment_errors FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ── webhook_logs ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text,
  event_type    text        NOT NULL,
  status        text        NOT NULL DEFAULT 'processing',
  error_message text,
  raw_payload   text,
  processed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_order_number ON webhook_logs (order_number);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at   ON webhook_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status        ON webhook_logs (status);

ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read webhook logs"
  ON webhook_logs FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can manage webhook logs"
  ON webhook_logs FOR ALL
  TO service_role
  WITH CHECK (true);

-- ── payment_sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_sessions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number  text        NOT NULL UNIQUE,
  payment_url   text        NOT NULL,
  amount_pence  integer     NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','paid','failed','expired')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_sessions_order_number ON payment_sessions (order_number);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_created_at   ON payment_sessions (created_at DESC);

ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read payment sessions"
  ON payment_sessions FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can manage payment sessions"
  ON payment_sessions FOR ALL
  TO service_role
  WITH CHECK (true);

-- ── order_idempotency ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_idempotency (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text        NOT NULL UNIQUE,
  order_id        uuid        NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number    text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_key        ON order_idempotency (idempotency_key);
CREATE INDEX IF NOT EXISTS idx_order_idempotency_created_at ON order_idempotency (created_at DESC);

ALTER TABLE order_idempotency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage order idempotency"
  ON order_idempotency FOR ALL
  TO service_role
  WITH CHECK (true);

-- ── Compound index on orders for customer history queries ─────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON orders (user_id, created_at DESC);

-- ── Harden orders RLS — remove all direct INSERT/UPDATE from clients ──────────
-- Order creation and status updates must go through service_role edge functions.

DROP POLICY IF EXISTS "Anon can create orders"     ON orders;
DROP POLICY IF EXISTS "Users can create orders"    ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;

-- ── Harden order_items RLS ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anon can create order items"  ON order_items;
DROP POLICY IF EXISTS "Anon can read order items"    ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;
