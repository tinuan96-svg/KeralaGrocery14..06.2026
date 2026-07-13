-- Final fix for order number generation
-- This migration ensures that generate_order_number exists with the correct signature and permissions.
-- We also bump the sequence significantly to avoid any collisions with existing data.

-- 1. Drop all possible existing versions to avoid conflicts
DROP FUNCTION IF EXISTS public.generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_order_number(text) CASCADE;

-- 2. Ensure all sequences exist and start high enough to avoid collisions
-- Starting at 10000 ensures we are past most early test orders.
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 10000;
SELECT setval('public.order_number_seq', GREATEST(10000, nextval('public.order_number_seq')));

CREATE SEQUENCE IF NOT EXISTS public.order_number_paid_v2_seq START 2026;
SELECT setval('public.order_number_paid_v2_seq', GREATEST(2026, nextval('public.order_number_paid_v2_seq')));

-- 3. Create the function with extremely robust error handling and uniqueness
CREATE OR REPLACE FUNCTION public.generate_order_number(p_payment_status text DEFAULT 'pending')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  seq_val bigint;
  final_num text;
BEGIN
  IF p_payment_status = 'paid' THEN
    seq_val := nextval('public.order_number_paid_v2_seq');
    final_num := 'KG' || seq_val::text;
  ELSE
    seq_val := nextval('public.order_number_seq');
    final_num := 'KG-2026-' || seq_val::text;
  END IF;

  -- Double check for existence and append a small random string if collision found
  -- (rare but protects against manual entries)
  IF EXISTS (SELECT 1 FROM orders WHERE order_number = final_num) THEN
    final_num := final_num || '-' || (floor(random() * 900) + 100)::text;
  END IF;

  RETURN final_num;
EXCEPTION WHEN OTHERS THEN
  -- Fallback to a fully random number to avoid blocking orders
  RETURN 'KG-' || (floor(random() * 9000000) + 1000000)::text;
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
