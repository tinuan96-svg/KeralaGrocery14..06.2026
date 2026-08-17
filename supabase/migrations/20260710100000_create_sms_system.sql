-- Migration: Create SMS notification system tables
CREATE TABLE IF NOT EXISTS sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  customer_id uuid,
  phone_number text NOT NULL,
  message text NOT NULL,
  twilio_sid text,
  status text,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sms_enabled boolean DEFAULT true,
  order_confirmed boolean DEFAULT true,
  processing boolean DEFAULT true,
  packed boolean DEFAULT true,
  shipped boolean DEFAULT true,
  out_for_delivery boolean DEFAULT true,
  delivered boolean DEFAULT true,
  cancelled boolean DEFAULT true,
  refunded boolean DEFAULT true,
  payment_failed boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

-- Seed initial settings if not exists
INSERT INTO notification_settings (sms_enabled, order_confirmed, processing, packed, shipped, out_for_delivery, delivered, cancelled, refunded, payment_failed)
VALUES (true, true, true, true, true, true, true, true, true, true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Admin policies using the is_admin() function
CREATE POLICY "Admins can manage sms_logs"
  ON sms_logs FOR ALL
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can manage notification_settings"
  ON notification_settings FOR ALL
  TO authenticated
  USING (is_admin());

-- Allow authenticated users to view their own SMS logs
CREATE POLICY "Users can view own sms_logs"
  ON sms_logs FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

-- Trigger function for automatic SMS notification
CREATE OR REPLACE FUNCTION handle_order_status_for_sms()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
  sms_enabled_val boolean;
BEGIN
  -- Check if SMS is enabled globally
  SELECT sms_enabled INTO sms_enabled_val FROM notification_settings LIMIT 1;
  IF sms_enabled_val IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Only trigger if status changed OR it's a new order OR tracking number added
  IF (TG_OP = 'INSERT') OR
     (OLD.order_status IS DISTINCT FROM NEW.order_status) OR
     (OLD.payment_status IS DISTINCT FROM NEW.payment_status) OR
     (OLD.tracking_number IS DISTINCT FROM NEW.tracking_number) THEN

    -- Get Edge Function Config
    SELECT (value->>'url') INTO edge_function_url FROM app_config WHERE id = 'edge_function_config';
    SELECT (value->>'service_role_key') INTO service_role_key FROM app_config WHERE id = 'edge_function_config';

    IF edge_function_url IS NOT NULL AND service_role_key IS NOT NULL THEN
      PERFORM
        net.http_post(
          url := edge_function_url || '/send-order-sms',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object('orderId', NEW.id)
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on orders table
DROP TRIGGER IF EXISTS trigger_order_sms_notification ON orders;
CREATE TRIGGER trigger_order_sms_notification
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_for_sms();
