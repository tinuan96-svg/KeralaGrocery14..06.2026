-- Final fix for order number generation
-- This migration ensures that generate_order_number exists with the correct signature and permissions.

-- 1. Drop all possible existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_order_number(text) CASCADE;

-- 2. Ensure all sequences exist in the public schema
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 6000;
CREATE SEQUENCE IF NOT EXISTS public.order_number_paid_v2_seq START 2026;

-- 3. Create the function with extremely robust error handling
CREATE OR REPLACE FUNCTION public.generate_order_number(p_payment_status text DEFAULT 'pending')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  seq_val bigint;
BEGIN
  IF p_payment_status = 'paid' THEN
    seq_val := nextval('public.order_number_paid_v2_seq');
    RETURN 'KG' || seq_val::text;
  ELSE
    seq_val := nextval('public.order_number_seq');
    RETURN 'KG-2026-' || seq_val::text;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to a random number to avoid blocking orders if sequences are locked
  RETURN 'KG-' || (floor(random() * 900000) + 100000)::text;
END;
$$;

-- 4. Re-grant permissions explicitly to all roles
GRANT EXECUTE ON FUNCTION public.generate_order_number(text) TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_paid_v2_seq TO authenticated, anon, service_role;

-- 5. Update the trigger function to be fully qualified and robust
CREATE OR REPLACE FUNCTION public.finalize_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- If transitioning to paid and hasn't been assigned a success sequence number yet.
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')
     AND (NEW.order_number = NEW.original_order_number OR NEW.original_order_number IS NULL) THEN

    IF NEW.original_order_number IS NULL THEN
      NEW.original_order_number := NEW.order_number;
    END IF;

    -- Assign the new success sequence number (KG2026 format)
    BEGIN
      NEW.order_number := public.generate_order_number('paid');
    EXCEPTION WHEN OTHERS THEN
      -- In-trigger fallback
      NEW.order_number := 'KG' || (floor(random() * 9000) + 2000)::text;
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
