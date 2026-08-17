/*
  # Add original_price column to products table

  1. Changes
    - Add `original_price` column to products table
    - This stores the pre-discount price to avoid client-side calculations
    - Prevents potential hydration mismatches from floating-point calculations
  
  2. Data Migration
    - For products with discounts: calculate original_price from current price and discount_percentage
    - For products without discounts: original_price equals price
  
  3. Notes
    - Helps maintain SSR/hydration safety by avoiding runtime calculations
    - Admin should set this when creating/updating products
*/

-- Add original_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'original_price'
  ) THEN
    ALTER TABLE products ADD COLUMN original_price numeric DEFAULT 0;
  END IF;
END $$;

-- Update existing products to calculate original_price
UPDATE products
SET original_price = CASE
  WHEN discount_percentage > 0 THEN 
    price / (1 - (discount_percentage::numeric / 100))
  ELSE 
    price
END
WHERE original_price = 0 OR original_price IS NULL;