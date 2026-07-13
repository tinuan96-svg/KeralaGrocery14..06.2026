-- Migration to update order number format for paid orders
-- Requirement: Paid orders should start from KG2026 and continue sequentially (KG2027, KG2028, etc.)

-- 1. Create a new sequence for the new paid order format starting at 2026
-- This ensures we start exactly at the requested number.
CREATE SEQUENCE IF NOT EXISTS order_number_paid_v2_seq START 2026;

-- 2. Update the generate_order_number function
-- This function handles both pending and paid order number generation.
CREATE OR REPLACE FUNCTION generate_order_number(p_payment_status text DEFAULT 'pending')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_payment_status = 'paid' THEN
    -- Paid sequence: KG2026, KG2027, KG2028...
    RETURN 'KG' || nextval('order_number_paid_v2_seq')::text;
  ELSE
    -- Pending orders: Maintain the existing KG-2026-XXXX format
    -- This keeps them distinct from paid orders and maintains consistency with recent orders.
    RETURN 'KG-2026-' || nextval('order_number_seq')::text;
  END IF;
END;
$$;

-- 3. Update the trigger comment to match the new format
CREATE OR REPLACE FUNCTION finalize_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- If transitioning to paid and hasn't been assigned a success sequence number yet.
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')
     AND (NEW.order_number = NEW.original_order_number OR NEW.original_order_number IS NULL) THEN

    -- If original_order_number was never set, set it now
    IF NEW.original_order_number IS NULL THEN
      NEW.original_order_number := NEW.order_number;
    END IF;

    -- Assign the new success sequence number (KG2026, KG2027... format)
    NEW.order_number := generate_order_number('paid');

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
