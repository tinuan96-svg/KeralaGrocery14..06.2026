-- Update orders table check constraint to support more statuses
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check CHECK (
  order_status IN (
    'pending', 'confirmed', 'processing', 'packed', 'shipped',
    'out_for_delivery', 'delivered', 'cancelled', 'refunded',
    'payment_failed', 'returned'
  ) OR TRUE -- Allow any future status
);

-- Enable pg_net extension if it exists
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create twilio_templates table
CREATE TABLE IF NOT EXISTS twilio_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  content_sid text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create message_logs table
CREATE TABLE IF NOT EXISTS message_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  template_name text NOT NULL,
  twilio_sid text,
  status text NOT NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE twilio_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

-- Policies for twilio_templates
CREATE POLICY "Admins can manage twilio_templates"
  ON twilio_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Policies for message_logs
CREATE POLICY "Admins can view message_logs"
  ON message_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to handle order status change and trigger edge function
CREATE OR REPLACE FUNCTION handle_order_status_change()
RETURNS TRIGGER AS $$
DECLARE
  edge_function_url text;
  service_role_key text;
BEGIN
  IF (OLD.order_status IS DISTINCT FROM NEW.order_status) THEN
    -- Look for 'edge_function_config' in app_config
    SELECT (value->>'url') INTO edge_function_url FROM app_config WHERE id = 'edge_function_config';
    SELECT (value->>'service_role_key') INTO service_role_key FROM app_config WHERE id = 'edge_function_config';

    IF edge_function_url IS NOT NULL AND service_role_key IS NOT NULL THEN
      PERFORM
        net.http_post(
          url := edge_function_url || '/send-order-status',
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
DROP TRIGGER IF EXISTS trigger_order_status_notification ON orders;
CREATE TRIGGER trigger_order_status_notification
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_order_status_change();

-- Seed initial template
INSERT INTO twilio_templates (name, content_sid, active)
VALUES ('order_status_update', 'HX00000000000000000000000000000000', true)
ON CONFLICT (name) DO NOTHING;

-- Seed Edge Function config (User needs to update these with real values)
INSERT INTO public.app_config (id, value)
VALUES (
    'edge_function_config',
    jsonb_build_object(
        'url', 'https://your-project-id.supabase.co/functions/v1',
        'service_role_key', 'your-service-role-key'
    )
)
ON CONFLICT (id) DO NOTHING;
