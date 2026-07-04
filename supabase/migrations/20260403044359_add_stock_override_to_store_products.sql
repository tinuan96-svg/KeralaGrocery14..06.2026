/*
  # Add stock override to store_products

  1. Changes
    - Add `stock_override` column to `store_products` table
    - This allows CentralHub to override stock quantities per store
  
  2. Logic
    - When `stock_override` IS NOT NULL, use that value
    - When `stock_override` IS NULL, fall back to base `products.stock`
  
  3. Notes
    - No data migration needed as column is nullable
    - Existing products will use base stock until overridden
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_products' AND column_name = 'stock_override'
  ) THEN
    ALTER TABLE store_products ADD COLUMN stock_override integer;
  END IF;
END $$;
