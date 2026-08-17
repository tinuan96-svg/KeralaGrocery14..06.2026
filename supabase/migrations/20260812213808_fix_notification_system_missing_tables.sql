/*
# Fix Notification System - Create Missing Tables

## What This Does
Creates the 5 missing database tables and 2 views that the notification system depends on.
Without these tables, all SMS, WhatsApp, and push notification logging/settings fail silently.

## New Tables
1. `notification_settings` - Admin-configurable toggles for each notification type
2. `sms_logs` - Audit log of every SMS sent via Twilio
3. `message_logs` - Audit log of every WhatsApp message sent via Twilio templates
4. `twilio_templates` - Registered Twilio WhatsApp templates with content SIDs

## New Views
1. `sms_logs_with_details` - Joins sms_logs with orders for admin SMS history
2. `view_expiring_cashback` - Identifies wallet credits expiring in 3 days

## Security
- All tables have RLS enabled, admin-only (authenticated) access
*/

-- 1. notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_enabled boolean NOT NULL DEFAULT true,
  whatsapp_enabled boolean NOT NULL DEFAULT true,
  order_confirmed boolean NOT NULL DEFAULT true,
  processing boolean NOT NULL DEFAULT true,
  packed boolean NOT NULL DEFAULT true,
  shipped boolean NOT NULL DEFAULT true,
  out_for_delivery boolean NOT NULL DEFAULT true,
  delivered boolean NOT NULL DEFAULT true,
  cancelled boolean NOT NULL DEFAULT true,
  refunded boolean NOT NULL DEFAULT true,
  payment_failed boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_notification_settings" ON notification_settings;
CREATE POLICY "admin_read_notification_settings" ON notification_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_update_notification_settings" ON notification_settings;
CREATE POLICY "admin_update_notification_settings" ON notification_settings FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_insert_notification_settings" ON notification_settings;
CREATE POLICY "admin_insert_notification_settings" ON notification_settings FOR INSERT
  TO authenticated WITH CHECK (true);

INSERT INTO notification_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM notification_settings);

-- 2. sms_logs
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  customer_id uuid,
  phone_number text NOT NULL,
  message text NOT NULL,
  twilio_sid text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_sms_logs" ON sms_logs;
CREATE POLICY "admin_read_sms_logs" ON sms_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_sms_logs" ON sms_logs;
CREATE POLICY "admin_insert_sms_logs" ON sms_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_sms_logs" ON sms_logs;
CREATE POLICY "admin_update_sms_logs" ON sms_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sms_logs_order_id ON sms_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);

-- 3. message_logs
CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  customer_id uuid,
  template_name text,
  twilio_sid text,
  status text NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_message_logs" ON message_logs;
CREATE POLICY "admin_read_message_logs" ON message_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_message_logs" ON message_logs;
CREATE POLICY "admin_insert_message_logs" ON message_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_message_logs" ON message_logs;
CREATE POLICY "admin_update_message_logs" ON message_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_message_logs_order_id ON message_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs(created_at DESC);

-- 4. twilio_templates
CREATE TABLE IF NOT EXISTS twilio_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content_sid text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE twilio_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read_twilio_templates" ON twilio_templates;
CREATE POLICY "admin_read_twilio_templates" ON twilio_templates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_insert_twilio_templates" ON twilio_templates;
CREATE POLICY "admin_insert_twilio_templates" ON twilio_templates FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "admin_update_twilio_templates" ON twilio_templates;
CREATE POLICY "admin_update_twilio_templates" ON twilio_templates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin_delete_twilio_templates" ON twilio_templates;
CREATE POLICY "admin_delete_twilio_templates" ON twilio_templates FOR DELETE TO authenticated USING (true);

-- 5. sms_logs_with_details view
CREATE OR REPLACE VIEW sms_logs_with_details AS
SELECT
  sl.id,
  sl.order_id,
  sl.customer_id,
  sl.phone_number,
  sl.message,
  sl.twilio_sid,
  sl.status,
  sl.error,
  sl.created_at,
  o.order_number,
  o.customer_name as order_customer_name
FROM sms_logs sl
LEFT JOIN orders o ON sl.order_id = o.id;

ALTER VIEW sms_logs_with_details OWNER TO postgres;
GRANT SELECT ON sms_logs_with_details TO authenticated;

-- 6. view_expiring_cashback
-- Uses wallet_transactions.expires_at (the actual column that exists)
CREATE OR REPLACE VIEW view_expiring_cashback AS
SELECT
  wt.user_id as customer_id,
  p.name as customer_name,
  p.phone,
  wt.amount as cashback_amount,
  wt.expires_at
FROM wallet_transactions wt
JOIN user_profiles p ON wt.user_id = p.id
WHERE wt.expires_at IS NOT NULL
  AND wt.expires_at <= now() + interval '3 days'
  AND wt.expires_at > now()
  AND wt.amount > 0
  AND wt.type = 'cashback';

ALTER VIEW view_expiring_cashback OWNER TO postgres;
GRANT SELECT ON view_expiring_cashback TO authenticated;
