/*
# Add recalculate_prices RPC function

## Purpose
Replaces the deleted centralhub-sync edge function's recalculate_prices action.
Recalculates selling_price from cost_price and markup_percentage for all
products that have a cost_price > 0.

## Logic
- For each product with cost_price > 0 and markup_percentage:
  new_selling_price = ceil(cost_price * (1 + markup/100) * 10) / 10
- Records changes in price_history
- Returns summary: processed, updated, errors, changes
*/

CREATE OR REPLACE FUNCTION public.recalculate_prices()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed int := 0;
  v_updated int := 0;
  v_errors text[] := ARRAY[]::text[];
  v_changes jsonb := '[]'::jsonb;
  r RECORD;
  v_new_selling numeric;
BEGIN
  FOR r IN
    SELECT id, name, cost_price, selling_price, markup_percentage
    FROM products
    WHERE is_deleted = false
      AND cost_price IS NOT NULL
      AND cost_price > 0
      AND markup_percentage IS NOT NULL
      AND markup_percentage > 0
  LOOP
    v_processed := v_processed + 1;

    v_new_selling := CEIL(r.cost_price * (1 + r.markup_percentage / 100.0) * 10) / 10;

    IF r.selling_price IS NULL OR r.selling_price != v_new_selling THEN
      INSERT INTO price_history (product_id, old_cost_price, new_cost_price, old_selling_price, new_selling_price, markup_percentage, changed_by)
      VALUES (r.id, r.cost_price, r.cost_price, r.selling_price, v_new_selling, r.markup_percentage, 'recalculate');

      UPDATE products
      SET selling_price = v_new_selling, price = v_new_selling, updated_at = now()
      WHERE id = r.id;

      v_updated := v_updated + 1;
      v_changes := v_changes || jsonb_build_object(
        'product_id', r.id,
        'product_name', r.name,
        'old_selling_price', r.selling_price,
        'new_selling_price', v_new_selling,
        'cost_price', r.cost_price,
        'markup_pct', r.markup_percentage
      );
    END IF;
  END LOOP;

  RETURN json_build_object(
    'processed', v_processed,
    'updated', v_updated,
    'errors', v_errors,
    'changes', v_changes
  );
EXCEPTION WHEN OTHERS THEN
  v_errors := array_append(v_errors, SQLERRM);
  RETURN json_build_object(
    'processed', v_processed,
    'updated', v_updated,
    'errors', v_errors,
    'changes', v_changes
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalculate_prices() TO authenticated;
