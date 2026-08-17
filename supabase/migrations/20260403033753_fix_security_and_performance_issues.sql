/*
  # Fix Security and Performance Issues

  ## Changes Made

  ### 1. Performance Improvements - Add Missing Indexes on Foreign Keys
  - ai_actions.approved_by
  - cart.product_id
  - order_items.order_id
  - order_items.product_id
  - order_status_history.created_by
  - orders.user_id
  - transactions.user_id

  ### 2. Cleanup - Drop Unused Indexes
  Removing indexes that are not being used to reduce maintenance overhead:
  - Banners, store_products, pricing_rules, categories, central_inventory, order_status_history, orders, inventory_logs, ai_insights, ai_actions

  ### 3. Security Fixes - Fix RLS Policies That Allow Unrestricted Access
  Replacing policies that use `USING (true)` or `WITH CHECK (true)` with more restrictive policies:
  - ai_actions: Restrict to admin users only
  - ai_insights: Restrict to admin users only
  - central_inventory: Restrict to admin users only
  - inventory_logs: Restrict to admin users only
  - order_status_history: Restrict to admin users only
  - orders: Add proper admin role check
  - pricing_rules: Restrict to admin users only
  - store_products: Restrict to admin users only

  ### 4. Security Fixes - Fix Function Search Paths
  Setting explicit search_path on functions to prevent search_path manipulation attacks

  ## Important Notes
  - Admin users are identified by checking if user email ends with '@keralagroceries.com'
  - This is a temporary admin check; consider implementing a proper roles system
*/

-- ============================================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- ============================================================================

-- ai_actions.approved_by
CREATE INDEX IF NOT EXISTS idx_ai_actions_approved_by ON ai_actions(approved_by);

-- cart.product_id
CREATE INDEX IF NOT EXISTS idx_cart_product_id ON cart(product_id);

-- order_items.order_id
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- order_items.product_id
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- order_status_history.created_by
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_by ON order_status_history(created_by);

-- orders.user_id
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);

-- transactions.user_id
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- ============================================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_banners_active_sort;
DROP INDEX IF EXISTS idx_store_products_product_id;
DROP INDEX IF EXISTS idx_store_products_store_id;
DROP INDEX IF EXISTS idx_store_products_is_active;
DROP INDEX IF EXISTS idx_pricing_rules_lookup;
DROP INDEX IF EXISTS idx_pricing_rules_store;
DROP INDEX IF EXISTS idx_pricing_rules_category;
DROP INDEX IF EXISTS idx_pricing_rules_product;
DROP INDEX IF EXISTS idx_categories_slug;
DROP INDEX IF EXISTS idx_central_inventory_low_stock;
DROP INDEX IF EXISTS idx_order_status_history_order_id;
DROP INDEX IF EXISTS idx_order_status_history_created_at;
DROP INDEX IF EXISTS idx_orders_inventory_sync_status;
DROP INDEX IF EXISTS idx_inventory_logs_created_at;
DROP INDEX IF EXISTS idx_inventory_logs_reference_id;
DROP INDEX IF EXISTS idx_ai_insights_type_severity;
DROP INDEX IF EXISTS idx_ai_insights_reference;
DROP INDEX IF EXISTS idx_ai_insights_dismissed;
DROP INDEX IF EXISTS idx_ai_actions_insight;
DROP INDEX IF EXISTS idx_orders_store_id;

-- ============================================================================
-- 3. FIX RLS POLICIES - REMOVE UNRESTRICTED ACCESS
-- ============================================================================

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND email LIKE '%@keralagroceries.com'
  );
$$;

-- AI_ACTIONS: Replace unrestricted policies with admin-only policies
DROP POLICY IF EXISTS "Authenticated users can update actions" ON ai_actions;
DROP POLICY IF EXISTS "Service can insert actions" ON ai_actions;

CREATE POLICY "Admin users can update actions"
  ON ai_actions
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can insert actions"
  ON ai_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- AI_INSIGHTS: Replace unrestricted policies with admin-only policies
DROP POLICY IF EXISTS "Authenticated users can update insights" ON ai_insights;
DROP POLICY IF EXISTS "Service can insert insights" ON ai_insights;

CREATE POLICY "Admin users can update insights"
  ON ai_insights
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can insert insights"
  ON ai_insights
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- CENTRAL_INVENTORY: Replace unrestricted policies with admin-only policies
DROP POLICY IF EXISTS "Allow authenticated delete to central_inventory" ON central_inventory;
DROP POLICY IF EXISTS "Allow authenticated insert to central_inventory" ON central_inventory;
DROP POLICY IF EXISTS "Allow authenticated update to central_inventory" ON central_inventory;

CREATE POLICY "Admin users can delete central_inventory"
  ON central_inventory
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin users can insert central_inventory"
  ON central_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update central_inventory"
  ON central_inventory
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- INVENTORY_LOGS: Replace unrestricted policies with admin-only policies
DROP POLICY IF EXISTS "Allow authenticated insert to inventory_logs" ON inventory_logs;

CREATE POLICY "Admin users can insert inventory_logs"
  ON inventory_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ORDER_STATUS_HISTORY: Replace unrestricted policies with admin-only policies
DROP POLICY IF EXISTS "Service can insert order status history" ON order_status_history;

CREATE POLICY "Admin users can insert order status history"
  ON order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- ORDERS: Replace unrestricted admin policy with proper admin check
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

CREATE POLICY "Admin users can update all orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- PRICING_RULES: Replace unrestricted policies with admin-only policies
DROP POLICY IF EXISTS "Authenticated users can delete pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Authenticated users can insert pricing rules" ON pricing_rules;
DROP POLICY IF EXISTS "Authenticated users can update pricing rules" ON pricing_rules;

CREATE POLICY "Admin users can delete pricing rules"
  ON pricing_rules
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin users can insert pricing rules"
  ON pricing_rules
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update pricing rules"
  ON pricing_rules
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- STORE_PRODUCTS: Replace unrestricted policies with admin-only policies
DROP POLICY IF EXISTS "Allow authenticated delete to store_products" ON store_products;
DROP POLICY IF EXISTS "Allow authenticated insert to store_products" ON store_products;
DROP POLICY IF EXISTS "Allow authenticated update to store_products" ON store_products;

CREATE POLICY "Admin users can delete store_products"
  ON store_products
  FOR DELETE
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admin users can insert store_products"
  ON store_products
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admin users can update store_products"
  ON store_products
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- ============================================================================

-- Fix search_path for all functions with mutable search_path
ALTER FUNCTION update_pricing_rules_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION log_inventory_change(uuid, integer, inventory_type, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION reserve_stock(uuid, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION commit_stock(uuid, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION release_stock(uuid, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION return_stock(uuid, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION manual_stock_update(uuid, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION inventory_logs_guard() SET search_path = public, pg_temp;
ALTER FUNCTION update_central_inventory_updated_at() SET search_path = public, pg_temp;