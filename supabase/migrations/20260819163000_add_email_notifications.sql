/*
  # Add Email Notifications via Resend

  1. Updates the `handle_order_status_change` function to also trigger `send-order-email` edge function.
  2. Adds an INSERT trigger to `orders` table to send confirmation emails.
*/

-- 1. Update the order status change handler to include emails
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Only trigger if status changed OR it's a new record (INSERT)
  IF (TG_OP = 'INSERT') OR (OLD.order_status IS DISTINCT FROM NEW.order_status) THEN
    -- Look for 'edge_function_config' in app_config
    SELECT (value->>'url') INTO edge_function_url FROM app_config WHERE id = 'edge_function_config';
    SELECT (value->>'service_role_key') INTO service_role_key FROM app_config WHERE id = 'edge_function_config';

    IF edge_function_url IS NOT NULL AND service_role_key IS NOT NULL THEN
      -- Trigger WhatsApp/SMS function
      PERFORM
        net.http_post(
          url := edge_function_url || '/send-order-status',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || service_role_key
          ),
          body := jsonb_build_object('orderId', NEW.id)
        );

      -- Trigger Email function (Resend)
      PERFORM
        net.http_post(
          url := edge_function_url || '/send-order-email',
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
$function$;

-- 2. Ensure trigger runs on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_order_status_notification ON orders;
CREATE TRIGGER trigger_order_status_notification
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_change();
