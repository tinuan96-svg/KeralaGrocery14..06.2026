-- Add backorder_enabled column to products table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'backorder_enabled'
  ) THEN
    ALTER TABLE products ADD COLUMN backorder_enabled boolean DEFAULT false;
  END IF;
END $$;
