/*
  # Add Enhanced Image URL and Product Metadata

  1. Changes to Products Table
    - Add `enhanced_image_url` column for AI-enhanced product images
    - Add `discount_percentage` column for product discounts
    - Add `is_bestseller` column to mark bestseller products
    - Add `rating` column for product ratings (static for now)
    - Add `review_count` column for number of reviews
    - Add `is_hot_product` column to mark hot product of the week
    - Add `hot_product_expires_at` column for hot product expiry

  2. Performance
    - These columns allow for rich product metadata without joins
    - Enhanced images processed asynchronously won't block UI
*/

-- Add new columns to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'enhanced_image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN enhanced_image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'discount_percentage'
  ) THEN
    ALTER TABLE products ADD COLUMN discount_percentage integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_bestseller'
  ) THEN
    ALTER TABLE products ADD COLUMN is_bestseller boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'rating'
  ) THEN
    ALTER TABLE products ADD COLUMN rating decimal(2,1) DEFAULT 4.5;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'review_count'
  ) THEN
    ALTER TABLE products ADD COLUMN review_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'is_hot_product'
  ) THEN
    ALTER TABLE products ADD COLUMN is_hot_product boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'hot_product_expires_at'
  ) THEN
    ALTER TABLE products ADD COLUMN hot_product_expires_at timestamptz;
  END IF;
END $$;

-- Update some existing products with sample data
UPDATE products
SET 
  is_bestseller = true,
  rating = 4.7,
  review_count = 145
WHERE id IN (
  SELECT id FROM products 
  WHERE name ILIKE '%basmati%'
  LIMIT 2
);

UPDATE products
SET 
  discount_percentage = 15,
  rating = 4.5,
  review_count = 89
WHERE id IN (
  SELECT id FROM products 
  WHERE name ILIKE '%rice%' AND is_bestseller = false
  LIMIT 3
);

UPDATE products
SET 
  is_hot_product = true,
  hot_product_expires_at = NOW() + INTERVAL '7 days',
  discount_percentage = 25,
  rating = 4.9,
  review_count = 234
WHERE id = (
  SELECT id FROM products 
  WHERE is_active = true 
  ORDER BY created_at DESC 
  LIMIT 1
);
