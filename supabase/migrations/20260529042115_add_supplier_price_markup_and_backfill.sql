/*
  # Add supplier_price and markup_percentage to products; backfill all synced products

  1. New Columns
     - `supplier_price` (numeric) — original price from CentralHub, hidden from customers
     - `markup_percentage` (numeric, default 5) — markup applied when calculating selling price

  2. Backfill
     - All products where source_product_id IS NOT NULL:
       * supplier_price = price (the raw CentralHub price we stored before this migration)
       * price = ROUND(supplier_price * 1.05, 2)  ← 5% markup applied
       * markup_percentage = 5
     - Products where supplier_price is already set are skipped via the IS NULL guard

  3. Notes
     - `price` always reflects the marked-up selling price shown to customers
     - `supplier_price` is the raw CentralHub figure, never exposed on the storefront
     - Future syncs must set supplier_price = source, then price = ROUND(supplier_price * (1 + markup/100), 2)
*/

-- Add columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'supplier_price'
  ) THEN
    ALTER TABLE public.products ADD COLUMN supplier_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'markup_percentage'
  ) THEN
    ALTER TABLE public.products ADD COLUMN markup_percentage numeric DEFAULT 5;
  END IF;
END $$;

-- Backfill: for every synced product that doesn't yet have supplier_price set,
-- treat the current `price` as the raw supplier price and apply 5% markup.
UPDATE public.products
SET
  supplier_price = price,
  price          = ROUND(price * 1.05, 2),
  markup_percentage = 5,
  updated_at     = now()
WHERE
  source_product_id IS NOT NULL
  AND supplier_price IS NULL
  AND is_deleted = false;
