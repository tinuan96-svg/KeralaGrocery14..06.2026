-- Add SMS template
INSERT INTO twilio_templates (name, content_sid, channel, active)
VALUES ('order_status_update_sms', 'HX00000000000000000000000000000001', 'sms', true)
ON CONFLICT (name) DO NOTHING;

-- Ensure message_logs has channel info if we want to distinguish
ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS channel text DEFAULT 'whatsapp';
