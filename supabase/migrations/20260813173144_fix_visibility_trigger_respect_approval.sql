/*
  # Fix Visibility Trigger to Respect Approval Status

  ## Problem
  The `enforce_product_visibility_from_stock()` trigger overrides `visibility_status`
  based solely on stock, ignoring `approval_status`. This means draft and rejected
  products with stock > 0 get forced to `visible`, causing them to appear on the
  storefront despite not being approved.

  ## Fix
  Update the trigger function to also check `approval_status`:
  - If approval_status is NOT 'approved', always set visibility_status = 'hidden'
  - If stock_status = 'backorder', set visible
  - If stock > 0, set visible
  - Otherwise, set hidden

  Then run the data fix again to clean up existing inconsistent rows.

  ## Scope
  1 function updated, 1 data update on products table.
*/

CREATE OR REPLACE FUNCTION public.enforce_product_visibility_from_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  qty integer;
BEGIN
  -- Non-approved products must always be hidden
  IF NEW.approval_status IS DISTINCT FROM 'approved' THEN
    NEW.visibility_status := 'hidden';
    RETURN NEW;
  END IF;

  qty := GREATEST(
    COALESCE(NEW.stock, 0),
    COALESCE(NEW.stock_quantity, 0),
    COALESCE(NEW.stock_qty, 0)
  );

  IF COALESCE(NEW.stock_status, '') = 'backorder' THEN
    NEW.visibility_status := 'visible';
  ELSIF qty > 0 THEN
    NEW.visibility_status := 'visible';
  ELSE
    NEW.visibility_status := 'hidden';
  END IF;

  RETURN NEW;
END;
$function$;

-- Now fix existing inconsistent rows
UPDATE products
SET visibility_status = 'hidden',
    updated_at = now()
WHERE is_deleted = false
  AND approval_status IN ('draft', 'rejected')
  AND visibility_status = 'visible';
