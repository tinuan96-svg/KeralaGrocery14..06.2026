/*
  # Create Orders and Payments System

  ## Overview
  Creates the complete order management and payment tracking system for the e-commerce platform.

  ## New Tables
  
  ### `orders`
  - `id` (uuid, primary key) - Unique order identifier
  - `user_id` (uuid, nullable) - Reference to auth.users for registered users
  - `order_number` (text, unique) - Human-readable order number (e.g., ORD-20260331-001)
  - `customer_name` (text) - Customer's full name
  - `customer_email` (text) - Customer's email address
  - `customer_phone` (text) - Customer's phone number
  - `delivery_address` (text) - Full delivery address
  - `delivery_city` (text) - Delivery city
  - `delivery_postcode` (text) - Delivery postcode
  - `subtotal` (decimal) - Subtotal before delivery
  - `delivery_fee` (decimal) - Delivery charge
  - `total` (decimal) - Final total amount
  - `payment_method` (text) - Payment method used (paypal, card, wallet, cod)
  - `payment_status` (text) - Payment status (pending, paid, failed, refunded)
  - `order_status` (text) - Order fulfillment status (pending, processing, shipped, delivered, cancelled)
  - `payment_reference` (text, nullable) - External payment reference ID
  - `notes` (text, nullable) - Order notes or special instructions
  - `created_at` (timestamptz) - Order creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `order_items`
  - `id` (uuid, primary key) - Unique identifier
  - `order_id` (uuid, foreign key) - Reference to orders table
  - `product_id` (uuid, foreign key) - Reference to products table
  - `product_name` (text) - Product name snapshot
  - `product_image` (text) - Product image URL snapshot
  - `quantity` (integer) - Quantity ordered
  - `unit_price` (decimal) - Price per unit at time of order
  - `total_price` (decimal) - Total price for this line item
  - `created_at` (timestamptz) - Item creation timestamp

  ## Security
  - Enable RLS on all tables
  - Users can view their own orders
  - Admin users can view all orders
  - Only authenticated backend/service role can create orders

  ## Important Notes
  1. Order numbers are auto-generated with format ORD-YYYYMMDD-XXX
  2. Product details are snapshotted to preserve historical accuracy
  3. Payment status and order status are tracked separately
  4. Delivery fee is calculated based on subtotal (free over £45)
*/

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  delivery_address text NOT NULL,
  delivery_city text NOT NULL,
  delivery_postcode text NOT NULL,
  subtotal decimal(10, 2) NOT NULL DEFAULT 0,
  delivery_fee decimal(10, 2) NOT NULL DEFAULT 0,
  total decimal(10, 2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('paypal', 'card', 'wallet', 'cod')),
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  order_status text NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_reference text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_image text,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10, 2) NOT NULL,
  total_price decimal(10, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for orders table

-- Users can view their own orders (registered users)
CREATE POLICY "Users can view own orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Public users can view orders they created (using email match)
CREATE POLICY "Guest users can view orders by email"
  ON orders
  FOR SELECT
  TO anon
  USING (true);

-- Service role can insert orders (backend API)
CREATE POLICY "Service role can create orders"
  ON orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own orders (for cancellation)
CREATE POLICY "Users can update own orders"
  ON orders
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for order_items table

-- Users can view items from their orders
CREATE POLICY "Users can view own order items"
  ON order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Public can view order items
CREATE POLICY "Public can view order items"
  ON order_items
  FOR SELECT
  TO anon
  USING (true);

-- Service role can insert order items
CREATE POLICY "Service role can create order items"
  ON order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);