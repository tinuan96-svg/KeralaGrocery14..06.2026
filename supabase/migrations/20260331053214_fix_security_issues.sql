/*
  # Fix Security Issues

  ## Overview
  Resolves security and performance issues identified by Supabase security advisor

  ## Changes

  1. **Add Missing Index**
     - Add index for transactions.user_id foreign key for better query performance

  2. **Optimize RLS Policies**
     - Replace `auth.uid()` with `(select auth.uid())` to prevent re-evaluation per row
     - Fix overly permissive INSERT policies for orders and order_items
     - Remove duplicate product policies

  3. **Fix Function Search Paths**
     - Add SECURITY DEFINER and set search_path for functions to prevent injection

  ## Security Notes
  - RLS policies now properly validate user ownership
  - Functions are protected against search_path manipulation
  - Indexes added for better query performance
*/

-- 1. Add index for transactions table foreign key
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- 2. Drop and recreate optimized RLS policies for orders table

DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own orders" ON orders;
CREATE POLICY "Users can update own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can create orders" ON orders;

-- Add proper INSERT policies for authenticated and anonymous users
CREATE POLICY "Authenticated users can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = (select auth.uid())
  );

CREATE POLICY "Anonymous users can create orders"
  ON orders
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- 3. Drop and recreate optimized RLS policies for order_items table

DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = (select auth.uid())
    )
  );

-- Drop the overly permissive service role policy
DROP POLICY IF EXISTS "Service role can create order items" ON order_items;

-- Add proper INSERT policies for order items
CREATE POLICY "Users can create order items for their orders"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.user_id = (select auth.uid()) OR orders.user_id IS NULL)
    )
  );

CREATE POLICY "Anonymous users can create order items"
  ON order_items
  FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id IS NULL
    )
  );

-- 4. Remove duplicate product policies
-- Keep only the "Anyone can view active products" policy
DROP POLICY IF EXISTS "Authenticated users can view all products" ON products;

-- 5. Fix function search paths to prevent injection

-- Recreate generate_order_number with security definer and fixed search_path
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  date_part text;
  sequence_num integer;
  order_num text;
BEGIN
  date_part := to_char(CURRENT_DATE, 'YYYYMMDD');
  
  -- Get the count of orders created today
  SELECT COUNT(*) + 1 INTO sequence_num
  FROM orders
  WHERE order_number LIKE 'ORD-' || date_part || '-%';
  
  order_num := 'ORD-' || date_part || '-' || LPAD(sequence_num::text, 3, '0');
  
  RETURN order_num;
END;
$$;

-- Recreate update_updated_at_column with security definer and fixed search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_order_number() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_updated_at_column() TO authenticated, anon;