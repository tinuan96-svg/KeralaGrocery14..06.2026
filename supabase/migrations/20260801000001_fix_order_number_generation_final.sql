-- Final fix for order number generation
-- This migration ensures that generate_order_number exists with the correct signature and permissions.

-- 1. Drop all possible existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.generate_order_number(text);
DROP FUNCTION IF EXISTS public.generate_order_number(p_payment_status text);

-- 2. Ensure all sequences exist in the public schema
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 5320;
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq_2026 START 1;
CREATE SEQUENCE IF NOT EXISTS public.order_number_paid_v2_seq START 2026;

-- 3. Create the function with explicit schema and parameter names
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
    -- Use the new paid sequence starting at 2026
    seq_val := nextval('public.order_number_paid_v2_seq');
    RETURN 'KG' || seq_val::text;
  ELSE
    -- Use the existing pending sequence
    seq_val := nextval('public.order_number_seq');
    RETURN 'KG-2026-' || seq_val::text;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to a timestamp-based number if sequences fail, to avoid blocking orders
  RETURN 'KG-ERR-' || to_char(now(), 'YYYYMMDDHH24MISS');
END;
$$;

-- 4. Re-grant permissions explicitly
REVOKE ALL ON FUNCTION public.generate_order_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_order_number(text) TO authenticated, anon, service_role;

-- 5. Sequences must be accessible to the roles if the function is called via RPC (even with security definer sometimes search_path or ownership issues arise)
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq_2026 TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_paid_v2_seq TO authenticated, anon, service_role;

-- 6. Also update the trigger function to be fully qualified
CREATE OR REPLACE FUNCTION public.finalize_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid')
     AND (NEW.order_number = NEW.original_order_number OR NEW.original_order_number IS NULL) THEN

    IF NEW.original_order_number IS NULL THEN
      NEW.original_order_number := NEW.order_number;
    END IF;

    NEW.order_number := public.generate_order_number('paid');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
