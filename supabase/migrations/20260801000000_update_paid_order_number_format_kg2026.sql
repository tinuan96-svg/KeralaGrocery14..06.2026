-- Migration to update order number format for paid orders
-- Requirement: Paid orders should start from KG2026 and continue sequentially (KG2027, KG2028, etc.)

-- 1. Create a new sequence for the new paid order format starting at 2026
CREATE SEQUENCE IF NOT EXISTS order_number_paid_v2_seq START 2026;

-- 2. Drop existing functions to ensure clean signature matching and permissions
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.generate_order_number(text);

-- 3. Create the unified generate_order_number function
CREATE OR REPLACE FUNCTION public.generate_order_number(p_payment_status text DEFAULT 'pending')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_payment_status = 'paid' THEN
    -- Paid sequence: KG2026, KG2027, KG2028...
    RETURN 'KG' || nextval('public.order_number_paid_v2_seq')::text;
  ELSE
    -- Pending orders: Maintain the existing KG-2026-XXXX format
    -- Uses the original order_number_seq for continuity in pending numbers.
    RETURN 'KG-2026-' || nextval('public.order_number_seq')::text;
  END IF;
END;
$$;

-- 4. Grant necessary permissions
-- Even with SECURITY DEFINER, the RPC call needs EXECUTE permission.
GRANT EXECUTE ON FUNCTION public.generate_order_number(text) TO authenticated, anon, service_role;

-- 5. Ensure sequences are accessible to the function owner (usually postgres)
GRANT USAGE, SELECT ON SEQUENCE public.order_number_paid_v2_seq TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated, anon, service_role;

-- 6. Update the trigger 'finalize_order_number' to use the new format logic
CREATE OR REPLACE FUNCTION public.finalize_order_number()
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

    -- Assign the new success sequence number (KG2026 format)
    NEW.order_number := public.generate_order_number('paid');

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
