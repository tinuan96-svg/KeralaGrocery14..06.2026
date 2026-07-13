-- Create cart_items table for persistent cross-device carts
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart items"
  ON cart_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create table to track sent recovery notifications
CREATE TABLE IF NOT EXISTS abandoned_cart_recovery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_notified_at timestamptz DEFAULT now(),
  cart_total numeric,
  recovery_token text,
  status text DEFAULT 'sent' -- 'sent', 'recovered', 'failed'
);

ALTER TABLE abandoned_cart_recovery_logs ENABLE ROW LEVEL SECURITY;

-- Index for cron job performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_updated ON cart_items(user_id, updated_at);

-- Function to handle abandoned cart identification (logic for an external cron)
-- This view identifies users who have items in their cart for > 2 hours but haven't placed an order
CREATE OR REPLACE VIEW view_abandoned_carts AS
SELECT
  u.id as user_id,
  p.phone,
  p.name as customer_name,
  SUM(pr.price * ci.quantity) as cart_total,
  MAX(ci.updated_at) as last_activity
FROM cart_items ci
JOIN auth.users u ON ci.user_id = u.id
JOIN user_profiles p ON u.id = p.id
JOIN products pr ON ci.product_id = pr.id
LEFT JOIN orders o ON u.id = o.user_id AND o.created_at > ci.updated_at
WHERE o.id IS NULL -- No order placed after last cart activity
  AND ci.updated_at < (now() - interval '2 hours') -- Abandoned for 2+ hours
  AND ci.updated_at > (now() - interval '24 hours') -- Not too old
  AND p.phone IS NOT NULL
  AND p.phone_verified = true
GROUP BY u.id, p.phone, p.name;
