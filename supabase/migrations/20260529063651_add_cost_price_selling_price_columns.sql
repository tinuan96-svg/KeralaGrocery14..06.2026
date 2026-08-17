/*
  # Pricing System: Add cost_price and selling_price columns

  ## Summary
  Formalises the pricing model with explicit cost_price and selling_price columns
  alongside the existing supplier_price / price columns (kept for backwards compatibility).

  ## Changes

  ### products table — new columns
  - `cost_price` NUMERIC(10,2) — the raw price received from CentralHub (never shown to customers)
  - `selling_price` NUMERIC(10,2) — cost_price × (1 + markup_percentage / 100), always 2dp (shown to customers)

  ### Backfill
  - cost_price ← supplier_price (already the CentralHub cost figure)
  - selling_price ← price (already the marked-up selling price)
  - Where cost_price is null but selling_price is set, back-calculate cost_price from selling_price ÷ 1.05

  ### price_history table (new)
  - Records every price change for audit / sync reporting
  - Columns: id, product_id, old_cost_price, new_cost_price, old_selling_price, new_selling_price, changed_at, changed_by

  ## Notes
  1. `price` column is kept and always equals `selling_price` — storefront code can use either.
  2. `supplier_price` is kept and always equals `cost_price` — sync code can use either.
  3. All customer-facing pages must display only `selling_price` (= `price`).
  4. cost_price is internal — admin-only visibility.
*/

-- 1. Add cost_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'cost_price'
  ) THEN
    ALTER TABLE products ADD COLUMN cost_price numeric(10,2);
  END IF;
END $$;

-- 2. Add selling_price column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'selling_price'
  ) THEN
    ALTER TABLE products ADD COLUMN selling_price numeric(10,2);
  END IF;
END $$;

-- 3. Backfill cost_price from supplier_price
UPDATE products
SET cost_price = supplier_price
WHERE cost_price IS NULL AND supplier_price IS NOT NULL;

-- 4. Backfill cost_price from back-calculating price ÷ 1.05 where still null
UPDATE products
SET cost_price = ROUND(price / 1.05, 2)
WHERE cost_price IS NULL AND price IS NOT NULL AND price > 0;

-- 5. Backfill selling_price from price (already the marked-up selling price)
UPDATE products
SET selling_price = price
WHERE selling_price IS NULL AND price IS NOT NULL;

-- 6. Recalculate selling_price correctly for any rows where markup_percentage is known
UPDATE products
SET selling_price = ROUND(cost_price * (1 + COALESCE(markup_percentage, 5) / 100.0), 2)
WHERE cost_price IS NOT NULL AND cost_price > 0;

-- 7. Keep price in sync with selling_price
UPDATE products
SET price = selling_price
WHERE selling_price IS NOT NULL AND price IS DISTINCT FROM selling_price;

-- 8. Index for admin pricing queries
CREATE INDEX IF NOT EXISTS idx_products_cost_price ON products (cost_price);
CREATE INDEX IF NOT EXISTS idx_products_selling_price ON products (selling_price);

-- 9. Create price_history table for audit trail
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_cost_price numeric(10,2),
  new_cost_price numeric(10,2),
  old_selling_price numeric(10,2),
  new_selling_price numeric(10,2),
  markup_percentage numeric(5,2) DEFAULT 5,
  changed_at timestamptz DEFAULT now(),
  changed_by text DEFAULT 'sync'
);

ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read price history"
  ON price_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (auth.users.raw_app_meta_data->>'is_admin')::boolean = true
    )
  );

CREATE POLICY "Service role can insert price history"
  ON price_history FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history (product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_changed_at ON price_history (changed_at DESC);
