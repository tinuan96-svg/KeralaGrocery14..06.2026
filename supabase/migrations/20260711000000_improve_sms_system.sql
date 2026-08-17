-- Improve SMS logging searchability, constraints and performance

-- 1. Ensure only one row in notification_settings
-- We use a fixed ID for the settings row to make it easy to manage
INSERT INTO notification_settings (id, sms_enabled)
VALUES ('00000000-0000-0000-0000-000000000001', true)
ON CONFLICT DO NOTHING;

-- 2. Create a view for better searching in the admin dashboard
CREATE OR REPLACE VIEW sms_logs_with_details AS
SELECT
    l.*,
    o.order_number,
    o.customer_name as order_customer_name
FROM sms_logs l
LEFT JOIN orders o ON l.order_id = o.id;

-- 3. Grant access to the view
GRANT SELECT ON sms_logs_with_details TO authenticated;

-- 4. Fix the search path in the trigger function and ensure it uses the latest logic
-- Also update handle_order_status_for_sms to be more robust
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

    -- Get Edge Function Config from app_config
    SELECT (value->>'url') INTO edge_function_url FROM app_config WHERE id = 'edge_function_config';
    SELECT (value->>'service_role_key') INTO service_role_key FROM app_config WHERE id = 'edge_function_config';

    IF edge_function_url IS NOT NULL AND service_role_key IS NOT NULL AND edge_function_url != '' THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, net, pg_catalog;

-- 5. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_order_id ON sms_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone_number ON sms_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
