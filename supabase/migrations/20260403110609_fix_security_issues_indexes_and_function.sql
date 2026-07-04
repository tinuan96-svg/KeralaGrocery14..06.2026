/*
  # Fix Security Issues - Indexes and Function Search Path

  ## Changes

  1. **Add Indexes for Unindexed Foreign Keys**
     - `ai_actions.approved_by` - Index for user lookup
     - `ai_actions.insight_id` - Index for insight lookup
     - `cart.product_id` - Index for product lookup
     - `inventory_logs.store_id` - Index for store lookup
     - `order_items.order_id` - Index for order lookup
     - `order_status_history.created_by` - Index for user lookup
     - `order_status_history.order_id` - Index for order lookup
     - `orders.store_id` - Index for store lookup
     - `orders.user_id` - Index for user lookup
     - `pricing_rules.category_id` - Index for category lookup
     - `pricing_rules.product_id` - Index for product lookup
     - `pricing_rules.store_id` - Index for store lookup
     - `product_sync_logs.created_by` - Index for user lookup
     - `product_sync_logs.product_id` - Index for product lookup
     - `product_sync_logs.store_id` - Index for store lookup
     - `transactions.user_id` - Index for user lookup
     - `user_actions.user_id` - Index for user lookup

  2. **Fix Function Search Path**
     - Recreate `generate_sku()` function with stable search_path

  ## Performance Impact
     - Significantly improves query performance for foreign key lookups
     - Reduces database load for common join operations
     - Enhances overall application responsiveness

  ## Security Impact
     - Fixes function search_path vulnerability
     - Improves query performance which helps prevent DoS scenarios
*/

-- Add indexes for ai_actions table
CREATE INDEX IF NOT EXISTS idx_ai_actions_approved_by 
  ON ai_actions(approved_by);

CREATE INDEX IF NOT EXISTS idx_ai_actions_insight_id 
  ON ai_actions(insight_id);

-- Add index for cart table
CREATE INDEX IF NOT EXISTS idx_cart_product_id 
  ON cart(product_id);

-- Add index for inventory_logs table
CREATE INDEX IF NOT EXISTS idx_inventory_logs_store_id 
  ON inventory_logs(store_id);

-- Add index for order_items table
CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
  ON order_items(order_id);

-- Add indexes for order_status_history table
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_by 
  ON order_status_history(created_by);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id 
  ON order_status_history(order_id);

-- Add indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_store_id 
  ON orders(store_id);

CREATE INDEX IF NOT EXISTS idx_orders_user_id 
  ON orders(user_id);

-- Add indexes for pricing_rules table
CREATE INDEX IF NOT EXISTS idx_pricing_rules_category_id 
  ON pricing_rules(category_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_product_id 
  ON pricing_rules(product_id);

CREATE INDEX IF NOT EXISTS idx_pricing_rules_store_id 
  ON pricing_rules(store_id);

-- Add indexes for product_sync_logs table
CREATE INDEX IF NOT EXISTS idx_product_sync_logs_created_by 
  ON product_sync_logs(created_by);

CREATE INDEX IF NOT EXISTS idx_product_sync_logs_product_id 
  ON product_sync_logs(product_id);

CREATE INDEX IF NOT EXISTS idx_product_sync_logs_store_id 
  ON product_sync_logs(store_id);

-- Add index for transactions table
CREATE INDEX IF NOT EXISTS idx_transactions_user_id 
  ON transactions(user_id);

-- Add index for user_actions table
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id 
  ON user_actions(user_id);

-- Fix function search_path vulnerability
-- Recreate generate_sku function with stable search_path
CREATE OR REPLACE FUNCTION generate_sku()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_sku TEXT;
  sku_exists BOOLEAN;
BEGIN
  LOOP
    new_sku := 'SKU-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    SELECT EXISTS(SELECT 1 FROM products WHERE sku = new_sku) INTO sku_exists;
    
    IF NOT sku_exists THEN
      RETURN new_sku;
    END IF;
  END LOOP;
END;
$$;
