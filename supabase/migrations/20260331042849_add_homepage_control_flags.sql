/*
  # Add Homepage Control Flags and Banners Table

  1. Changes to Products Table
    - Add `is_featured` (boolean) - Mark products as featured on homepage
    - Add `is_deal` (boolean) - Mark products as special deals
    - Add `is_new_arrival` (boolean) - Mark products as new arrivals
    - Add `sold_count` (integer) - Track number of items sold for bestseller ranking
    - Add `brand_id` (uuid) - Link products to brands

  2. Changes to Categories Table
    - Add `show_on_homepage` (boolean) - Control which categories appear on homepage
    - Add `icon` (text) - Icon name for category display
    - Add `sort_order` (integer) - Control display order

  3. Changes to Brands Table
    - Add `show_on_homepage` (boolean) - Control which brands appear on homepage
    - Add `sort_order` (integer) - Control display order

  4. New Banners Table
    - `id` (uuid, primary key) - Unique identifier
    - `title` (text) - Banner title
    - `subtitle` (text) - Banner subtitle/description
    - `image_url` (text) - Banner image URL
    - `link_url` (text) - Click destination URL
    - `is_active` (boolean) - Control banner visibility
    - `sort_order` (integer) - Display order
    - `created_at` (timestamptz) - Creation timestamp

  5. Security
    - Enable RLS on banners table
    - Add public read policy for active banners
*/

-- Add new columns to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE products ADD COLUMN is_featured boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_deal'
  ) THEN
    ALTER TABLE products ADD COLUMN is_deal boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_new_arrival'
  ) THEN
    ALTER TABLE products ADD COLUMN is_new_arrival boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'sold_count'
  ) THEN
    ALTER TABLE products ADD COLUMN sold_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'brand_id'
  ) THEN
    ALTER TABLE products ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add new columns to categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'show_on_homepage'
  ) THEN
    ALTER TABLE categories ADD COLUMN show_on_homepage boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'icon'
  ) THEN
    ALTER TABLE categories ADD COLUMN icon text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE categories ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Add new columns to brands table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'show_on_homepage'
  ) THEN
    ALTER TABLE brands ADD COLUMN show_on_homepage boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brands' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE brands ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text,
  link_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public read access for active banners
CREATE POLICY "Allow public read access to active banners"
  ON banners FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_is_deal ON products(is_deal) WHERE is_deal = true;
CREATE INDEX IF NOT EXISTS idx_products_is_new_arrival ON products(is_new_arrival) WHERE is_new_arrival = true;
CREATE INDEX IF NOT EXISTS idx_products_sold_count ON products(sold_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_categories_show_on_homepage ON categories(show_on_homepage) WHERE show_on_homepage = true;
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_brands_show_on_homepage ON brands(show_on_homepage) WHERE show_on_homepage = true;
CREATE INDEX IF NOT EXISTS idx_brands_sort_order ON brands(sort_order);
CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON banners(is_active, sort_order) WHERE is_active = true;

-- Set some initial homepage flags on existing data
UPDATE categories SET show_on_homepage = true 
WHERE id IN (SELECT id FROM categories LIMIT 6);

UPDATE brands SET show_on_homepage = true 
WHERE id IN (SELECT id FROM brands LIMIT 8);

UPDATE products SET is_featured = true 
WHERE id IN (SELECT id FROM products WHERE is_bestseller = true LIMIT 8);

UPDATE products SET is_deal = true 
WHERE id IN (SELECT id FROM products WHERE discount_percentage > 10 LIMIT 6);

UPDATE products SET is_new_arrival = true 
WHERE id IN (SELECT id FROM products WHERE created_at > NOW() - INTERVAL '30 days' LIMIT 8);

UPDATE products SET sold_count = floor(random() * 500 + 50)::integer 
WHERE is_bestseller = true;
