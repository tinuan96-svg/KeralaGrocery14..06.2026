/*
  # Create order_notifications table

  Logs every order confirmation message attempt so failures are auditable
  and customer service can see what was sent.

  ## New table: order_notifications
  - id            uuid PK
  - order_id      uuid (FK → orders, nullable in case of orphan logs)
  - order_number  text
  - phone         text  — E.164 recipient
  - channel       text  — 'whatsapp' | 'sms'
  - status        text  — 'sent' | 'failed'
  - error         text  — Twilio error message when failed
  - message_sid   text  — Twilio message SID on success
  - created_at    timestamptz

  ## Security
  - RLS enabled; only service role can insert (edge functions use service key)
  - Authenticated users can read their own order notifications
  - No public access
*/

CREATE TABLE IF NOT EXISTS order_notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid REFERENCES orders(id) ON DELETE SET NULL,
  order_number text NOT NULL DEFAULT '',
  phone        text NOT NULL,
  channel      text NOT NULL CHECK (channel IN ('whatsapp', 'sms')),
  status       text NOT NULL CHECK (status IN ('sent', 'failed')),
  error        text,
  message_sid  text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_notifications ENABLE ROW LEVEL SECURITY;

-- Authenticated users can see notifications for their own orders
CREATE POLICY "Users can view own order notifications"
  ON order_notifications
  FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_order_notifications_order_id
  ON order_notifications (order_id);

CREATE INDEX IF NOT EXISTS idx_order_notifications_created_at
  ON order_notifications (created_at DESC);
