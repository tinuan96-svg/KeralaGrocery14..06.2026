/*
  # Kerala Grocery UK - Initial Database Schema

  1. New Tables
    - `stores`
      - `id` (uuid, primary key) - Unique identifier for each store
      - `name` (text, not null) - Store name
      - `created_at` (timestamptz) - Timestamp when store was created
      
    - `categories`
      - `id` (uuid, primary key) - Unique identifier for each category
      - `name` (text, not null) - Category name
      - `slug` (text, unique, not null) - URL-friendly category identifier
      
    - `products`
      - `id` (uuid, primary key) - Unique identifier for each product
      - `name` (text, not null) - Product name
      - `slug` (text, unique, not null) - URL-friendly product identifier
      - `description` (text) - Product description
      - `image_url` (text) - URL to product image
      - `created_at` (timestamptz) - Timestamp when product was created
      
    - `store_products`
      - `id` (uuid, primary key) - Unique identifier
      - `store_id` (uuid, foreign key) - References stores table
      - `product_id` (uuid, foreign key) - References products table
      - `price` (numeric, not null) - Product price in the store
      - `stock` (integer, not null, default 0) - Available stock quantity
      - `is_active` (boolean, default true) - Whether product is active/visible
      
  2. Security
    - Enable RLS on all tables
    - Add public read policies for all tables (ecommerce data is publicly viewable)
    - Admin operations will be handled separately
    
  3. Important Notes
    - All tables use UUID primary keys for scalability
    - Timestamps use timestamptz for timezone awareness
    - Foreign keys have ON DELETE CASCADE for data integrity
    - Unique constraints on slugs prevent duplicates
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

-- Create store_products table (junction table with pricing and inventory)
CREATE TABLE IF NOT EXISTS store_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price numeric(10, 2) NOT NULL,
  stock integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  UNIQUE(store_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read access for ecommerce data
CREATE POLICY "Allow public read access to stores"
  ON stores FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to store_products"
  ON store_products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_store_products_store_id ON store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_products_product_id ON store_products(product_id);
CREATE INDEX IF NOT EXISTS idx_store_products_is_active ON store_products(is_active);
