-- Refactor SMS templates to support Order Status and Shipment updates separately

-- 1. Update the trigger to include shipment_status in the change detection
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

  -- Only trigger if status changed OR it's a new order OR tracking/shipment info added
  IF (TG_OP = 'INSERT') OR
     (OLD.order_status IS DISTINCT FROM NEW.order_status) OR
     (OLD.payment_status IS DISTINCT FROM NEW.payment_status) OR
     (OLD.tracking_number IS DISTINCT FROM NEW.tracking_number) OR
     (OLD.shipment_status IS DISTINCT FROM NEW.shipment_status) THEN

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
